window.AB = window.AB || {};

// Matter.js 엔진 래퍼 + 엔티티 팩토리 + 피해/제거 (계획서 §8.6, §11.1~11.3)
// 규칙:
//  - 스테이지마다 새 인스턴스를 만든다. 이전 인스턴스는 dispose().
//  - 충돌 콜백 안에서는 body를 제거하지 않는다(scheduleRemove로 예약 → afterStep에서 처리).
//  - 새는 isStatic을 쓰지 않는다. 발사 순간에만 body를 만든다.
//  - 블록 제거 후에는 wakeAll()로 잠든 body를 깨운다(지지대가 사라진 블록이 공중에 뜨는 것 방지).
AB.World = class World {
  constructor() {
    this.engine = Matter.Engine.create({ enableSleeping: true });   // 중력 기본값 {x:0, y:1, scale:0.001} 유지
    this.entities = [];      // 모든 엔티티(terrain 포함)
    this.toRemove = [];      // 스텝 후 제거 예약
    this.events = [];        // { type: 'pigKilled'|'blockDestroyed', x, y, material?, size? }
    this.stepCount = 0;
    this._collisionHandler = (e) => this._onCollision(e.pairs);
    Matter.Events.on(this.engine, 'collisionStart', this._collisionHandler);
    this.addGround();
  }

  // ---- 엔티티 생성 -------------------------------------------------------

  // body 생성 → Composite.add → entity 생성 → body.gameEntity = entity → entities.push
  _register(body, entity) {
    Matter.Composite.add(this.engine.world, body);
    entity.body = body;
    body.gameEntity = entity;
    this.entities.push(entity);
    return entity;
  }

  addGround() {
    const C = AB.CONFIG;
    const thickness = C.H - C.GROUND_Y;                       // 80
    const body = Matter.Bodies.rectangle(
      C.W / 2, C.GROUND_Y + thickness / 2, C.W, thickness,    // 중심 (640, 680), 1280×80
      {
        isStatic: true,
        friction: C.GROUND_PHYS.friction,
        restitution: C.GROUND_PHYS.restitution,
        label: 'ground'
      }
    );
    return this._register(body, {
      kind: 'terrain', hp: Infinity, maxHp: Infinity, dead: false, w: C.W, h: thickness
    });
  }

  addTerrain(t) {
    const C = AB.CONFIG;
    const body = Matter.Bodies.rectangle(t.x, t.y, t.w, t.h, {
      isStatic: true,
      friction: C.GROUND_PHYS.friction,
      restitution: C.GROUND_PHYS.restitution,
      label: 'terrain'
    });
    return this._register(body, {
      kind: 'terrain', hp: Infinity, maxHp: Infinity, dead: false, w: t.w, h: t.h
    });
  }

  addBlock(b) {
    const C = AB.CONFIG;
    const size = C.BLOCK_SIZES[b.s];
    const mat = C.MATERIALS[b.t];
    const body = Matter.Bodies.rectangle(b.x, b.y, size[0], size[1], {
      density: mat.density,
      friction: mat.friction,
      restitution: mat.restitution,
      label: 'block'
    });
    return this._register(body, {
      kind: 'block', material: b.t, shape: b.s, hp: mat.hp, maxHp: mat.hp, dead: false
    });
  }

  addPig(p) {
    const C = AB.CONFIG;
    const def = C.PIGS[p.size];
    const body = Matter.Bodies.circle(p.x, p.y, def.r, {
      density: C.PIG_PHYS.density,
      friction: C.PIG_PHYS.friction,
      restitution: C.PIG_PHYS.restitution,
      label: 'pig'
    });
    return this._register(body, {
      kind: 'pig', size: p.size, hp: def.hp, maxHp: def.hp, dead: false
    });
  }

  // Composite.add 후에 setVelocity 한다(생성 직후 deltaTime 기본값이 1000/60이라 정확히 동작).
  addBird(type, x, y, velocity) {
    const C = AB.CONFIG;
    const body = Matter.Bodies.circle(x, y, C.BIRD.radius, {
      density: C.BIRD.density,
      friction: C.BIRD.friction,
      restitution: C.BIRD.restitution,
      frictionAir: C.BIRD.frictionAir,
      label: 'bird'
    });
    const entity = this._register(body, {
      kind: 'bird', birdType: type, abilityUsed: false, hitAtStep: null,
      hp: Infinity, maxHp: Infinity, dead: false
    });
    Matter.Body.setVelocity(body, { x: velocity.x, y: velocity.y });
    return entity;
  }

  // ---- 스텝 ---------------------------------------------------------------

  step() {
    if (!this.engine) return;
    Matter.Engine.update(this.engine, AB.CONFIG.STEP_MS);
    this.stepCount++;
    this.afterStep();
  }

  afterStep() {
    if (!this.engine) return;
    const C = AB.CONFIG;
    let needWake = false;

    // 1) 제거 예약 처리
    if (this.toRemove.length) {
      const list = this.toRemove.slice();
      this.toRemove.length = 0;
      for (const e of list) {
        if (e.kind === 'block') needWake = true;
        this._detach(e);
      }
    }

    // 2) 경계 밖 제거 (복사본 순회)
    const snapshot = this.entities.slice();
    for (const e of snapshot) {
      if (e.kind === 'terrain' || e.dead || !e.body) continue;
      const p = e.body.position;
      if (p.y > C.BOUNDS.maxY || p.x < C.BOUNDS.minX || p.x > C.BOUNDS.maxX) {
        if (e.kind === 'pig') {
          this.events.push({ type: 'pigKilled', x: p.x, y: p.y, size: e.size });
        }
        if (e.kind === 'block') needWake = true;
        e.dead = true;
        this._detach(e);
      }
    }

    if (needWake) this.wakeAll();
  }

  // world와 entities에서 실제로 떼어낸다(내부용).
  _detach(entity) {
    if (!entity) return;
    if (this.engine && entity.body) {
      Matter.Composite.remove(this.engine.world, entity.body);
    }
    const idx = this.entities.indexOf(entity);
    if (idx >= 0) this.entities.splice(idx, 1);
  }

  // 스텝 밖에서 호출될 때 사용(턴 종료 시 새 제거, 폭발한 봄).
  remove(entity) {
    if (!entity) return;
    entity.dead = true;
    const qi = this.toRemove.indexOf(entity);
    if (qi >= 0) this.toRemove.splice(qi, 1);
    this._detach(entity);
    // 새 위에 얹혀 있던 블록이 잠든 채 공중에 남지 않도록 깨운다.
    if (this.engine && entity.kind !== 'terrain') this.wakeAll();
  }

  // 충돌 콜백 안에서는 이것만 사용.
  scheduleRemove(entity) {
    if (!entity || entity.dead) return;
    entity.dead = true;
    this.toRemove.push(entity);
  }

  wakeAll() {
    if (!this.engine) return;
    const bodies = Matter.Composite.allBodies(this.engine.world);
    for (const b of bodies) {
      if (!b.isStatic) Matter.Sleeping.set(b, false);
    }
  }

  // ---- 피해/폭발 ---------------------------------------------------------

  damage(entity, amount) {
    if (!entity || entity.dead) return;
    if (entity.kind !== 'block' && entity.kind !== 'pig') return;
    if (!(amount > 0)) return;
    entity.hp -= amount;
    if (entity.hp <= 0) {
      const p = entity.body.position;
      if (entity.kind === 'pig') {
        this.events.push({ type: 'pigKilled', x: p.x, y: p.y, size: entity.size });
      } else {
        this.events.push({ type: 'blockDestroyed', x: p.x, y: p.y, material: entity.material });
      }
      this.scheduleRemove(entity);
    }
  }

  // §11.3 폭발. 새 자신은 제외. 가림 판정 없음(벽 관통).
  explode(cx, cy) {
    if (!this.engine) return;
    const EX = AB.CONFIG.EXPLOSION;
    const center = { x: cx, y: cy };
    const bodies = this.dynamicBodies();
    for (const b of bodies) {
      const e = b.gameEntity;
      if (e && e.kind === 'bird') continue;
      const diff = Matter.Vector.sub(b.position, center);
      const d = Matter.Vector.magnitude(diff);
      if (d >= EX.radius) continue;
      const k = 1 - d / EX.radius;
      const dir = d < 1 ? { x: 0, y: -1 } : Matter.Vector.normalise(diff);
      Matter.Sleeping.set(b, false);
      const v = Matter.Body.getVelocity(b);
      Matter.Body.setVelocity(b, Matter.Vector.add(v, Matter.Vector.mult(dir, EX.impulse * k)));
      if (e && (e.kind === 'block' || e.kind === 'pig')) {
        this.damage(e, EX.damage * k);
      }
    }
  }

  // §11.1 충돌 피해. 여기서는 damage()와 hitAtStep 기록만 하고 body 제거는 하지 않는다.
  _onCollision(pairs) {
    if (!this.engine || !pairs) return;
    const D = AB.CONFIG.DAMAGE;
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      const A = pair.bodyA, B = pair.bodyB;
      if (!A || !B) continue;
      const ea = A.gameEntity || null;
      const eb = B.gameEntity || null;
      if (!ea && !eb) continue;

      if (ea && ea.kind === 'bird' && ea.hitAtStep == null) ea.hitAtStep = this.stepCount;
      if (eb && eb.kind === 'bird' && eb.hitAtStep == null) eb.hitAtStep = this.stepCount;

      // collisionStart 시점의 속도 = 충돌 해소 전(접근) 속도. 잠든/정적 body는 (0,0).
      const vA = Matter.Body.getVelocity(A);
      const vB = Matter.Body.getVelocity(B);
      const rvx = vA.x - vB.x, rvy = vA.y - vB.y;
      const rel = Math.sqrt(rvx * rvx + rvy * rvy);
      if (rel <= D.threshold) continue;

      const base = (rel - D.threshold) * D.scale;
      const massFactor = (body) => (body.isStatic ? 1 : Math.min(body.mass, D.massCap));

      if (ea && (ea.kind === 'block' || ea.kind === 'pig')) this.damage(ea, base * massFactor(B));
      if (eb && (eb.kind === 'block' || eb.kind === 'pig')) this.damage(eb, base * massFactor(A));
    }
  }

  // ---- 조회 ---------------------------------------------------------------

  dynamicBodies() {
    if (!this.engine) return [];
    return Matter.Composite.allBodies(this.engine.world).filter((b) => !b.isStatic);
  }

  pigs() {
    return this.entities.filter((e) => e.kind === 'pig' && !e.dead);
  }

  allSettled() {
    const th = AB.CONFIG.TURN.settleSpeed;
    return this.dynamicBodies().every((b) => b.isSleeping || b.speed < th);
  }

  // 로드 직후 PRESETTLE_STEPS번 돌려 적층을 안정시킨 뒤 모든 동적 body를 강제 수면. stepCount는 0 유지.
  presettle() {
    if (!this.engine) return;
    const C = AB.CONFIG;
    for (let i = 0; i < C.PRESETTLE_STEPS; i++) {
      Matter.Engine.update(this.engine, C.STEP_MS);
    }
    this.afterStep();
    this.events = [];
    for (const b of this.dynamicBodies()) Matter.Sleeping.set(b, true);
  }

  drainEvents() {
    const ev = this.events;
    this.events = [];
    return ev;
  }

  dispose() {
    if (this.engine) {
      try { Matter.Events.off(this.engine); } catch (e) { /* ignore */ }
    }
    this.entities = [];
    this.toRemove = [];
    this.events = [];
    this.engine = null;
  }
};
