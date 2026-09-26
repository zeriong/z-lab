// physics.js — §5 회전 없는 임펄스 기반 2D 물리. 참조 전역: U, C
(function () {
  'use strict';

  var WAKE_ON_BREAK_R = 120;

  function createWorld() {
    return {
      bodies: [],
      nextId: 1,
      events: []        // {type:'hit', vn} | {type:'break', body}
    };
  }

  function baseBody(world, opts) {
    var isStatic = !!opts.isStatic;
    var b = {
      id: world.nextId++,
      shape: 'box',
      x: opts.x,
      y: opts.y,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      r: 0,
      hw: 0,
      hh: 0,
      mass: Infinity,
      invMass: 0,
      e: (opts.e !== undefined) ? opts.e : 0.2,
      mu: (opts.mu !== undefined) ? opts.mu : 0.5,
      isStatic: isStatic,
      sleeping: false,
      sleepTimer: 0,
      hp: (opts.hp !== undefined) ? opts.hp : Infinity,
      maxHp: (opts.hp !== undefined) ? opts.hp : Infinity,
      kind: opts.kind || 'block',
      mat: opts.mat || 'wood',
      dead: false,
      angle: 0,
      // 게임 계층에서 쓰는 보조 필드
      birdType: opts.birdType || null,
      color: opts.color || null,
      hasHit: false
    };
    return b;
  }

  function addBox(world, opts) {
    var b = baseBody(world, opts);
    b.shape = 'box';
    b.hw = opts.hw;
    b.hh = opts.hh;
    if (!b.isStatic) {
      var density = (opts.density !== undefined) ? opts.density : 1.0;
      b.mass = (2 * b.hw * 2 * b.hh * density) / 1000;
      b.invMass = 1 / b.mass;
    }
    world.bodies.push(b);
    return b;
  }

  function addCircle(world, opts) {
    var b = baseBody(world, opts);
    b.shape = 'circle';
    b.r = opts.r;
    if (!b.isStatic) {
      var density = (opts.density !== undefined) ? opts.density : 1.0;
      b.mass = (Math.PI * b.r * b.r * density) / 1000;
      b.invMass = 1 / b.mass;
    }
    world.bodies.push(b);
    return b;
  }

  function wake(b) {
    if (b.isStatic) return;
    b.sleeping = false;
    b.sleepTimer = 0;
  }

  // ---------- 5.3 충돌 판정 3종 ----------

  function circleCircle(a, b) {
    var d = U.dist(a.x, a.y, b.x, b.y);
    var rs = a.r + b.r;
    if (d >= rs) return null;
    if (d === 0) {
      return { a: a, b: b, nx: 0, ny: -1, depth: rs };
    }
    return { a: a, b: b, nx: (b.x - a.x) / d, ny: (b.y - a.y) / d, depth: rs - d };
  }

  // a = 원, b = 박스
  function circleBox(a, b) {
    var qx = U.clamp(a.x, b.x - b.hw, b.x + b.hw);
    var qy = U.clamp(a.y, b.y - b.hh, b.y + b.hh);
    if (qx !== a.x || qy !== a.y) {
      var d = U.dist(a.x, a.y, qx, qy);
      if (d >= a.r) return null;
      if (d === 0) {
        return { a: a, b: b, nx: 0, ny: -1, depth: a.r };
      }
      return { a: a, b: b, nx: (qx - a.x) / d, ny: (qy - a.y) / d, depth: a.r - d };
    }
    // 원 중심이 박스 안
    var dx = b.hw - Math.abs(a.x - b.x);
    var dy = b.hh - Math.abs(a.y - b.y);
    if (dx < dy) {
      var sx = U.sign(b.x - a.x) || 1;   // 원(a)에서 박스 중심(b)으로 향하는 방향
      return { a: a, b: b, nx: sx, ny: 0, depth: dx + a.r };
    }
    var sy = U.sign(b.y - a.y) || -1;
    return { a: a, b: b, nx: 0, ny: sy, depth: dy + a.r };
  }

  function boxBox(a, b) {
    var ox = (a.hw + b.hw) - Math.abs(b.x - a.x);
    if (ox <= 0) return null;
    var oy = (a.hh + b.hh) - Math.abs(b.y - a.y);
    if (oy <= 0) return null;
    if (ox < oy) {
      return { a: a, b: b, nx: U.sign(b.x - a.x) || 1, ny: 0, depth: ox };
    }
    return { a: a, b: b, nx: 0, ny: U.sign(b.y - a.y) || -1, depth: oy };
  }

  function collide(a, b) {
    if (a.shape === 'circle' && b.shape === 'circle') return circleCircle(a, b);
    if (a.shape === 'circle' && b.shape === 'box') return circleBox(a, b);
    if (a.shape === 'box' && b.shape === 'circle') {
      var c = circleBox(b, a);
      if (!c) return null;
      // a→b 방향으로 뒤집기
      return { a: a, b: b, nx: -c.nx, ny: -c.ny, depth: c.depth };
    }
    return boxBox(a, b);
  }

  // ---------- 5.5 피해 ----------

  function applyDamage(self, other, vn, world) {
    if (self.hp === Infinity || self.isStatic) return;
    var otherMassEff = other.isStatic ? (self.mass * C.STATIC_MASS_FACTOR) : other.mass;
    var ratio = Math.min(C.DMG_MASS_CAP, otherMassEff / self.mass);
    var dmg = (vn - C.DMG_MIN_SPEED) * C.DMG_SCALE * ratio;
    self.hp -= dmg;
    if (self.hp <= 0 && !self.dead) {
      self.dead = true;
      world._destroyQueue.push(self);
    }
  }

  // ---------- 5.4 임펄스 ----------

  function solveContact(c) {
    var a = c.a, b = c.b;
    var nx = c.nx, ny = c.ny;
    var rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (rvn > 0) return;
    var inv = a.invMass + b.invMass;
    if (inv === 0) return;
    var e = Math.min(a.e, b.e);
    if (Math.abs(rvn) < 60) e = 0;   // 저속 반발 억제 → 스택 안정화
    var j = -(1 + e) * rvn / inv;
    a.vx -= j * nx * a.invMass; a.vy -= j * ny * a.invMass;
    b.vx += j * nx * b.invMass; b.vy += j * ny * b.invMass;

    // 마찰
    var tx = -ny, ty = nx;
    var rvt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
    var jt = -rvt / inv;
    var mu = Math.sqrt(a.mu * b.mu);
    var maxF = Math.abs(j) * mu;
    jt = U.clamp(jt, -maxF, maxF);
    a.vx -= jt * tx * a.invMass; a.vy -= jt * ty * a.invMass;
    b.vx += jt * tx * b.invMass; b.vy += jt * ty * b.invMass;
  }

  // ---------- 5.2 스텝 ----------

  function step(world, dt) {
    var bodies = world.bodies;
    var i, j, n = bodies.length;
    world._destroyQueue = [];

    // 1) 적분
    for (i = 0; i < n; i++) {
      var b = bodies[i];
      if (b.isStatic || b.sleeping) continue;
      b.vy += C.GRAVITY * dt;
      b.vx -= b.vx * C.LINEAR_DAMP * dt;
      b.vy -= b.vy * C.LINEAR_DAMP * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }

    // 2) 접촉 수집
    var contacts = [];
    for (i = 0; i < n; i++) {
      var A = bodies[i];
      if (A.dead) continue;
      for (j = i + 1; j < n; j++) {
        var B = bodies[j];
        if (B.dead) continue;
        if (A.isStatic && B.isStatic) continue;
        if (A.sleeping && B.sleeping) continue;
        var c = collide(A, B);
        if (!c) continue;
        contacts.push(c);
        // 깨우기
        var sa = A.vx * A.vx + A.vy * A.vy;
        var sb = B.vx * B.vx + B.vy * B.vy;
        var w2 = C.WAKE_SPEED * C.WAKE_SPEED;
        if (!A.sleeping && sa >= w2 && B.sleeping) wake(B);
        if (!B.sleeping && sb >= w2 && A.sleeping) wake(A);
        if (A.kind === 'bird') A.hasHit = true;
        if (B.kind === 'bird') B.hasHit = true;
      }
    }

    // 3) 피해 계산 (1회)
    for (i = 0; i < contacts.length; i++) {
      var ct = contacts[i];
      var vn = -((ct.b.vx - ct.a.vx) * ct.nx + (ct.b.vy - ct.a.vy) * ct.ny);
      if (vn > C.DMG_MIN_SPEED) {
        applyDamage(ct.a, ct.b, vn, world);
        applyDamage(ct.b, ct.a, vn, world);
        world.events.push({ type: 'hit', vn: vn });
      }
    }

    // 4) 임펄스 반복
    for (var it = 0; it < C.SOLVER_ITER; it++) {
      for (i = 0; i < contacts.length; i++) {
        solveContact(contacts[i]);
      }
    }

    // 5) 위치 보정 (1회)
    for (i = 0; i < contacts.length; i++) {
      var pc = contacts[i];
      var invSum = pc.a.invMass + pc.b.invMass;
      if (invSum === 0) continue;
      var corr = Math.max(pc.depth - C.PEN_SLOP, 0) / invSum * C.PEN_PERCENT;
      pc.a.x -= corr * pc.a.invMass * pc.nx; pc.a.y -= corr * pc.a.invMass * pc.ny;
      pc.b.x += corr * pc.b.invMass * pc.nx; pc.b.y += corr * pc.b.invMass * pc.ny;
    }

    // 6) 슬립 갱신
    var ss2 = C.SLEEP_SPEED * C.SLEEP_SPEED;
    for (i = 0; i < n; i++) {
      var sbdy = bodies[i];
      if (sbdy.isStatic || sbdy.sleeping) continue;
      var sp2 = sbdy.vx * sbdy.vx + sbdy.vy * sbdy.vy;
      if (sp2 < ss2) sbdy.sleepTimer += dt; else sbdy.sleepTimer = 0;
      if (sbdy.sleepTimer > C.SLEEP_TIME) {
        sbdy.sleeping = true;
        sbdy.vx = 0;
        sbdy.vy = 0;
      }
    }

    // 파괴 처리: 반경 120 내 깨우기 + 이벤트
    var dq = world._destroyQueue;
    for (i = 0; i < dq.length; i++) {
      var dead = dq[i];
      for (j = 0; j < n; j++) {
        var nb = bodies[j];
        if (nb === dead || nb.isStatic) continue;
        if (U.dist(dead.x, dead.y, nb.x, nb.y) <= WAKE_ON_BREAK_R) wake(nb);
      }
      world.events.push({ type: 'break', body: dead });
    }

    // 7) dead 바디 제거
    for (i = bodies.length - 1; i >= 0; i--) {
      if (bodies[i].dead) bodies.splice(i, 1);
    }
  }

  // ---------- 5.7 ----------

  function queryRadius(world, x, y, r) {
    var out = [];
    var bodies = world.bodies;
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (U.dist(x, y, b.x, b.y) <= r) out.push(b);
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
