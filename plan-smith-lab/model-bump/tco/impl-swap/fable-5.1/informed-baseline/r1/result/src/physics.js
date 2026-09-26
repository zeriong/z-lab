// physics.js — §5 회전 없는 임펄스 기반 2D 물리. U, C 참조.
// 물리 스텝 안에서는 Math.random() 을 쓰지 않는다.
(function () {
  'use strict';

  // ---------------------------------------------------------------
  // 월드 / 바디 생성
  // ---------------------------------------------------------------
  function createWorld() {
    return {
      bodies: [],
      nextId: 1,
      // 게임 계층이 스텝 후 소비하는 이벤트 큐
      //  { type:'hit', a, b, vn }  /  { type:'break', body }
      events: []
    };
  }

  function baseBody(world, opts) {
    var isStatic = !!opts.isStatic;
    return {
      id: world.nextId++,
      shape: opts.shape,
      x: opts.x,
      y: opts.y,
      vx: 0,
      vy: 0,
      r: 0,
      hw: 0,
      hh: 0,
      mass: Infinity,
      invMass: 0,
      e: opts.e,
      mu: opts.mu,
      isStatic: isStatic,
      sleeping: false,
      sleepTimer: 0,
      hp: isStatic ? Infinity : opts.hp,
      maxHp: isStatic ? Infinity : opts.hp,
      kind: opts.kind,
      mat: opts.mat,
      dead: false,
      angle: 0,        // 렌더 전용 (§12.3)
      touched: false,  // 접촉 경험 여부 (폭탄새 자동 폭발용)
      bird: opts.bird || null // 새 종류 키 (kind === 'bird' 일 때)
    };
  }

  // opts: { x, y, hw, hh, kind, mat, isStatic, density, hp, e, mu, bird }
  function addBox(world, opts) {
    var b = baseBody(world, {
      shape: 'box', x: opts.x, y: opts.y, kind: opts.kind, mat: opts.mat,
      isStatic: opts.isStatic, hp: opts.hp, e: opts.e, mu: opts.mu, bird: opts.bird
    });
    b.hw = opts.hw;
    b.hh = opts.hh;
    if (!b.isStatic) {
      b.mass = (2 * b.hw * 2 * b.hh * opts.density) / 1000;
      b.invMass = 1 / b.mass;
    }
    world.bodies.push(b);
    return b;
  }

  // opts: { x, y, r, kind, mat, isStatic, density, hp, e, mu, bird }
  function addCircle(world, opts) {
    var b = baseBody(world, {
      shape: 'circle', x: opts.x, y: opts.y, kind: opts.kind, mat: opts.mat,
      isStatic: opts.isStatic, hp: opts.hp, e: opts.e, mu: opts.mu, bird: opts.bird
    });
    b.r = opts.r;
    if (!b.isStatic) {
      b.mass = (Math.PI * b.r * b.r * opts.density) / 1000;
      b.invMass = 1 / b.mass;
    }
    world.bodies.push(b);
    return b;
  }

  // ---------------------------------------------------------------
  // 충돌 판정 3종 (§5.3). 접촉 {a, b, nx, ny, depth}, n 은 a→b 단위벡터.
  // ---------------------------------------------------------------
  function circleCircle(a, b) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    var rs = a.r + b.r;
    if (d >= rs) return null;
    if (d === 0) return { a: a, b: b, nx: 0, ny: -1, depth: rs };
    return { a: a, b: b, nx: dx / d, ny: dy / d, depth: rs - d };
  }

  // a = 원, b = 박스
  function circleBox(a, b) {
    var qx = U.clamp(a.x, b.x - b.hw, b.x + b.hw);
    var qy = U.clamp(a.y, b.y - b.hh, b.y + b.hh);
    if (qx !== a.x || qy !== a.y) {
      // 원 중심이 박스 밖
      var dx = qx - a.x;
      var dy = qy - a.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d >= a.r) return null;
      if (d === 0) return { a: a, b: b, nx: 0, ny: -1, depth: a.r };
      return { a: a, b: b, nx: dx / d, ny: dy / d, depth: a.r - d };
    }
    // 원 중심이 박스 안: 네 면까지 거리 중 최소 축으로 밀어낸다
    var ddx = b.hw - Math.abs(a.x - b.x);
    var ddy = b.hh - Math.abs(a.y - b.y);
    if (ddx < ddy) {
      var sx = a.x >= b.x ? 1 : -1; // 원이 중심에서 멀어지는 방향
      return { a: a, b: b, nx: -sx, ny: 0, depth: ddx + a.r };
    }
    var sy = a.y >= b.y ? 1 : -1;
    return { a: a, b: b, nx: 0, ny: -sy, depth: ddy + a.r };
  }

  function boxBox(a, b) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var ox = (a.hw + b.hw) - Math.abs(dx);
    if (ox <= 0) return null;
    var oy = (a.hh + b.hh) - Math.abs(dy);
    if (oy <= 0) return null;
    if (ox < oy) {
      var sx = U.sign(dx) || 1;
      return { a: a, b: b, nx: sx, ny: 0, depth: ox };
    }
    var sy = U.sign(dy) || 1;
    return { a: a, b: b, nx: 0, ny: sy, depth: oy };
  }

  function collide(a, b) {
    if (a.shape === 'circle') {
      if (b.shape === 'circle') return circleCircle(a, b);
      return circleBox(a, b);
    }
    if (b.shape === 'circle') return circleBox(b, a); // 원을 a 로 두어 법선 방향 유지
    return boxBox(a, b);
  }

  // ---------------------------------------------------------------
  // 슬립 / 깨움
  // ---------------------------------------------------------------
  function wake(b) {
    if (b.isStatic) return;
    b.sleeping = false;
    b.sleepTimer = 0;
  }

  // (x,y) 반경 r 안의 슬립 바디를 깨우고, 깨어난 바디를 기점으로 다시 반경 r 을
  // 전파한다(연결된 구조물 전체가 깨어나도록). 이미 깨어 있는 바디는 전파 기점이 아니다.
  function wakeRadius(world, x, y, r) {
    var r2 = r * r;
    var queue = [{ x: x, y: y }];
    while (queue.length) {
      var pt = queue.shift();
      for (var i = 0; i < world.bodies.length; i++) {
        var b = world.bodies[i];
        if (b.isStatic || !b.sleeping) continue;
        var dx = b.x - pt.x;
        var dy = b.y - pt.y;
        if (dx * dx + dy * dy <= r2) {
          wake(b);
          queue.push({ x: b.x, y: b.y });
        }
      }
    }
  }

  function speed2(b) {
    return b.vx * b.vx + b.vy * b.vy;
  }

  // ---------------------------------------------------------------
  // 피해 (§5.5)
  // ---------------------------------------------------------------
  function applyDamage(world, self, other, vn) {
    if (self.isStatic || self.hp === Infinity || self.dead) return;
    var otherMassEff = other.isStatic ? (self.mass * C.STATIC_MASS_FACTOR) : other.mass;
    var ratio = Math.min(C.DMG_MASS_CAP, otherMassEff / self.mass);
    var dmg = (vn - C.DMG_MIN_SPEED) * C.DMG_SCALE * ratio;
    self.hp -= dmg;
    if (self.hp <= 0 && self.hp !== Infinity) {
      self.dead = true; // 파괴 큐: 7단계에서 제거
      world.events.push({ type: 'break', body: self });
      wakeRadius(world, self.x, self.y, 120);
    }
  }

  // ---------------------------------------------------------------
  // 스텝 (§5.2) — 고정 dt 로 호출된다
  // ---------------------------------------------------------------
  function step(world, dt) {
    var bodies = world.bodies;
    var i, j, a, b, c, n = bodies.length;

    // 1) 적분 (정적/슬립 바디 제외)
    for (i = 0; i < n; i++) {
      a = bodies[i];
      if (a.isStatic || a.sleeping) continue;
      a.vy += C.GRAVITY * dt;
      a.vx -= a.vx * C.LINEAR_DAMP * dt;
      a.vy -= a.vy * C.LINEAR_DAMP * dt;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
    }

    // 2) 접촉 수집 (전체 쌍)
    var contacts = [];
    var wake2 = C.WAKE_SPEED * C.WAKE_SPEED;
    for (i = 0; i < n; i++) {
      a = bodies[i];
      if (a.dead) continue;
      for (j = i + 1; j < n; j++) {
        b = bodies[j];
        if (b.dead) continue;
        if (a.isStatic && b.isStatic) continue;
        if (a.sleeping && b.sleeping) continue;
        if ((a.isStatic || a.sleeping) && (b.isStatic || b.sleeping)) continue;
        c = collide(a, b);
        if (!c) continue;
        // 한쪽이 깨어 있고 WAKE_SPEED 이상이면 상대를 깨운다
        if (!a.sleeping && !a.isStatic && speed2(a) >= wake2) wake(b);
        if (!b.sleeping && !b.isStatic && speed2(b) >= wake2) wake(a);
        a.touched = true;
        b.touched = true;
        contacts.push(c);
      }
    }

    // 3) 피해 계산 (반복 전에 1회)
    for (i = 0; i < contacts.length; i++) {
      c = contacts[i];
      a = c.a; b = c.b;
      var vn = -((b.vx - a.vx) * c.nx + (b.vy - a.vy) * c.ny);
      if (vn > C.DMG_MIN_SPEED) {
        world.events.push({ type: 'hit', a: a, b: b, vn: vn });
        applyDamage(world, a, b, vn);
        applyDamage(world, b, a, vn);
      }
    }

    // 4) 임펄스 반복 (§5.4)
    for (var it = 0; it < C.SOLVER_ITER; it++) {
      for (i = 0; i < contacts.length; i++) {
        c = contacts[i];
        a = c.a; b = c.b;
        var nx = c.nx, ny = c.ny;
        var rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rvn > 0) continue; // 이미 분리 중
        var inv = a.invMass + b.invMass;
        if (inv === 0) continue;
        var e = Math.min(a.e, b.e);
        if (Math.abs(rvn) < 60) e = 0; // 저속 반발 억제 → 스택 안정화
        var jn = -(1 + e) * rvn / inv;
        a.vx -= jn * nx * a.invMass; a.vy -= jn * ny * a.invMass;
        b.vx += jn * nx * b.invMass; b.vy += jn * ny * b.invMass;

        // 마찰: 접선 t = (-ny, nx)
        var tx = -ny, ty = nx;
        var rvt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
        var jt = -rvt / inv;
        var mu = Math.sqrt(a.mu * b.mu);
        var jmax = Math.abs(jn) * mu;
        jt = U.clamp(jt, -jmax, jmax);
        a.vx -= jt * tx * a.invMass; a.vy -= jt * ty * a.invMass;
        b.vx += jt * tx * b.invMass; b.vy += jt * ty * b.invMass;
      }
    }

    // 5) 위치 보정 (반복 후 1회)
    for (i = 0; i < contacts.length; i++) {
      c = contacts[i];
      a = c.a; b = c.b;
      var invS = a.invMass + b.invMass;
      if (invS === 0) continue;
      var corr = Math.max(c.depth - C.PEN_SLOP, 0) / invS * C.PEN_PERCENT;
      a.x -= corr * a.invMass * c.nx; a.y -= corr * a.invMass * c.ny;
      b.x += corr * b.invMass * c.nx; b.y += corr * b.invMass * c.ny;
    }

    // 6) 슬립 갱신 (§5.6)
    var sleep2 = C.SLEEP_SPEED * C.SLEEP_SPEED;
    for (i = 0; i < n; i++) {
      a = bodies[i];
      if (a.isStatic) continue;
      if (speed2(a) < sleep2) {
        a.sleepTimer += dt;
        if (a.sleeping) { a.vx = 0; a.vy = 0; }
      } else {
        a.sleepTimer = 0;
        a.sleeping = false; // 슬립 중 임펄스를 받아 움직이면 깨운다
      }
      if (!a.sleeping && a.sleepTimer > C.SLEEP_TIME) {
        a.sleeping = true;
        a.vx = 0;
        a.vy = 0;
      }
    }

    // 7) dead 플래그 바디 제거
    var alive = [];
    for (i = 0; i < n; i++) {
      if (!bodies[i].dead) alive.push(bodies[i]);
    }
    world.bodies = alive;
  }

  // ---------------------------------------------------------------
  // §5.7 반경 질의 (중심 거리 근사)
  // ---------------------------------------------------------------
  function queryRadius(world, x, y, r) {
    var out = [];
    var r2 = r * r;
    for (var i = 0; i < world.bodies.length; i++) {
      var b = world.bodies[i];
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
