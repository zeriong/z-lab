// physics.js — Box2D-Lite 방식 강체 물리 (원·박스), 충격량 순차 솔버 + warm starting + 수면 (plan §4)
(function () {
  'use strict';
  const AB = (window.AB = window.AB || {});

  const AXIS_A_X = 0;
  const AXIS_A_Y = 1;
  const AXIS_B_X = 2;
  const AXIS_B_Y = 3;

  // ------------------------------------------------------------------
  // Body
  // ------------------------------------------------------------------
  // opts: shape('circle'|'box'), r | hw,hh, x, y, angle, density, friction, restitution,
  //       isStatic, linDamp, angDamp, group
  function createBody(opts) {
    const isStatic = !!opts.isStatic;
    const isCircle = opts.shape === 'circle';
    const b = {
      id: 0,
      shape: isCircle ? 'circle' : 'box',
      r: isCircle ? opts.r : 0,
      hw: isCircle ? 0 : opts.hw,
      hh: isCircle ? 0 : opts.hh,
      pos: { x: opts.x, y: opts.y },
      angle: opts.angle || 0,
      vel: { x: 0, y: 0 },
      av: 0,
      mass: 0,
      invMass: 0,
      inertia: 0,
      invI: 0,
      friction: opts.friction || 0,
      restitution: opts.restitution || 0,
      isStatic: isStatic,
      awake: !isStatic,
      sleepTime: 0,
      linDamp: opts.linDamp || 0,
      angDamp: opts.angDamp || 0,
      group: opts.group === undefined ? null : opts.group,
      contactCount: 0,
      removed: false,
    };
    if (!isStatic) {
      const density = opts.density || 0;
      if (isCircle) {
        b.mass = density * Math.PI * b.r * b.r;
        b.inertia = (b.mass * b.r * b.r) / 2;
      } else {
        const w = 2 * b.hw;
        const h = 2 * b.hh;
        b.mass = density * 4 * b.hw * b.hh;
        b.inertia = (b.mass * (w * w + h * h)) / 12;
      }
      b.invMass = b.mass > 0 ? 1 / b.mass : 0;
      b.invI = b.inertia > 0 ? 1 / b.inertia : 0;
    }
    return b;
  }

  function computeAABB(b, pad) {
    const p = pad || 0;
    let ex;
    let ey;
    if (b.shape === 'circle') {
      ex = b.r;
      ey = b.r;
    } else {
      const c = Math.abs(Math.cos(b.angle));
      const s = Math.abs(Math.sin(b.angle));
      ex = c * b.hw + s * b.hh;
      ey = s * b.hw + c * b.hh;
    }
    return {
      minX: b.pos.x - ex - p,
      minY: b.pos.y - ey - p,
      maxX: b.pos.x + ex + p,
      maxY: b.pos.y + ey + p,
    };
  }

  function aabbOverlap(a, b) {
    return a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY;
  }

  function isAwakeDynamic(b) {
    return !b.isStatic && b.awake && !b.removed;
  }

  function makeContact(px, py, nx, ny, sep) {
    return { pos: { x: px, y: py }, normal: { x: nx, y: ny }, sep: sep, Pn: 0, Pt: 0 };
  }

  // ------------------------------------------------------------------
  // 좁은 단계 판정 (§4.4). normal은 항상 A→B.
  // ------------------------------------------------------------------
  function collideCircles(A, B, margin) {
    const dx = B.pos.x - A.pos.x;
    const dy = B.pos.y - A.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const sep = dist - A.r - B.r;
    if (sep > margin) return [];
    let nx = 0;
    let ny = 1;
    if (dist > AB.CONFIG.EPSILON) {
      nx = dx / dist;
      ny = dy / dist;
    }
    return [makeContact(A.pos.x + nx * A.r, A.pos.y + ny * A.r, nx, ny, sep)];
  }

  // 원 circle과 박스 box. 반환: { nx, ny (박스→원), px, py (접촉점), sep } 또는 null
  function circleVsBox(circle, box, margin) {
    const c = Math.cos(box.angle);
    const s = Math.sin(box.angle);
    const dx = circle.pos.x - box.pos.x;
    const dy = circle.pos.y - box.pos.y;
    // local = Xᵀ·(pC − pX)
    const lx = c * dx + s * dy;
    const ly = -s * dx + c * dy;
    const hw = box.hw;
    const hh = box.hh;
    const r = circle.r;
    let nlx;
    let nly;
    let qx;
    let qy;
    let sep;
    if (Math.abs(lx) <= hw && Math.abs(ly) <= hh) {
      // 원 중심이 박스 내부
      const ex = hw - Math.abs(lx);
      const ey = hh - Math.abs(ly);
      if (ex < ey) {
        const sx = lx >= 0 ? 1 : -1;
        nlx = sx;
        nly = 0;
        qx = sx * hw;
        qy = ly;
        sep = -(ex + r);
      } else {
        const sy = ly >= 0 ? 1 : -1;
        nlx = 0;
        nly = sy;
        qx = lx;
        qy = sy * hh;
        sep = -(ey + r);
      }
    } else {
      qx = AB.clamp(lx, -hw, hw);
      qy = AB.clamp(ly, -hh, hh);
      const ddx = lx - qx;
      const ddy = ly - qy;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);
      sep = dist - r;
      if (sep > margin) return null;
      if (dist > AB.CONFIG.EPSILON) {
        nlx = ddx / dist;
        nly = ddy / dist;
      } else {
        nlx = 0;
        nly = 1;
      }
    }
    return {
      nx: c * nlx - s * nly,
      ny: s * nlx + c * nly,
      px: box.pos.x + c * qx - s * qy,
      py: box.pos.y + s * qx + c * qy,
      sep: sep,
    };
  }

  // 박스의 incident edge (§4.4-5). 월드 좌표 두 점을 반환
  function incidentEdge(hx, hy, pos, c, s, fnx, fny) {
    // n = −(Rᵀ·frontN)
    const nx = -(c * fnx + s * fny);
    const ny = -(-s * fnx + c * fny);
    let v0x;
    let v0y;
    let v1x;
    let v1y;
    if (Math.abs(nx) > Math.abs(ny)) {
      if (nx > 0) {
        v0x = hx; v0y = -hy;
        v1x = hx; v1y = hy;
      } else {
        v0x = -hx; v0y = hy;
        v1x = -hx; v1y = -hy;
      }
    } else if (ny > 0) {
      v0x = hx; v0y = hy;
      v1x = -hx; v1y = hy;
    } else {
      v0x = -hx; v0y = -hy;
      v1x = hx; v1y = -hy;
    }
    return [
      { x: pos.x + c * v0x - s * v0y, y: pos.y + s * v0x + c * v0y },
      { x: pos.x + c * v1x - s * v1y, y: pos.y + s * v1x + c * v1y },
    ];
  }

  // 선분 클리핑 (§4.4-6)
  function clipSegment(pts, nx, ny, offset) {
    const out = [];
    const p0 = pts[0];
    const p1 = pts[1];
    const d0 = nx * p0.x + ny * p0.y - offset;
    const d1 = nx * p1.x + ny * p1.y - offset;
    if (d0 <= 0) out.push(p0);
    if (d1 <= 0) out.push(p1);
    if (d0 * d1 < 0) {
      const t = d0 / (d0 - d1);
      out.push({ x: p0.x + t * (p1.x - p0.x), y: p0.y + t * (p1.y - p0.y) });
    }
    return out;
  }

  function collideBoxes(A, B, margin) {
    const C = AB.CONFIG;
    const hAx = A.hw;
    const hAy = A.hh;
    const hBx = B.hw;
    const hBy = B.hh;
    const cA = Math.cos(A.angle);
    const sA = Math.sin(A.angle);
    const cB = Math.cos(B.angle);
    const sB = Math.sin(B.angle);
    const dpx = B.pos.x - A.pos.x;
    const dpy = B.pos.y - A.pos.y;
    // dA = RAᵀ·dp, dB = RBᵀ·dp
    const dAx = cA * dpx + sA * dpy;
    const dAy = -sA * dpx + cA * dpy;
    const dBx = cB * dpx + sB * dpy;
    const dBy = -sB * dpx + cB * dpy;
    // C = RAᵀ·RB = R(θB − θA). absC = [[|cos|, |sin|], [|sin|, |cos|]] (대칭이므로 absCᵀ = absC)
    const acc = Math.abs(cA * cB + sA * sB);
    const ass = Math.abs(cA * sB - sA * cB);

    // faceA = |dA| − hA − absC·hB
    const faceAx = Math.abs(dAx) - hAx - (acc * hBx + ass * hBy);
    const faceAy = Math.abs(dAy) - hAy - (ass * hBx + acc * hBy);
    if (faceAx > margin || faceAy > margin) return [];
    // faceB = |dB| − absCᵀ·hA − hB
    const faceBx = Math.abs(dBx) - (acc * hAx + ass * hAy) - hBx;
    const faceBy = Math.abs(dBy) - (ass * hAx + acc * hAy) - hBy;
    if (faceBx > margin || faceBy > margin) return [];

    // 최적 축 선택. RA.col1 = (cA, sA), RA.col2 = (−sA, cA)
    const relTol = C.BOX_REL_TOL;
    const absTol = C.BOX_ABS_TOL;
    let axis = AXIS_A_X;
    let sep = faceAx;
    let nx = dAx > 0 ? cA : -cA;
    let ny = dAx > 0 ? sA : -sA;
    if (faceAy > relTol * sep + absTol * hAy) {
      axis = AXIS_A_Y;
      sep = faceAy;
      nx = dAy > 0 ? -sA : sA;
      ny = dAy > 0 ? cA : -cA;
    }
    if (faceBx > relTol * sep + absTol * hBx) {
      axis = AXIS_B_X;
      sep = faceBx;
      nx = dBx > 0 ? cB : -cB;
      ny = dBx > 0 ? sB : -sB;
    }
    if (faceBy > relTol * sep + absTol * hBy) {
      axis = AXIS_B_Y;
      sep = faceBy;
      nx = dBy > 0 ? -sB : sB;
      ny = dBy > 0 ? cB : -cB;
    }

    // 클리핑 평면 설정
    let fnx;
    let fny;
    let front;
    let snx;
    let sny;
    let negSide;
    let posSide;
    let inc;
    let side;
    if (axis === AXIS_A_X) {
      fnx = nx; fny = ny;
      front = A.pos.x * fnx + A.pos.y * fny + hAx;
      snx = -sA; sny = cA; // RA.col2
      side = A.pos.x * snx + A.pos.y * sny;
      negSide = -side + hAy;
      posSide = side + hAy;
      inc = incidentEdge(hBx, hBy, B.pos, cB, sB, fnx, fny);
    } else if (axis === AXIS_A_Y) {
      fnx = nx; fny = ny;
      front = A.pos.x * fnx + A.pos.y * fny + hAy;
      snx = cA; sny = sA; // RA.col1
      side = A.pos.x * snx + A.pos.y * sny;
      negSide = -side + hAx;
      posSide = side + hAx;
      inc = incidentEdge(hBx, hBy, B.pos, cB, sB, fnx, fny);
    } else if (axis === AXIS_B_X) {
      fnx = -nx; fny = -ny;
      front = B.pos.x * fnx + B.pos.y * fny + hBx;
      snx = -sB; sny = cB; // RB.col2
      side = B.pos.x * snx + B.pos.y * sny;
      negSide = -side + hBy;
      posSide = side + hBy;
      inc = incidentEdge(hAx, hAy, A.pos, cA, sA, fnx, fny);
    } else {
      fnx = -nx; fny = -ny;
      front = B.pos.x * fnx + B.pos.y * fny + hBy;
      snx = cB; sny = sB; // RB.col1
      side = B.pos.x * snx + B.pos.y * sny;
      negSide = -side + hBx;
      posSide = side + hBx;
      inc = incidentEdge(hAx, hAy, A.pos, cA, sA, fnx, fny);
    }

    const clip1 = clipSegment(inc, -snx, -sny, negSide);
    if (clip1.length < 2) return [];
    const clip2 = clipSegment(clip1, snx, sny, posSide);
    if (clip2.length < 2) return [];

    const out = [];
    for (let i = 0; i < clip2.length; i++) {
      const v = clip2[i];
      const s = fnx * v.x + fny * v.y - front;
      if (s <= margin) {
        out.push(makeContact(v.x - s * fnx, v.y - s * fny, nx, ny, s));
      }
    }
    return out;
  }

  // 쌍 순서는 호출자가 id 작은 쪽을 A로 고정해서 넘긴다
  function collide(A, B, margin) {
    if (A.shape === 'circle' && B.shape === 'circle') {
      return collideCircles(A, B, margin);
    }
    if (A.shape === 'circle' && B.shape === 'box') {
      const h = circleVsBox(A, B, margin);
      if (!h) return [];
      // A=원, B=박스 → normal = −(박스→원)
      return [makeContact(h.px, h.py, -h.nx, -h.ny, h.sep)];
    }
    if (A.shape === 'box' && B.shape === 'circle') {
      const h = circleVsBox(B, A, margin);
      if (!h) return [];
      // A=박스, B=원 → normal = 박스→원
      return [makeContact(h.px, h.py, h.nx, h.ny, h.sep)];
    }
    return collideBoxes(A, B, margin);
  }

  // ------------------------------------------------------------------
  // Arbiter (§4.5, §4.6)
  // ------------------------------------------------------------------
  // 상대속도 dv = (vB + ωB×rB) − (vA + ωA×rA) 를 방향 (dx, dy)로 사영
  function relVelAlong(A, B, rA, rB, dx, dy) {
    const dvx = B.vel.x - B.av * rB.y - (A.vel.x - A.av * rA.y);
    const dvy = B.vel.y + B.av * rB.x - (A.vel.y + A.av * rA.x);
    return dvx * dx + dvy * dy;
  }

  // 충격량 P를 A에서 빼고 B에 더한다
  function applyP(A, B, rA, rB, Px, Py) {
    A.vel.x -= A.invMass * Px;
    A.vel.y -= A.invMass * Py;
    A.av -= A.invI * (rA.x * Py - rA.y * Px);
    B.vel.x += B.invMass * Px;
    B.vel.y += B.invMass * Py;
    B.av += B.invI * (rB.x * Py - rB.y * Px);
  }

  class Arbiter {
    constructor(A, B) {
      this.bodyA = A;
      this.bodyB = B;
      this.contacts = [];
      this.friction = Math.sqrt(A.friction * B.friction);
      this.restitution = Math.max(A.restitution, B.restitution);
      this.disabled = false;
    }

    // 병합: 새 접촉마다 가장 가까운(WARM_MATCH_DIST 이내) 기존 접촉의 누적 충격량을 이어받는다
    update(newContacts) {
      const maxD = AB.CONFIG.WARM_MATCH_DIST;
      const maxD2 = maxD * maxD;
      const old = this.contacts;
      const used = [];
      for (let k = 0; k < old.length; k++) used.push(false);
      for (let i = 0; i < newContacts.length; i++) {
        const nc = newContacts[i];
        let best = -1;
        let bestD2 = maxD2;
        for (let k = 0; k < old.length; k++) {
          if (used[k]) continue;
          const dx = nc.pos.x - old[k].pos.x;
          const dy = nc.pos.y - old[k].pos.y;
          const d2 = dx * dx + dy * dy;
          if (d2 <= bestD2) {
            bestD2 = d2;
            best = k;
          }
        }
        if (best >= 0) {
          used[best] = true;
          nc.Pn = old[best].Pn;
          nc.Pt = old[best].Pt;
        } else {
          nc.Pn = 0;
          nc.Pt = 0;
        }
      }
      this.contacts = newContacts;
    }

    preStep(dt, impactHandler) {
      const C = AB.CONFIG;
      const A = this.bodyA;
      const B = this.bodyB;
      const e = this.restitution;
      let maxApproach = 0;
      for (let i = 0; i < this.contacts.length; i++) {
        const c = this.contacts[i];
        const n = c.normal;
        const rA = { x: c.pos.x - A.pos.x, y: c.pos.y - A.pos.y };
        const rB = { x: c.pos.x - B.pos.x, y: c.pos.y - B.pos.y };
        const t = { x: n.y, y: -n.x };
        c.rA = rA;
        c.rB = rB;
        c.t = t;

        const rnA = rA.x * n.y - rA.y * n.x;
        const rnB = rB.x * n.y - rB.y * n.x;
        const kN = A.invMass + B.invMass + A.invI * rnA * rnA + B.invI * rnB * rnB;
        c.massN = kN > C.EPSILON ? 1 / kN : 0;

        const rtA = rA.x * t.y - rA.y * t.x;
        const rtB = rB.x * t.y - rB.y * t.x;
        const kT = A.invMass + B.invMass + A.invI * rtA * rtA + B.invI * rtB * rtB;
        c.massT = kT > C.EPSILON ? 1 / kT : 0;

        const vn = relVelAlong(A, B, rA, rB, n.x, n.y);
        const reach = c.sep <= -vn * dt;

        if (c.sep > 0) {
          // 추측 접촉: 그 틈만큼은 다가오는 것을 허용
          c.bias = -c.sep / dt;
        } else {
          c.bias = Math.min(C.MAX_CORRECTION_VEL, (C.BAUMGARTE / dt) * Math.max(0, -c.sep - C.SLOP));
        }
        if (vn < -C.RESTITUTION_THRESHOLD && reach) {
          c.bias = Math.max(c.bias, -e * vn);
        }
        if (reach && -vn > maxApproach) maxApproach = -vn;
      }

      this.disabled = false;
      if (maxApproach > 0 && typeof impactHandler === 'function') {
        const invSum = A.invMass + B.invMass;
        const mEff = invSum > C.EPSILON ? 1 / invSum : 0;
        this.disabled = !!impactHandler(A, B, maxApproach, mEff);
      }

      if (this.disabled) {
        for (let i = 0; i < this.contacts.length; i++) {
          this.contacts[i].Pn = 0;
          this.contacts[i].Pt = 0;
        }
        return;
      }

      // warm start
      for (let i = 0; i < this.contacts.length; i++) {
        const c = this.contacts[i];
        const Px = c.Pn * c.normal.x + c.Pt * c.t.x;
        const Py = c.Pn * c.normal.y + c.Pt * c.t.y;
        applyP(A, B, c.rA, c.rB, Px, Py);
      }
    }

    applyImpulse() {
      const A = this.bodyA;
      const B = this.bodyB;
      for (let i = 0; i < this.contacts.length; i++) {
        const c = this.contacts[i];
        const n = c.normal;
        const t = c.t;

        // 법선 충격량
        const vn = relVelAlong(A, B, c.rA, c.rB, n.x, n.y);
        let dPn = c.massN * (-vn + c.bias);
        const Pn0 = c.Pn;
        c.Pn = Math.max(Pn0 + dPn, 0);
        dPn = c.Pn - Pn0;
        applyP(A, B, c.rA, c.rB, dPn * n.x, dPn * n.y);

        // 마찰 충격량
        const vt = relVelAlong(A, B, c.rA, c.rB, t.x, t.y);
        let dPt = c.massT * -vt;
        const maxPt = this.friction * c.Pn;
        const Pt0 = c.Pt;
        c.Pt = AB.clamp(Pt0 + dPt, -maxPt, maxPt);
        dPt = c.Pt - Pt0;
        applyP(A, B, c.rA, c.rB, dPt * t.x, dPt * t.y);
      }
    }
  }

  // ------------------------------------------------------------------
  // World (§4.3)
  // ------------------------------------------------------------------
  class World {
    constructor() {
      this.bodies = [];
      this.arbiters = new Map();
      this.nextId = 1;
      this.impactHandler = null;
      this.lostBodies = [];
    }

    addBody(b) {
      b.id = this.nextId++;
      b.removed = false;
      this.bodies.push(b);
      return b;
    }

    // 스텝 밖에서만 호출한다
    removeBody(b) {
      if (!b) return;
      b.removed = true;
      this.bodies = this.bodies.filter((x) => x !== b);
      const deadKeys = [];
      this.arbiters.forEach((arb, key) => {
        if (arb.bodyA === b || arb.bodyB === b) deadKeys.push(key);
      });
      for (let i = 0; i < deadKeys.length; i++) this.arbiters.delete(deadKeys[i]);
    }

    wakeBody(b) {
      if (!b || b.isStatic) return;
      b.awake = true;
      b.sleepTime = 0;
    }

    // 안전망으로 제거된 바디 목록을 넘겨주고 비운다
    takeLost() {
      const out = this.lostBodies;
      this.lostBodies = [];
      return out;
    }

    isQuiet(speed, angSpeed) {
      const s2 = speed * speed;
      for (let i = 0; i < this.bodies.length; i++) {
        const b = this.bodies[i];
        if (b.isStatic || b.removed || !b.awake) continue;
        if (b.vel.x * b.vel.x + b.vel.y * b.vel.y > s2) return false;
        if (Math.abs(b.av) > angSpeed) return false;
      }
      return true;
    }

    step(dt) {
      const C = AB.CONFIG;
      const margin = C.CONTACT_MARGIN;
      const bodies = this.bodies;
      const n = bodies.length;

      // 1. contactCount 초기화
      for (let i = 0; i < n; i++) {
        bodies[i].contactCount = 0;
        bodies[i]._idx = i;
      }

      // 2. 충돌 검출 (잠든 바디끼리도 검출한다)
      const boxes = new Array(n);
      for (let i = 0; i < n; i++) boxes[i] = computeAABB(bodies[i], margin);
      const active = [];
      for (let i = 0; i < n; i++) {
        const bi = bodies[i];
        if (bi.removed) continue;
        for (let j = i + 1; j < n; j++) {
          const bj = bodies[j];
          if (bj.removed) continue;
          if (bi.isStatic && bj.isStatic) continue;
          if (bi.group !== null && bi.group === bj.group) continue;
          const A = bi.id < bj.id ? bi : bj;
          const B = bi.id < bj.id ? bj : bi;
          const key = A.id + ':' + B.id;
          if (!aabbOverlap(boxes[i], boxes[j])) {
            this.arbiters.delete(key);
            continue;
          }
          const contacts = collide(A, B, margin);
          if (contacts.length === 0) {
            this.arbiters.delete(key);
            continue;
          }
          let arb = this.arbiters.get(key);
          if (!arb) {
            arb = new Arbiter(A, B);
            this.arbiters.set(key, arb);
          }
          arb.update(contacts);
          A.contactCount++;
          B.contactCount++;
          active.push(arb);
        }
      }

      // 3. 섬 계산과 깨우기 (union-find, 정적 바디 제외)
      const parent = new Int32Array(n);
      for (let i = 0; i < n; i++) parent[i] = i;
      const find = (i) => {
        let x = i;
        while (parent[x] !== x) {
          parent[x] = parent[parent[x]];
          x = parent[x];
        }
        return x;
      };
      for (let k = 0; k < active.length; k++) {
        const A = active[k].bodyA;
        const B = active[k].bodyB;
        if (A.isStatic || B.isStatic) continue;
        const ra = find(A._idx);
        const rb = find(B._idx);
        if (ra !== rb) parent[ra] = rb;
      }
      const islands = new Map();
      for (let i = 0; i < n; i++) {
        const b = bodies[i];
        if (b.isStatic || b.removed) continue;
        const root = find(i);
        let list = islands.get(root);
        if (!list) {
          list = [];
          islands.set(root, list);
        }
        list.push(b);
      }
      islands.forEach((members) => {
        let anyAwake = false;
        for (let k = 0; k < members.length; k++) {
          if (members[k].awake) {
            anyAwake = true;
            break;
          }
        }
        if (!anyAwake) return;
        for (let k = 0; k < members.length; k++) {
          const m = members[k];
          if (!m.awake) {
            m.awake = true;
            m.sleepTime = 0;
          }
        }
      });

      // 4. 힘 적분 (중력 + 감쇠)
      for (let i = 0; i < n; i++) {
        const b = bodies[i];
        if (!isAwakeDynamic(b)) continue;
        b.vel.y += C.GRAVITY * dt;
        const ld = 1 / (1 + dt * b.linDamp);
        b.vel.x *= ld;
        b.vel.y *= ld;
        b.av *= 1 / (1 + dt * b.angDamp);
      }

      // 5. PreStep (깨어 있는 동적 바디가 포함된 아비터만)
      const solve = [];
      for (let k = 0; k < active.length; k++) {
        const arb = active[k];
        if (!isAwakeDynamic(arb.bodyA) && !isAwakeDynamic(arb.bodyB)) continue;
        arb.preStep(dt, this.impactHandler);
        solve.push(arb);
      }

      // 6. 반복
      for (let it = 0; it < C.ITERATIONS; it++) {
        for (let k = 0; k < solve.length; k++) {
          if (!solve[k].disabled) solve[k].applyImpulse();
        }
      }

      // 7. 위치 적분
      for (let i = 0; i < n; i++) {
        const b = bodies[i];
        if (!isAwakeDynamic(b)) continue;
        b.pos.x += b.vel.x * dt;
        b.pos.y += b.vel.y * dt;
        b.angle += b.av * dt;
      }

      // 8. 안전망: 비유한수 좌표 바디 제거
      const bad = [];
      for (let i = 0; i < n; i++) {
        const b = bodies[i];
        if (b.isStatic || b.removed) continue;
        if (
          !Number.isFinite(b.pos.x) || !Number.isFinite(b.pos.y) ||
          !Number.isFinite(b.vel.x) || !Number.isFinite(b.vel.y) ||
          !Number.isFinite(b.angle) || !Number.isFinite(b.av)
        ) {
          bad.push(b);
        }
      }
      for (let i = 0; i < bad.length; i++) {
        this.removeBody(bad[i]);
        this.lostBodies.push(bad[i]);
      }

      // 9. 수면 갱신
      const linSq = C.SLEEP_LIN * C.SLEEP_LIN;
      for (let i = 0; i < n; i++) {
        const b = bodies[i];
        if (!isAwakeDynamic(b)) continue;
        if (b.vel.x * b.vel.x + b.vel.y * b.vel.y < linSq && Math.abs(b.av) < C.SLEEP_ANG) {
          b.sleepTime += dt;
        } else {
          b.sleepTime = 0;
        }
      }
      islands.forEach((members) => {
        let hasAwake = false;
        let canSleep = true;
        for (let k = 0; k < members.length; k++) {
          const m = members[k];
          if (m.removed) continue;
          if (m.awake) hasAwake = true;
          if (m.sleepTime < C.TIME_TO_SLEEP) {
            canSleep = false;
            break;
          }
        }
        if (!hasAwake || !canSleep) return;
        for (let k = 0; k < members.length; k++) {
          const m = members[k];
          if (m.removed) continue;
          m.awake = false;
          m.vel.x = 0;
          m.vel.y = 0;
          m.av = 0;
        }
      });
    }
  }

  AB.Physics = {
    createBody: createBody,
    computeAABB: computeAABB,
    aabbOverlap: aabbOverlap,
    collide: collide,
    World: World,
  };
})();
