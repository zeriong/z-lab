/*
 * physics.js — 회전 없는 임펄스 기반 2D 물리 (§5)
 * 노출: window.P = { createWorld, addBox, addCircle, step, queryRadius }
 * 참조: U, C (함수 본문 안에서만)
 *
 * world = { bodies: Body[], events: Event[] }
 *   events 는 step 이 채우고 game.js 가 비운다.
 *   { type: 'hit',   a, b, vn }   접근속도 vn > DMG_MIN_SPEED 인 충돌
 *   { type: 'break', body }       내구도 소진으로 파괴된 바디
 */
(function () {
  'use strict';

  var REST_BOUNCE_SPEED = 60;   // §5.4 |rvn| < 60 이면 e = 0 (스택 떨림 방지)
  var BREAK_WAKE_RADIUS = 120;  // §5.6 파괴 시 반경 120px 내 바디를 깨운다
  var SUPPORT_MARGIN = 2;       // 보강: 파괴된 바디와 맞닿아 있던 바디도 깨운다(반경 밖의 긴 판이 공중에 남지 않도록)

  var nextId = 1;

  function num(v, d) {
    return (typeof v === 'number' && !isNaN(v)) ? v : d;
  }

  function createWorld() {
    return { bodies: [], events: [] };
  }

  // §5.1 바디 필드
  function makeBody(shape, x, y, o) {
    o = o || {};
    var hp = num(o.hp, Infinity);
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
      e: num(o.e, 0.2),
      mu: num(o.mu, 0.5),
      isStatic: !!o.isStatic,
      sleeping: false,
      sleepTimer: 0,
      hp: hp,
      maxHp: hp,
      kind: o.kind || 'block',
      mat: o.mat || 'wood',
      dead: false,
      angle: 0,          // 렌더 전용(§12.3)
      touched: false     // 한 번이라도 접촉했는가(폭탄새 자동 폭발 타이머용)
    };
  }

  function applyMass(b, area, density) {
    if (b.isStatic) {
      b.mass = Infinity;
      b.invMass = 0;
      return;
    }
    var m = (area * density) / 1000;
    if (!(m > 0)) {           // 잘못된 밀도 방어: 정적으로 취급
      b.isStatic = true;
      b.mass = Infinity;
      b.invMass = 0;
      return;
    }
    b.mass = m;
    b.invMass = 1 / m;
  }

  // 박스: 중심 (x, y), 반너비 hw, 반높이 hh.  mass = (2hw * 2hh * density) / 1000
  function addBox(world, x, y, hw, hh, opts) {
    var b = makeBody('box', x, y, opts);
    b.hw = hw;
    b.hh = hh;
    applyMass(b, (2 * hw) * (2 * hh), num(opts && opts.density, 1));
    world.bodies.push(b);
    return b;
  }

  // 원: 중심 (x, y), 반지름 r.  mass = (PI r^2 * density) / 1000
  function addCircle(world, x, y, r, opts) {
    var b = makeBody('circle', x, y, opts);
    b.r = r;
    applyMass(b, Math.PI * r * r, num(opts && opts.density, 1));
    world.bodies.push(b);
    return b;
  }

  function speed2(b) {
    return b.vx * b.vx + b.vy * b.vy;
  }

  function wake(b) {
    if (b.isStatic) return;
    b.sleeping = false;
    b.sleepTimer = 0;
  }

  // ---------------------------------------------------------------
  // §5.3 충돌 판정 3종. 반환 {a, b, nx, ny, depth}, n 은 a -> b 방향 단위벡터
  // ---------------------------------------------------------------

  // 원-원
  function circleCircle(a, b) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var rs = a.r + b.r;
    var d2 = dx * dx + dy * dy;
    if (d2 >= rs * rs) return null;
    var d = Math.sqrt(d2);
    if (d === 0) {
      return { a: a, b: b, nx: 0, ny: -1, depth: rs };
    }
    return { a: a, b: b, nx: dx / d, ny: dy / d, depth: rs - d };
  }

  // 원(a)-박스(b)
  function circleBox(a, b) {
    var qx = U.clamp(a.x, b.x - b.hw, b.x + b.hw);
    var qy = U.clamp(a.y, b.y - b.hh, b.y + b.hh);
    var dx = qx - a.x;
    var dy = qy - a.y;

    if (dx !== 0 || dy !== 0) {
      // 원 중심이 박스 밖
      var d2 = dx * dx + dy * dy;
      if (d2 >= a.r * a.r) return null;
      var d = Math.sqrt(d2);
      return { a: a, b: b, nx: dx / d, ny: dy / d, depth: a.r - d };
    }

    // 원 중심이 박스 안(또는 경계 위): 가장 가까운 면 축으로 밀어낸다.
    // 원은 -n 방향으로 밀리므로, 박스 중심에서 멀어지게 하려면 n = sign(b - a).
    var ox = b.hw - Math.abs(a.x - b.x);
    var oy = b.hh - Math.abs(a.y - b.y);
    if (ox < oy) {
      var sx = U.sign(b.x - a.x) || 1;
      return { a: a, b: b, nx: sx, ny: 0, depth: ox + a.r };
    }
    var sy = U.sign(b.y - a.y) || 1;   // 정확히 중앙이면 원을 위로 밀어낸다
    return { a: a, b: b, nx: 0, ny: sy, depth: oy + a.r };
  }

  // 박스-박스 (AABB)
  function boxBox(a, b) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var ox = (a.hw + b.hw) - Math.abs(dx);
    if (ox <= 0) return null;
    var oy = (a.hh + b.hh) - Math.abs(dy);
    if (oy <= 0) return null;
    var sx = U.sign(dx);
    var sy = U.sign(dy);
    if (ox < oy) {
      if (sx !== 0) return { a: a, b: b, nx: sx, ny: 0, depth: ox };
      // 퇴화: 선택 축의 부호가 0 이면 법선이 0벡터가 되므로 다른 축으로 대체
      return { a: a, b: b, nx: 0, ny: sy || -1, depth: oy };
    }
    if (sy !== 0) return { a: a, b: b, nx: 0, ny: sy, depth: oy };
    // 퇴화: 같은 높이에 나란히 겹친 박스(예: 스테이지 10의 두 판) -> 수평으로 분리
    return { a: a, b: b, nx: sx || 1, ny: 0, depth: ox };
  }

  function collide(a, b) {
    if (a.shape === 'circle') {
      if (b.shape === 'circle') return circleCircle(a, b);
      return circleBox(a, b);
    }
    if (b.shape === 'circle') {
      var c = circleBox(b, a);
      if (!c) return null;
      // 판정은 (원, 박스) 순서로 했으므로 법선을 뒤집어 a(박스) -> b(원) 방향으로 맞춘다
      return { a: a, b: b, nx: -c.nx, ny: -c.ny, depth: c.depth };
    }
    return boxBox(a, b);
  }

  // ---------------------------------------------------------------
  // §5.5 피해 모델
  // ---------------------------------------------------------------
  function applyDamage(self, other, vn) {
    if (self.isStatic || self.dead || self.hp === Infinity) return;   // 새/지면은 무시
    var otherMassEff = other.isStatic ? (self.mass * C.STATIC_MASS_FACTOR) : other.mass;
    var ratio = Math.min(C.DMG_MASS_CAP, otherMassEff / self.mass);
    var dmg = (vn - C.DMG_MIN_SPEED) * C.DMG_SCALE * ratio;
    self.hp -= dmg;
  }

  function halfW(b) { return b.shape === 'box' ? b.hw : b.r; }
  function halfH(b) { return b.shape === 'box' ? b.hh : b.r; }

  function touchesAabb(a, b, margin) {
    return Math.abs(a.x - b.x) <= halfW(a) + halfW(b) + margin &&
           Math.abs(a.y - b.y) <= halfH(a) + halfH(b) + margin;
  }

  // 파괴 처리: dead 예약 + 이벤트 + 주변 바디 깨우기(§5.6)
  function destroy(world, body) {
    body.dead = true;
    world.events.push({ type: 'break', body: body });
    var list = world.bodies;
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o === body || o.isStatic || o.dead) continue;
      if (U.dist(o.x, o.y, body.x, body.y) <= BREAK_WAKE_RADIUS || touchesAabb(o, body, SUPPORT_MARGIN)) {
        wake(o);
      }
    }
  }

  // ---------------------------------------------------------------
  // §5.4 임펄스 해결 (접촉 1개)
  // ---------------------------------------------------------------
  function resolve(c) {
    var a = c.a;
    var b = c.b;
    var nx = c.nx;
    var ny = c.ny;

    var rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (rvn > 0) return;                         // 이미 분리 중
    var inv = a.invMass + b.invMass;
    if (inv === 0) return;
    var e = Math.min(a.e, b.e);
    if (Math.abs(rvn) < REST_BOUNCE_SPEED) e = 0; // 저속 반발 억제 -> 스택 안정화
    var j = -(1 + e) * rvn / inv;
    a.vx -= j * nx * a.invMass;
    a.vy -= j * ny * a.invMass;
    b.vx += j * nx * b.invMass;
    b.vy += j * ny * b.invMass;

    // 마찰: 접선 t = (-ny, nx)
    var tx = -ny;
    var ty = nx;
    var rvt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
    var jt = -rvt / inv;
    var mu = Math.sqrt(a.mu * b.mu);
    var maxF = Math.abs(j) * mu;
    jt = U.clamp(jt, -maxF, maxF);
    a.vx -= jt * tx * a.invMass;
    a.vy -= jt * ty * a.invMass;
    b.vx += jt * tx * b.invMass;
    b.vy += jt * ty * b.invMass;
  }

  // ---------------------------------------------------------------
  // §5.2 스텝 (dt = FIXED_DT 로 호출된다)
  // ---------------------------------------------------------------
  function step(world, dt) {
    var bodies = world.bodies;
    var n = bodies.length;
    var i, j, it, a, b, c;

    // 1) 적분 (정적/슬립 바디 제외)
    for (i = 0; i < n; i++) {
      b = bodies[i];
      if (b.isStatic || b.sleeping || b.dead) continue;
      b.vy += C.GRAVITY * dt;
      b.vx -= b.vx * C.LINEAR_DAMP * dt;
      b.vy -= b.vy * C.LINEAR_DAMP * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }

    // 2) 접촉 수집 (전체 쌍 O(n^2))
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
        a.touched = true;
        b.touched = true;
        // 한쪽이 깨어 있고 WAKE_SPEED 이상이면 상대를 깨운다
        if (a.sleeping && !b.isStatic && speed2(b) >= wake2) wake(a);
        else if (b.sleeping && !a.isStatic && speed2(a) >= wake2) wake(b);
        contacts.push(c);
      }
    }

    // 3) 피해 계산 (반복 전에 1회)
    for (i = 0; i < contacts.length; i++) {
      c = contacts[i];
      var vn = -((c.b.vx - c.a.vx) * c.nx + (c.b.vy - c.a.vy) * c.ny);
      if (vn > C.DMG_MIN_SPEED) {
        applyDamage(c.a, c.b, vn);
        applyDamage(c.b, c.a, vn);
        world.events.push({ type: 'hit', a: c.a, b: c.b, vn: vn });
      }
    }
    // 파괴 큐: 이번 충돌 피해 + 스텝 밖(폭발·월드 이탈)에서 깎인 hp 까지 한 곳에서 처리
    var broken = [];
    for (i = 0; i < n; i++) {
      b = bodies[i];
      if (!b.dead && b.hp <= 0 && b.hp !== Infinity) broken.push(b);
    }
    for (i = 0; i < broken.length; i++) destroy(world, broken[i]);

    // 4) 임펄스 반복
    for (it = 0; it < C.SOLVER_ITER; it++) {
      for (i = 0; i < contacts.length; i++) resolve(contacts[i]);
    }

    // 5) 위치 보정 (반복 후 1회)
    for (i = 0; i < contacts.length; i++) {
      c = contacts[i];
      a = c.a;
      b = c.b;
      var inv = a.invMass + b.invMass;
      if (inv === 0) continue;
      var corr = Math.max(c.depth - C.PEN_SLOP, 0) / inv * C.PEN_PERCENT;
      if (corr <= 0) continue;
      a.x -= corr * a.invMass * c.nx;
      a.y -= corr * a.invMass * c.ny;
      b.x += corr * b.invMass * c.nx;
      b.y += corr * b.invMass * c.ny;
    }

    // 6) 슬립 갱신
    var sleep2 = C.SLEEP_SPEED * C.SLEEP_SPEED;
    for (i = 0; i < n; i++) {
      b = bodies[i];
      if (b.isStatic || b.dead) continue;
      if (b.sleeping) {
        // 슬립 중 바디는 속도 0 을 유지(저속 이웃의 임펄스 잔여분 제거)
        b.vx = 0;
        b.vy = 0;
        continue;
      }
      if (speed2(b) < sleep2) b.sleepTimer += dt;
      else b.sleepTimer = 0;
      if (b.sleepTimer > C.SLEEP_TIME) {
        b.sleeping = true;
        b.vx = 0;
        b.vy = 0;
      }
    }

    // 7) dead 바디 제거 (배열 identity 유지)
    var w = 0;
    for (i = 0; i < bodies.length; i++) {
      if (!bodies[i].dead) bodies[w++] = bodies[i];
    }
    bodies.length = w;
  }

  // §5.7 중심거리 r 이내 바디 (박스도 중심거리로 근사). 폭탄새 전용
  function queryRadius(world, x, y, r) {
    var out = [];
    var list = world.bodies;
    var r2 = r * r;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
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
