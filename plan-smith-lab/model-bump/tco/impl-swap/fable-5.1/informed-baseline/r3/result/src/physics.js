/* physics.js — §5 회전 없는 임펄스 기반 2D 물리. 참조 전역: U, C
 *
 * P.createWorld()                 → { bodies, destroyed, hits }
 * P.addBox(world, opts)           → body   opts: {x,y,hw,hh,density,e,mu,hp,kind,mat,isStatic}
 * P.addCircle(world, opts)        → body   opts: {x,y,r, density,e,mu,hp,kind,mat,isStatic}
 * P.step(world, dt)               → 고정 스텝 1회 (§5.2 의 7단계)
 * P.queryRadius(world, x, y, r)   → 반경 내 바디 배열
 *
 * world.destroyed : 이번 스텝에서 hp 소진으로 파괴된 바디 큐 (게임이 소비 후 비운다)
 * world.hits      : 이번 스텝에서 DMG_MIN_SPEED 를 넘긴 충돌 횟수 (게임이 소비 후 0 으로)
 */
var P = (function () {
  'use strict';

  var nextId = 1;
  var DESTROY_WAKE_R = 120;              /* §5.6 파괴 시 깨우는 반경 */
  var LOW_SPEED_RESTITUTION_CUTOFF = 60; /* §5.4 |rvn| < 60 → e = 0 */

  /* ---------------------------------------------------------------- 월드/바디 */

  function createWorld() {
    return { bodies: [], destroyed: [], hits: 0 };
  }

  function makeBody(shape, o) {
    var isStatic = !!o.isStatic;
    var hp = isStatic ? Infinity : (typeof o.hp === 'number' ? o.hp : Infinity);
    return {
      id: nextId++,
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
      e: typeof o.e === 'number' ? o.e : 0.2,
      mu: typeof o.mu === 'number' ? o.mu : 0.5,
      isStatic: isStatic,
      sleeping: false,
      sleepTimer: 0,
      hp: hp,
      maxHp: hp,
      kind: o.kind || 'block',
      mat: o.mat || 'wood',
      dead: false,
      angle: 0,        /* 렌더 전용 (§12.3) */
      touched: false   /* 한 번이라도 접촉했는가 (폭탄새 자동 폭발 판정용) */
    };
  }

  function addBox(world, o) {
    var b = makeBody('box', o);
    b.hw = o.hw;
    b.hh = o.hh;
    if (!b.isStatic) {
      b.mass = (2 * o.hw * 2 * o.hh * o.density) / 1000;
      b.invMass = 1 / b.mass;
    }
    world.bodies.push(b);
    return b;
  }

  function addCircle(world, o) {
    var b = makeBody('circle', o);
    b.r = o.r;
    if (!b.isStatic) {
      b.mass = (Math.PI * o.r * o.r * o.density) / 1000;
      b.invMass = 1 / b.mass;
    }
    world.bodies.push(b);
    return b;
  }

  /* ---------------------------------------------------------------- 충돌 판정 (§5.3) */

  function halfW(b) { return b.shape === 'circle' ? b.r : b.hw; }
  function halfH(b) { return b.shape === 'circle' ? b.r : b.hh; }

  function boundsOverlap(a, b) {
    return Math.abs(b.x - a.x) < halfW(a) + halfW(b) &&
           Math.abs(b.y - a.y) < halfH(a) + halfH(b);
  }

  /* 원-원 */
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

  /* 원-박스 (a=원, b=박스). 법선은 a→b 방향 */
  function circleBox(a, b) {
    var qx = U.clamp(a.x, b.x - b.hw, b.x + b.hw);
    var qy = U.clamp(a.y, b.y - b.hh, b.y + b.hh);
    var dx = qx - a.x;
    var dy = qy - a.y;

    if (dx !== 0 || dy !== 0) {
      /* 원 중심이 박스 밖 */
      var d2 = dx * dx + dy * dy;
      if (d2 >= a.r * a.r) return null;
      var d = Math.sqrt(d2);
      return { a: a, b: b, nx: dx / d, ny: dy / d, depth: a.r - d };
    }

    /* 원 중심이 박스 안: 네 면까지 거리 중 최소인 축으로 밀어낸다 */
    var ex = b.hw - Math.abs(a.x - b.x);
    var ey = b.hh - Math.abs(a.y - b.y);
    var nx, ny, depth, s;
    if (ex < ey) {
      s = U.sign(b.x - a.x); if (s === 0) s = 1;
      nx = s; ny = 0; depth = ex + a.r;
    } else {
      s = U.sign(b.y - a.y); if (s === 0) s = 1;
      nx = 0; ny = s; depth = ey + a.r;
    }
    return { a: a, b: b, nx: nx, ny: ny, depth: depth };
  }

  /* 박스-박스 */
  function boxBox(a, b) {
    var ox = (a.hw + b.hw) - Math.abs(b.x - a.x);
    var oy = (a.hh + b.hh) - Math.abs(b.y - a.y);
    if (ox <= 0 || oy <= 0) return null;
    var s;
    if (ox < oy) {
      s = U.sign(b.x - a.x); if (s === 0) s = 1;
      return { a: a, b: b, nx: s, ny: 0, depth: ox };
    }
    s = U.sign(b.y - a.y); if (s === 0) s = 1;
    return { a: a, b: b, nx: 0, ny: s, depth: oy };
  }

  function collide(a, b) {
    if (a.shape === 'circle') {
      if (b.shape === 'circle') return circleCircle(a, b);
      return circleBox(a, b);
    }
    if (b.shape === 'circle') return circleBox(b, a);
    return boxBox(a, b);
  }

  /* ---------------------------------------------------------------- 슬립/깨움 (§5.6) */

  function wakeBody(b) {
    if (b.sleeping) {
      b.sleeping = false;
      b.sleepTimer = 0;
    }
  }

  /* src 가 깨어 있고 WAKE_SPEED 이상이면 dst 를 깨운다 */
  function tryWake(src, dst) {
    if (src.isStatic || src.sleeping || !dst.sleeping) return;
    var s2 = src.vx * src.vx + src.vy * src.vy;
    if (s2 >= C.WAKE_SPEED * C.WAKE_SPEED) wakeBody(dst);
  }

  /* 슬립 중인 바디는 솔버에서 정적처럼 취급한다(스택 안정화).
   * 빠른 바디는 접촉 수집 단계에서 상대를 먼저 깨우므로, 여기 도달하는 슬립 바디는
   * 느린(WAKE_SPEED 미만) 상대와만 접촉하고 있다. */
  function effInvMass(b) {
    return b.sleeping ? 0 : b.invMass;
  }

  /* ---------------------------------------------------------------- 피해 (§5.5) */

  function applyDamage(self, other, vn) {
    if (self.isStatic || self.dead || self.hp === Infinity) return;
    var otherMassEff = other.isStatic ? (self.mass * C.STATIC_MASS_FACTOR) : other.mass;
    var ratio = Math.min(C.DMG_MASS_CAP, otherMassEff / self.mass);
    var dmg = (vn - C.DMG_MIN_SPEED) * C.DMG_SCALE * ratio;
    self.hp -= dmg;
  }

  function destroyBody(world, b) {
    b.dead = true;
    world.destroyed.push(b);
    var bodies = world.bodies;
    for (var i = 0; i < bodies.length; i++) {
      var o = bodies[i];
      if (o === b || o.dead || o.isStatic) continue;
      if (U.dist(o.x, o.y, b.x, b.y) <= DESTROY_WAKE_R) wakeBody(o);
    }
  }

  /* ---------------------------------------------------------------- 임펄스 (§5.4) */

  function resolveContact(c) {
    var a = c.a, b = c.b, nx = c.nx, ny = c.ny;
    var rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (rvn > 0) return;                       /* 이미 분리 중 */
    var ia = effInvMass(a), ib = effInvMass(b);
    var inv = ia + ib;
    if (inv === 0) return;

    var e = Math.min(a.e, b.e);
    if (Math.abs(rvn) < LOW_SPEED_RESTITUTION_CUTOFF) e = 0;   /* 저속 반발 억제 */
    var j = -(1 + e) * rvn / inv;
    a.vx -= j * nx * ia; a.vy -= j * ny * ia;
    b.vx += j * nx * ib; b.vy += j * ny * ib;

    /* 마찰: 접선 t = (-ny, nx) */
    var tx = -ny, ty = nx;
    var rvt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
    var jt = -rvt / inv;
    var mu = Math.sqrt(a.mu * b.mu);
    var maxF = Math.abs(j) * mu;
    jt = U.clamp(jt, -maxF, maxF);
    a.vx -= jt * tx * ia; a.vy -= jt * ty * ia;
    b.vx += jt * tx * ib; b.vy += jt * ty * ib;
  }

  /* ---------------------------------------------------------------- 위치 보정 (§5.2-5) */

  function correctPosition(c) {
    var a = c.a, b = c.b;
    var ia = effInvMass(a), ib = effInvMass(b);
    var inv = ia + ib;
    if (inv === 0) return;
    var corr = Math.max(c.depth - C.PEN_SLOP, 0) / inv * C.PEN_PERCENT;
    a.x -= corr * ia * c.nx; a.y -= corr * ia * c.ny;
    b.x += corr * ib * c.nx; b.y += corr * ib * c.ny;
  }

  /* ---------------------------------------------------------------- 스텝 (§5.2) */

  function step(world, dt) {
    var bodies = world.bodies;
    var n = bodies.length;
    var i, j, k, it, a, b, c;

    /* 1) 적분 (정적/슬립 바디 제외) */
    for (i = 0; i < n; i++) {
      b = bodies[i];
      if (b.isStatic || b.sleeping || b.dead) continue;
      b.vy += C.GRAVITY * dt;
      b.vx -= b.vx * C.LINEAR_DAMP * dt;
      b.vy -= b.vy * C.LINEAR_DAMP * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }

    /* 2) 접촉 수집 (전체 쌍 O(n²)) */
    var contacts = [];
    for (i = 0; i < n; i++) {
      a = bodies[i];
      if (a.dead) continue;
      for (j = i + 1; j < n; j++) {
        b = bodies[j];
        if (b.dead) continue;
        if (a.isStatic && b.isStatic) continue;
        if (a.sleeping && b.sleeping) continue;
        if (!boundsOverlap(a, b)) continue;
        c = collide(a, b);
        if (!c) continue;
        contacts.push(c);
        a.touched = true;
        b.touched = true;
        tryWake(a, b);
        tryWake(b, a);
      }
    }

    /* 3) 피해 계산 (반복 전에 1회만) */
    for (k = 0; k < contacts.length; k++) {
      c = contacts[k];
      var vn = -((c.b.vx - c.a.vx) * c.nx + (c.b.vy - c.a.vy) * c.ny);
      if (vn > C.DMG_MIN_SPEED) {
        world.hits++;
        applyDamage(c.a, c.b, vn);
        applyDamage(c.b, c.a, vn);
      }
    }
    /* hp 소진 바디 파괴 (충돌 피해 + 외부에서 깎인 hp(폭발) 모두 여기서 판정) */
    var destroyedAny = false;
    for (i = 0; i < n; i++) {
      b = bodies[i];
      if (!b.dead && !b.isStatic && b.hp !== Infinity && b.hp <= 0) {
        destroyBody(world, b);
        destroyedAny = true;
      }
    }
    if (destroyedAny) {
      var live = [];
      for (k = 0; k < contacts.length; k++) {
        c = contacts[k];
        if (!c.a.dead && !c.b.dead) live.push(c);
      }
      contacts = live;
    }

    /* 4) 임펄스 반복 */
    for (it = 0; it < C.SOLVER_ITER; it++) {
      for (k = 0; k < contacts.length; k++) resolveContact(contacts[k]);
    }

    /* 5) 위치 보정 (반복 후 1회) */
    for (k = 0; k < contacts.length; k++) correctPosition(contacts[k]);

    /* 6) 슬립 갱신 */
    for (i = 0; i < n; i++) {
      b = bodies[i];
      if (b.isStatic || b.dead) continue;
      var s2 = b.vx * b.vx + b.vy * b.vy;
      if (b.sleeping) {
        if (s2 > C.WAKE_SPEED * C.WAKE_SPEED) {
          b.sleeping = false;
          b.sleepTimer = 0;
        } else {
          b.vx = 0;
          b.vy = 0;
        }
        continue;
      }
      if (s2 < C.SLEEP_SPEED * C.SLEEP_SPEED) b.sleepTimer += dt;
      else b.sleepTimer = 0;
      if (b.sleepTimer > C.SLEEP_TIME) {
        b.sleeping = true;
        b.sleepTimer = 0;
        b.vx = 0;
        b.vy = 0;
      }
    }

    /* 7) dead 바디 제거 */
    var kept = [];
    for (i = 0; i < n; i++) {
      if (!bodies[i].dead) kept.push(bodies[i]);
    }
    world.bodies = kept;
  }

  /* ---------------------------------------------------------------- 질의 (§5.7) */

  function queryRadius(world, x, y, r) {
    var out = [];
    var bodies = world.bodies;
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (b.dead) continue;
      if (U.dist(b.x, b.y, x, y) <= r) out.push(b);
    }
    return out;
  }

  return {
    createWorld: createWorld,
    addBox: addBox,
    addCircle: addCircle,
    step: step,
    queryRadius: queryRadius
  };
})();
