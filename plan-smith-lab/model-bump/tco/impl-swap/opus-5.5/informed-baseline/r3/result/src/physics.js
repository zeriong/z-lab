/*
 * src/physics.js — 회전 없는 임펄스 기반 2D 물리 (§5)
 * 노출: P = { createWorld, addBox, addCircle, step, queryRadius }
 * 참조 전역: U, C (함수 본문 안에서만)
 *
 * 월드 객체: { bodies: [], broken: [], impacts: 0, time: 0 }
 *   - broken : 이번 스텝(들)에서 hp<=0 이 되어 dead 처리된 바디 목록. 게임이 소비 후 비운다.
 *   - impacts: 이번 스텝에서 DMG_MIN_SPEED 를 넘은 충돌 수 (효과음용)
 * 이 파일은 Math.random 을 쓰지 않는다 (§12.4).
 */
(function () {
  'use strict';

  var LOW_BOUNCE_SPEED = 60;  // §5.4 |rvn| < 60 이면 e = 0 (스택 떨림 방지)
  var DESTROY_WAKE_R = 120;   // §5.6 파괴 시 이 반경 안의 바디를 깨운다
  var CLUSTER_MARGIN = 2;     // 깨움 전파 시 "맞닿아 있음" 판정 여유(px)

  var nextId = 1;

  function num(v, d) {
    return (typeof v === 'number' && !isNaN(v)) ? v : d;
  }

  /* ------------------------------------------------------------------ */
  /* 월드 / 바디 생성 (§5.1)                                             */
  /* ------------------------------------------------------------------ */

  function createWorld() {
    return { bodies: [], broken: [], impacts: 0, time: 0 };
  }

  function makeBody(shape, x, y, opts) {
    var hp = num(opts.hp, Infinity);
    return {
      id: nextId++,
      shape: shape,
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      r: 0,
      hw: 0,
      hh: 0,
      mass: Infinity,
      invMass: 0,
      e: num(opts.e, 0.2),
      mu: num(opts.mu, 0.5),
      isStatic: !!opts.isStatic,
      sleeping: false,
      sleepTimer: 0,
      hp: hp,
      maxHp: hp,
      kind: opts.kind || 'block',
      mat: opts.mat || 'wood',
      dead: false,
      angle: 0,        // 렌더 전용 (§12.3)
      touched: false   // 접근 중인 접촉이 한 번이라도 있었는가 (폭탄새 자동 폭발 판정용)
    };
  }

  // 질량 = 면적 × 밀도 / 1000. 정적 바디는 계산 없이 Infinity.
  function applyMass(b, area, density) {
    if (b.isStatic) {
      b.mass = Infinity;
      b.invMass = 0;
      return;
    }
    var m = (area * density) / 1000;
    if (!(m > 0)) m = 1;
    b.mass = m;
    b.invMass = 1 / m;
  }

  // (x, y) = 중심, hw/hh = 반너비/반높이
  function addBox(world, x, y, hw, hh, opts) {
    opts = opts || {};
    var b = makeBody('box', x, y, opts);
    b.hw = hw;
    b.hh = hh;
    applyMass(b, (2 * hw) * (2 * hh), num(opts.density, 1));
    world.bodies.push(b);
    return b;
  }

  function addCircle(world, x, y, r, opts) {
    opts = opts || {};
    var b = makeBody('circle', x, y, opts);
    b.r = r;
    applyMass(b, Math.PI * r * r, num(opts.density, 1));
    world.bodies.push(b);
    return b;
  }

  /* ------------------------------------------------------------------ */
  /* 보조                                                                */
  /* ------------------------------------------------------------------ */

  // 해석용 유효 역질량: 잠든 바디는 깨어날 때까지 움직이지 않는 지지물로 취급한다.
  function invM(b) {
    return (b.isStatic || b.sleeping) ? 0 : b.invMass;
  }

  function speedSq(b) {
    return b.vx * b.vx + b.vy * b.vy;
  }

  function extX(b) { return b.shape === 'circle' ? b.r : b.hw; }
  function extY(b) { return b.shape === 'circle' ? b.r : b.hh; }

  function isNear(a, b, margin) {
    return Math.abs(a.x - b.x) <= extX(a) + extX(b) + margin &&
           Math.abs(a.y - b.y) <= extY(a) + extY(b) + margin;
  }

  // 바디를 깨우고, 그 바디와 맞닿아 잠들어 있는 바디들에도 깨움을 전파한다.
  // (지지물이 천천히 빠져나가 잠든 바디가 공중에 남는 현상 방지. 정적 바디는 전파 경로가 아니다.)
  function wakeCluster(world, seed) {
    if (seed.isStatic || seed.dead) return;
    seed.sleeping = false;
    seed.sleepTimer = 0;
    var bodies = world.bodies;
    var stack = [seed];
    while (stack.length) {
      var cur = stack.pop();
      for (var i = 0; i < bodies.length; i++) {
        var o = bodies[i];
        if (o === cur || o.isStatic || o.dead || !o.sleeping) continue;
        if (isNear(cur, o, CLUSTER_MARGIN)) {
          o.sleeping = false;
          o.sleepTimer = 0;
          stack.push(o);
        }
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* 충돌 판정 3종 (§5.3) — 접촉 {a, b, nx, ny, depth}, n 은 a→b 단위벡터 */
  /* ------------------------------------------------------------------ */

  function circleCircle(a, b) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var rs = a.r + b.r;
    var d2 = dx * dx + dy * dy;
    if (d2 >= rs * rs) return null;
    var d = Math.sqrt(d2);
    if (d === 0) return { a: a, b: b, nx: 0, ny: -1, depth: rs };
    return { a: a, b: b, nx: dx / d, ny: dy / d, depth: rs - d };
  }

  // c = 원, box = 박스. 반환 접촉은 a = 원, b = 박스.
  function circleBox(c, box) {
    var qx = U.clamp(c.x, box.x - box.hw, box.x + box.hw);
    var qy = U.clamp(c.y, box.y - box.hh, box.y + box.hh);
    var dx = qx - c.x;
    var dy = qy - c.y;

    if (dx !== 0 || dy !== 0) {
      // 원 중심이 박스 밖
      var d2 = dx * dx + dy * dy;
      if (d2 >= c.r * c.r) return null;
      var d = Math.sqrt(d2);
      return { a: c, b: box, nx: dx / d, ny: dy / d, depth: c.r - d };
    }

    // 원 중심이 박스 안: 가장 가까운 면 쪽 축으로, 중심에서 멀어지는 방향으로 밀어낸다.
    var ox = box.hw - Math.abs(c.x - box.x);
    var oy = box.hh - Math.abs(c.y - box.y);
    var s;
    if (ox < oy) {
      s = U.sign(c.x - box.x) || -1;
      return { a: c, b: box, nx: -s, ny: 0, depth: ox + c.r };
    }
    s = U.sign(c.y - box.y) || -1;
    return { a: c, b: box, nx: 0, ny: -s, depth: oy + c.r };
  }

  function boxBox(a, b) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var ox = (a.hw + b.hw) - Math.abs(dx);
    if (ox <= 0) return null;
    var oy = (a.hh + b.hh) - Math.abs(dy);
    if (oy <= 0) return null;

    var useX = ox < oy;
    // 퇴화 처리: 고른 축의 중심 차가 정확히 0이면 sign()=0 이라 법선이 정의되지 않는다.
    // 그때는 다른 축을 분리축으로 쓴다. (둘 다 0이면 원-원 규칙처럼 (0,-1))
    if (useX && dx === 0) {
      useX = false;
    } else if (!useX && dy === 0 && dx !== 0) {
      useX = true;
    }

    if (useX) return { a: a, b: b, nx: U.sign(dx), ny: 0, depth: ox };
    return { a: a, b: b, nx: 0, ny: U.sign(dy) || -1, depth: oy };
  }

  function collide(a, b) {
    if (a.shape === 'circle') {
      if (b.shape === 'circle') return circleCircle(a, b);
      return circleBox(a, b);
    }
    if (b.shape === 'circle') return circleBox(b, a);
    return boxBox(a, b);
  }

  /* ------------------------------------------------------------------ */
  /* 피해 모델 (§5.5)                                                    */
  /* ------------------------------------------------------------------ */

  function applyDamage(world, self, other, vn) {
    if (self.isStatic || self.dead || self.hp === Infinity) return;
    var otherMassEff = other.isStatic ? (self.mass * C.STATIC_MASS_FACTOR) : other.mass;
    var ratio = Math.min(C.DMG_MASS_CAP, otherMassEff / self.mass);
    var dmg = (vn - C.DMG_MIN_SPEED) * C.DMG_SCALE * ratio;
    self.hp -= dmg;
    if (self.hp <= 0) {
      self.dead = true;          // 파괴 큐: 7단계에서 제거
      world.broken.push(self);
    }
  }

  /* ------------------------------------------------------------------ */
  /* 임펄스 해결 (§5.4)                                                  */
  /* ------------------------------------------------------------------ */

  function resolve(c) {
    var a = c.a;
    var b = c.b;
    var nx = c.nx;
    var ny = c.ny;
    var ia = invM(a);
    var ib = invM(b);

    var rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (rvn > 0) return;                         // 이미 분리 중
    var inv = ia + ib;
    if (inv === 0) return;

    var e = Math.min(a.e, b.e);
    if (Math.abs(rvn) < LOW_BOUNCE_SPEED) e = 0; // 저속 반발 억제 → 스택 안정화
    var j = -(1 + e) * rvn / inv;
    a.vx -= j * nx * ia;
    a.vy -= j * ny * ia;
    b.vx += j * nx * ib;
    b.vy += j * ny * ib;

    // 마찰: 접선 t = (-ny, nx)
    var tx = -ny;
    var ty = nx;
    var rvt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
    var jt = -rvt / inv;
    var mu = Math.sqrt(a.mu * b.mu);
    var maxF = Math.abs(j) * mu;
    jt = U.clamp(jt, -maxF, maxF);
    a.vx -= jt * tx * ia;
    a.vy -= jt * ty * ia;
    b.vx += jt * tx * ib;
    b.vy += jt * ty * ib;
  }

  /* ------------------------------------------------------------------ */
  /* 스텝 (§5.2) — dt 는 고정 스텝(C.FIXED_DT)                            */
  /* ------------------------------------------------------------------ */

  function step(world, dt) {
    var bodies = world.bodies;
    var n = bodies.length;
    var i, j, k, a, b, c, vn;

    world.impacts = 0;
    world.time += dt;

    // 1) 적분 (정적 / 슬립 / 제거 예약 바디 제외)
    for (i = 0; i < n; i++) {
      b = bodies[i];
      if (b.isStatic || b.sleeping || b.dead) continue;
      b.vy += C.GRAVITY * dt;
      b.vx -= b.vx * C.LINEAR_DAMP * dt;
      b.vy -= b.vy * C.LINEAR_DAMP * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }

    // 2) 접촉 수집 (전체 쌍 O(n²))
    var contacts = [];
    var wake2 = C.WAKE_SPEED * C.WAKE_SPEED;
    for (i = 0; i < n; i++) {
      a = bodies[i];
      if (a.dead) continue;
      for (j = i + 1; j < n; j++) {
        b = bodies[j];
        if (b.dead) continue;
        if (a.isStatic && b.isStatic) continue;   // 둘 다 정적
        if (a.sleeping && b.sleeping) continue;   // 둘 다 슬립
        c = collide(a, b);
        if (!c) continue;
        // 한쪽이 깨어 있고 WAKE_SPEED 이상이면 상대를 깨운다 (§5.6)
        if (b.sleeping && !a.isStatic && !a.sleeping && speedSq(a) >= wake2) wakeCluster(world, b);
        if (a.sleeping && !b.isStatic && !b.sleeping && speedSq(b) >= wake2) wakeCluster(world, a);
        contacts.push(c);
      }
    }

    // 3) 피해 계산 (반복 전에 1회만)
    for (k = 0; k < contacts.length; k++) {
      c = contacts[k];
      a = c.a;
      b = c.b;
      vn = -((b.vx - a.vx) * c.nx + (b.vy - a.vy) * c.ny);
      if (vn > 0) {
        a.touched = true;
        b.touched = true;
      }
      if (vn > C.DMG_MIN_SPEED) {
        world.impacts++;
        applyDamage(world, a, b, vn);
        applyDamage(world, b, a, vn);
      }
    }

    // 4) 임펄스 반복 SOLVER_ITER 회
    for (var it = 0; it < C.SOLVER_ITER; it++) {
      for (k = 0; k < contacts.length; k++) {
        resolve(contacts[k]);
      }
    }

    // 5) 위치 보정 (반복 후 1회)
    for (k = 0; k < contacts.length; k++) {
      c = contacts[k];
      a = c.a;
      b = c.b;
      var ia = invM(a);
      var ib = invM(b);
      var inv = ia + ib;
      if (inv === 0) continue;
      var corr = Math.max(c.depth - C.PEN_SLOP, 0) / inv * C.PEN_PERCENT;
      a.x -= corr * ia * c.nx;
      a.y -= corr * ia * c.ny;
      b.x += corr * ib * c.nx;
      b.y += corr * ib * c.ny;
    }

    // 6) 슬립 갱신
    var sleep2 = C.SLEEP_SPEED * C.SLEEP_SPEED;
    for (i = 0; i < n; i++) {
      b = bodies[i];
      if (b.isStatic || b.sleeping || b.dead) continue;
      if (speedSq(b) < sleep2) {
        b.sleepTimer += dt;
      } else {
        b.sleepTimer = 0;
      }
      if (b.sleepTimer > C.SLEEP_TIME) {
        b.sleeping = true;
        b.vx = 0;
        b.vy = 0;
      }
    }

    // 7) dead 플래그 바디 제거 (제거 전, 반경 120px 안의 잠든 바디를 깨운다)
    removeDead(world);
  }

  function removeDead(world) {
    var bodies = world.bodies;
    var alive = [];
    var dead = [];
    var i, j;
    for (i = 0; i < bodies.length; i++) {
      if (bodies[i].dead) dead.push(bodies[i]);
      else alive.push(bodies[i]);
    }
    if (dead.length === 0) return;

    var r2 = DESTROY_WAKE_R * DESTROY_WAKE_R;
    for (i = 0; i < dead.length; i++) {
      var d = dead[i];
      for (j = 0; j < alive.length; j++) {
        var o = alive[j];
        if (o.isStatic || !o.sleeping) continue;
        var dx = o.x - d.x;
        var dy = o.y - d.y;
        if (dx * dx + dy * dy <= r2) wakeCluster(world, o);
      }
    }
    world.bodies = alive;
  }

  /* ------------------------------------------------------------------ */
  /* 반경 질의 (§5.7) — 중심거리 기준                                     */
  /* ------------------------------------------------------------------ */

  function queryRadius(world, x, y, r) {
    var out = [];
    var r2 = r * r;
    var bodies = world.bodies;
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (b.dead) continue;
      var dx = b.x - x;
      var dy = b.y - y;
      if (dx * dx + dy * dy <= r2) out.push(b);
    }
    return out;
  }

  window.P = {
    createWorld: createWorld,
    addBox: addBox,
    addCircle: addCircle,
    step: step,
    queryRadius: queryRadius
  };
})();
