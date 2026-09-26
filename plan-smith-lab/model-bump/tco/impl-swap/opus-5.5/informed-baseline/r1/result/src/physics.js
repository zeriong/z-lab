/*
 * physics.js — 회전 없는 임펄스 기반 2D 물리 (§5)
 * 노출: window.P = { createWorld, addBox, addCircle, step, queryRadius }
 * 참조 전역: U, C
 *
 * - 좌표계: x 오른쪽 +, y 아래쪽 +, 중력 +y.
 * - 모든 바디는 중심 좌표로 저장. 박스는 hw/hh(반너비/반높이), 원은 r.
 * - 정적 바디: mass = Infinity, invMass = 0, 적분 대상 아님.
 * - 슬립 바디: 적분하지 않고, 접촉 해결 시 유효 역질량 0(움직이지 않는 지지물)으로 취급.
 * - 이 파일 안에서는 Math.random 을 쓰지 않는다(§12.4).
 */
(function () {
  'use strict';

  var REST_BOUNCE_SPEED = 60;   // §5.4 |rvn| < 60 이면 e = 0 (스택 떨림 방지)
  var DESTROY_WAKE_R = 120;     // §5.6 바디 파괴 시 이 반경 안의 바디를 깨운다
  var MAX_COLLECT_PASS = 3;     // 접촉 수집 중 깨어난 바디가 있으면 다시 수집(최대 횟수)

  // ------------------------------------------------------------------
  // 월드 / 바디 생성
  // ------------------------------------------------------------------

  function createWorld() {
    return {
      bodies: [],
      nextId: 1,
      broken: [],   // 이번 스텝에 피해로 파괴된 바디 (게임 쪽이 점수·파티클 처리 후 비운다)
      impacts: 0,   // 이번 스텝에 접근속도가 DMG_MIN_SPEED 를 넘은 접촉 수 (효과음용)
      spawn: []     // 스테이지 빌더(SB)가 채우는 생성 명세 목록 (§11.5)
    };
  }

  function makeBody(world, o, shape) {
    var hp = (o.hp == null) ? Infinity : o.hp;
    return {
      id: world.nextId++,
      shape: shape,
      x: o.x,
      y: o.y,
      vx: o.vx || 0,
      vy: o.vy || 0,
      r: 0,
      hw: 0,
      hh: 0,
      mass: Infinity,
      invMass: 0,
      e: (o.e == null) ? 0.2 : o.e,
      mu: (o.mu == null) ? 0.5 : o.mu,
      isStatic: !!o.isStatic,
      sleeping: false,
      sleepTimer: 0,
      hp: hp,
      maxHp: hp,
      kind: o.kind || 'block',
      mat: o.mat || 'wood',
      dead: false,
      angle: 0,          // 렌더 전용 회전각 (물리 미반영, §12.3)
      touched: false,    // 한 번이라도 접촉했는가 (폭탄새 자동 폭발 타이머용)
      _touch: false      // 이번 스텝에 무언가와 닿아 있는가 (슬립 바디 지지 판정용)
    };
  }

  // 질량 = 면적 x 밀도 / 1000. 정적 바디는 계산 없이 Infinity.
  function applyMass(b, area, density) {
    if (b.isStatic) {
      b.mass = Infinity;
      b.invMass = 0;
      return;
    }
    var m = (area * (density > 0 ? density : 1)) / 1000;
    if (!(m > 0)) m = 1;
    b.mass = m;
    b.invMass = 1 / m;
  }

  // o = { x, y, hw, hh, density, e, mu, hp, kind, mat, isStatic, vx?, vy? }
  function addBox(world, o) {
    var b = makeBody(world, o, 'box');
    b.hw = o.hw;
    b.hh = o.hh;
    applyMass(b, (2 * b.hw) * (2 * b.hh), o.density);
    world.bodies.push(b);
    return b;
  }

  // o = { x, y, r, density, e, mu, hp, kind, mat, isStatic, vx?, vy? }
  function addCircle(world, o) {
    var b = makeBody(world, o, 'circle');
    b.r = o.r;
    applyMass(b, Math.PI * b.r * b.r, o.density);
    world.bodies.push(b);
    return b;
  }

  // ------------------------------------------------------------------
  // 보조
  // ------------------------------------------------------------------

  function isInert(b) {
    return b.isStatic || b.sleeping;
  }

  // 접촉 해결에 쓰는 유효 역질량: 정적·슬립이면 0
  function effInvMass(b) {
    return (b.isStatic || b.sleeping) ? 0 : b.invMass;
  }

  function speedSq(b) {
    return b.vx * b.vx + b.vy * b.vy;
  }

  function wake(b) {
    if (b.isStatic) return;
    b.sleeping = false;
    b.sleepTimer = 0;
  }

  // ------------------------------------------------------------------
  // 충돌 판정 3종 (§5.3) — 법선 n 은 항상 a -> b 방향 단위벡터
  // ------------------------------------------------------------------

  // 원-원
  function circleCircle(a, b) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var rs = a.r + b.r;
    var d2 = dx * dx + dy * dy;
    if (d2 >= rs * rs) return null;
    var d = Math.sqrt(d2);
    if (d === 0) return { nx: 0, ny: -1, depth: rs };
    return { nx: dx / d, ny: dy / d, depth: rs - d };
  }

  // 원(c) - 박스(box). 반환 법선은 c -> box 방향.
  function circleBox(c, box) {
    var qx = U.clamp(c.x, box.x - box.hw, box.x + box.hw);
    var qy = U.clamp(c.y, box.y - box.hh, box.y + box.hh);

    if (qx !== c.x || qy !== c.y) {
      // 원 중심이 박스 밖
      var dx = qx - c.x;
      var dy = qy - c.y;
      var d2 = dx * dx + dy * dy;
      if (d2 >= c.r * c.r) return null;
      var d = Math.sqrt(d2);
      return { nx: dx / d, ny: dy / d, depth: c.r - d };
    }

    // 원 중심이 박스 안: 가장 가까운 면 쪽 축으로 밀어낸다 (원은 -n 방향 = 박스 중심에서 멀어지는 쪽)
    var px = box.hw - Math.abs(c.x - box.x);
    var py = box.hh - Math.abs(c.y - box.y);
    if (px < py) {
      return { nx: U.sign(box.x - c.x) || 1, ny: 0, depth: px + c.r };
    }
    return { nx: 0, ny: U.sign(box.y - c.y) || 1, depth: py + c.r };
  }

  // 박스-박스 (AABB, 회전 없음)
  function boxBox(a, b) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var ox = (a.hw + b.hw) - Math.abs(dx);
    if (ox <= 0) return null;
    var oy = (a.hh + b.hh) - Math.abs(dy);
    if (oy <= 0) return null;
    if (ox < oy) {
      return { nx: U.sign(dx) || 1, ny: 0, depth: ox };
    }
    return { nx: 0, ny: U.sign(dy) || 1, depth: oy };
  }

  // 형상별 분기. 접촉 { a, b, nx, ny, depth } 또는 null
  function collide(a, b) {
    var r;
    if (a.shape === 'circle') {
      r = (b.shape === 'circle') ? circleCircle(a, b) : circleBox(a, b);
    } else if (b.shape === 'circle') {
      r = circleBox(b, a);          // 법선이 b -> a 이므로 뒤집는다
      if (r) {
        r.nx = -r.nx;
        r.ny = -r.ny;
      }
    } else {
      r = boxBox(a, b);
    }
    if (!r) return null;
    r.a = a;
    r.b = b;
    return r;
  }

  // ------------------------------------------------------------------
  // 2) 접촉 수집 (브로드페이즈 없이 O(n^2))
  // ------------------------------------------------------------------

  function collectOnce(bodies) {
    var contacts = [];
    var woke = false;
    var wake2 = C.WAKE_SPEED * C.WAKE_SPEED;
    var n = bodies.length;
    var i, j, a, b, c;

    for (i = 0; i < n; i++) bodies[i]._touch = false;

    for (i = 0; i < n; i++) {
      a = bodies[i];
      if (a.dead) continue;
      for (j = i + 1; j < n; j++) {
        b = bodies[j];
        if (b.dead) continue;

        // 둘 다 정적 -> 건너뜀
        if (a.isStatic && b.isStatic) continue;

        // 둘 다 슬립(또는 슬립+정적) -> 해결 대상이 아니므로 건너뜀.
        // 단, 슬립 바디가 아직 무언가에 '받쳐져 있는지'는 기록해 둔다.
        if (isInert(a) && isInert(b)) {
          if (collide(a, b)) {
            a._touch = true;
            b._touch = true;
          }
          continue;
        }

        c = collide(a, b);
        if (!c) continue;

        a._touch = true;
        b._touch = true;
        a.touched = true;
        b.touched = true;

        // §5.6 한쪽이 깨어 있고 WAKE_SPEED 이상이면 상대를 깨운다
        if (a.sleeping && !b.isStatic && !b.sleeping && speedSq(b) >= wake2) {
          wake(a);
          woke = true;
        }
        if (b.sleeping && !a.isStatic && !a.sleeping && speedSq(a) >= wake2) {
          wake(b);
          woke = true;
        }

        contacts.push(c);
      }
    }
    return { contacts: contacts, woke: woke };
  }

  function collectContacts(bodies) {
    var res;
    var pass = 0;
    // 수집 도중 깨어난 바디가 있으면, 그 바디가 앞서 '둘 다 슬립'으로 건너뛴 쌍(예: 지면)을
    // 놓치지 않도록 다시 수집한다.
    do {
      res = collectOnce(bodies);
      pass++;
    } while (res.woke && pass < MAX_COLLECT_PASS);

    // 아무것과도 닿아 있지 않은 슬립 바디 = 받침을 잃음 -> 깨워서 떨어지게 한다
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (b.sleeping && !b._touch && !b.dead) wake(b);
    }
    return res.contacts;
  }

  // ------------------------------------------------------------------
  // 3) 피해 모델 (§5.5)
  // ------------------------------------------------------------------

  function applyDamage(world, self, other, vn) {
    if (self.isStatic || self.dead || self.hp === Infinity) return;   // 새·지면은 피해 무시
    var otherMassEff = other.isStatic ? (self.mass * C.STATIC_MASS_FACTOR) : other.mass;
    var ratio = Math.min(C.DMG_MASS_CAP, otherMassEff / self.mass);
    var dmg = (vn - C.DMG_MIN_SPEED) * C.DMG_SCALE * ratio;
    self.hp -= dmg;
    if (self.hp <= 0 && self.hp !== Infinity) {
      self.dead = true;            // 제거 예약 (7단계에서 배열에서 뺀다)
      world.broken.push(self);     // 파괴 큐
    }
  }

  // ------------------------------------------------------------------
  // 4) 임펄스 해결 (§5.4) — 접촉 1개당
  // ------------------------------------------------------------------

  function resolveContact(c) {
    var a = c.a;
    var b = c.b;
    var nx = c.nx;
    var ny = c.ny;

    var rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (rvn > 0) return;                              // 이미 분리 중

    var ia = effInvMass(a);
    var ib = effInvMass(b);
    var inv = ia + ib;
    if (inv === 0) return;

    var e = Math.min(a.e, b.e);
    if (Math.abs(rvn) < REST_BOUNCE_SPEED) e = 0;      // 저속 반발 억제 -> 스택 안정화

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

  // ------------------------------------------------------------------
  // 5) 위치 보정 (반복 후 1회)
  // ------------------------------------------------------------------

  function correctPosition(c) {
    var a = c.a;
    var b = c.b;
    var ia = effInvMass(a);
    var ib = effInvMass(b);
    var inv = ia + ib;
    if (inv === 0) return;
    var corr = Math.max(c.depth - C.PEN_SLOP, 0) / inv * C.PEN_PERCENT;
    a.x -= corr * ia * c.nx;
    a.y -= corr * ia * c.ny;
    b.x += corr * ib * c.nx;
    b.y += corr * ib * c.ny;
  }

  // ------------------------------------------------------------------
  // 스텝 (§5.2) — dt 는 이미 FIXED_DT
  // ------------------------------------------------------------------

  function step(world, dt) {
    var bodies = world.bodies;
    var n, i, j, k, b, c, contacts;

    world.impacts = 0;

    // 1) 적분 (정적/슬립 바디 제외)
    n = bodies.length;
    for (i = 0; i < n; i++) {
      b = bodies[i];
      if (b.isStatic || b.sleeping || b.dead) continue;
      b.vy += C.GRAVITY * dt;
      b.vx -= b.vx * C.LINEAR_DAMP * dt;
      b.vy -= b.vy * C.LINEAR_DAMP * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }

    // 2) 접촉 수집
    contacts = collectContacts(bodies);

    // 3) 피해 계산 (반복 전에 1회만)
    for (k = 0; k < contacts.length; k++) {
      c = contacts[k];
      var vn = -((c.b.vx - c.a.vx) * c.nx + (c.b.vy - c.a.vy) * c.ny);
      if (vn > C.DMG_MIN_SPEED) {
        world.impacts++;
        applyDamage(world, c.a, c.b, vn);
        applyDamage(world, c.b, c.a, vn);
      }
    }

    // 4) 임펄스 반복 SOLVER_ITER 회
    for (i = 0; i < C.SOLVER_ITER; i++) {
      for (k = 0; k < contacts.length; k++) resolveContact(contacts[k]);
    }

    // 5) 위치 보정 (반복 후 1회)
    for (k = 0; k < contacts.length; k++) correctPosition(contacts[k]);

    // 6) 슬립 갱신 (§5.6)
    var sleep2 = C.SLEEP_SPEED * C.SLEEP_SPEED;
    for (i = 0; i < n; i++) {
      b = bodies[i];
      if (b.isStatic || b.dead) continue;
      if (b.sleeping) {
        b.vx = 0;
        b.vy = 0;
        continue;
      }
      if (speedSq(b) < sleep2) b.sleepTimer += dt;
      else b.sleepTimer = 0;
      if (b.sleepTimer > C.SLEEP_TIME) {
        b.sleeping = true;
        b.vx = 0;
        b.vy = 0;
      }
    }

    // 7) dead 플래그 바디 제거 (+ 파괴 지점 반경 120px 내 바디 깨우기)
    var anyDead = false;
    for (i = 0; i < bodies.length; i++) {
      if (bodies[i].dead) { anyDead = true; break; }
    }
    if (anyDead) {
      var r2 = DESTROY_WAKE_R * DESTROY_WAKE_R;
      for (i = 0; i < bodies.length; i++) {
        var d = bodies[i];
        if (!d.dead) continue;
        for (j = 0; j < bodies.length; j++) {
          var o = bodies[j];
          if (o.dead || o.isStatic) continue;
          var dx = o.x - d.x;
          var dy = o.y - d.y;
          if (dx * dx + dy * dy <= r2) wake(o);
        }
      }
      var w = 0;
      for (i = 0; i < bodies.length; i++) {
        if (!bodies[i].dead) bodies[w++] = bodies[i];
      }
      bodies.length = w;
    }
  }

  // ------------------------------------------------------------------
  // 반경 질의 (§5.7) — 원·박스 모두 중심거리로 근사. 폭탄새 폭발에만 사용.
  // ------------------------------------------------------------------

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
