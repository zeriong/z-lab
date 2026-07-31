/* physics.js — Matter.js 래퍼.
 * 책임: 월드 생성/폐기(멱등), 바디 팩토리, 충격량→데미지 변환, 정지 감지.
 * 여기 밖에서는 Matter.* 를 직접 부르지 않는다(교체 지점 1곳 유지).
 */
(function (AB) {
  'use strict';

  var CFG = AB.CFG;
  var M = window.Matter;

  var Physics = {};

  Physics.available = function () {
    return typeof window.Matter !== 'undefined';
  };

  /* ---------- 월드 생성 / 폐기 (A5xA1: 다시하기 = 폐기 후 재생성) ---------- */

  Physics.createEngine = function () {
    M = window.Matter;
    var engine = M.Engine.create({
      positionIterations: CFG.POSITION_ITERATIONS,
      velocityIterations: CFG.VELOCITY_ITERATIONS,
      constraintIterations: CFG.CONSTRAINT_ITERATIONS,
      enableSleeping: false
    });
    engine.gravity.x = 0;
    engine.gravity.y = CFG.GRAVITY_Y;
    engine.gravity.scale = CFG.GRAVITY_SCALE;
    return engine;
  };

  // 엔진 인스턴스 자체를 버린다 — 바디 누수가 구조적으로 불가능한 형태.
  Physics.destroyEngine = function (engine) {
    if (!engine) return;
    try {
      M.Events.off(engine);
      M.Composite.clear(engine.world, false, true);
      M.Engine.clear(engine);
    } catch (e) { /* 이미 정리됨 */ }
  };

  Physics.add = function (engine, bodies) {
    M.Composite.add(engine.world, bodies);
  };

  Physics.remove = function (engine, body) {
    M.Composite.remove(engine.world, body, true);
  };

  Physics.bodyCount = function (engine) {
    return M.Composite.allBodies(engine.world).length;
  };

  Physics.allBodies = function (engine) {
    return M.Composite.allBodies(engine.world);
  };

  Physics.step = function (engine) {
    M.Engine.update(engine, CFG.STEP_MS);
  };

  Physics.onCollisionStart = function (engine, handler) {
    M.Events.on(engine, 'collisionStart', handler);
  };

  Physics.setVelocity = function (body, vx, vy) {
    M.Body.setVelocity(body, { x: vx, y: vy });
  };

  Physics.setPosition = function (body, x, y) {
    M.Body.setPosition(body, { x: x, y: y });
  };

  Physics.setStatic = function (body, isStatic) {
    M.Body.setStatic(body, isStatic);
  };

  /* ---------- 바디 팩토리 ---------- */

  Physics.makeGround = function (groundTop) {
    var h = CFG.GROUND_THICKNESS;
    var body = M.Bodies.rectangle(
      CFG.WIDTH / 2, groundTop + h / 2, CFG.WIDTH + 400, h,
      { isStatic: true, friction: 0.85, restitution: 0.02, label: 'ground' }
    );
    body.gameKind = 'ground';
    return body;
  };

  Physics.makeWalls = function () {
    var left = M.Bodies.rectangle(-40, CFG.HEIGHT / 2, 80, CFG.HEIGHT * 3,
      { isStatic: true, friction: 0.4, label: 'wall' });
    var right = M.Bodies.rectangle(CFG.WIDTH + 40, CFG.HEIGHT / 2, 80, CFG.HEIGHT * 3,
      { isStatic: true, friction: 0.4, label: 'wall' });
    left.gameKind = 'wall';
    right.gameKind = 'wall';
    return [left, right];
  };

  Physics.makeBlock = function (spec) {
    var mat = AB.MATERIALS[spec.material] || AB.MATERIALS.wood;
    var w = Math.max(spec.w, CFG.MIN_BLOCK_THICKNESS);
    var h = Math.max(spec.h, CFG.MIN_BLOCK_THICKNESS);
    var body = M.Bodies.rectangle(spec.x, spec.y, w, h, {
      density: mat.density,
      friction: mat.friction,
      frictionStatic: 0.9,
      restitution: mat.restitution,
      label: 'block'
    });
    if (spec.angle) M.Body.setAngle(body, spec.angle);
    body.gameKind = 'block';
    body.gameW = w;
    body.gameH = h;
    body.material = (spec.material in AB.MATERIALS) ? spec.material : 'wood';
    body.maxHp = mat.hp;
    body.hp = mat.hp;
    return body;
  };

  Physics.makePig = function (spec) {
    var r = spec.r || CFG.PIG_RADIUS;
    var body = M.Bodies.circle(spec.x, spec.y, r, {
      density: CFG.PIG_DENSITY,
      friction: 0.45,
      frictionStatic: 0.8,
      restitution: CFG.PIG_RESTITUTION,
      label: 'pig'
    });
    body.gameKind = 'pig';
    body.maxHp = CFG.PIG_HP;
    body.hp = CFG.PIG_HP;
    body.gameR = r;
    return body;
  };

  // 조준 중에는 정적(걸이에 고정), 발사 시 setStatic(false) 후 속도 부여.
  Physics.makeBird = function (x, y) {
    var body = M.Bodies.circle(x, y, CFG.BIRD_RADIUS, {
      density: CFG.BIRD_DENSITY,
      friction: CFG.BIRD_FRICTION,
      frictionAir: CFG.BIRD_AIR,
      restitution: CFG.BIRD_RESTITUTION,
      label: 'bird'
    });
    body.gameKind = 'bird';
    body.gameR = CFG.BIRD_RADIUS;
    M.Body.setStatic(body, true);
    return body;
  };

  /* ---------- 충격 → 데미지 ---------- */

  Physics.speed = function (body) {
    return Math.sqrt(body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y);
  };

  // 상대 속도 * 상대 바디의 유효 질량 = 데미지 (플랜의 값싼 근사)
  Physics.impactDamage = function (target, other) {
    var dvx = (other.velocity.x || 0) - (target.velocity.x || 0);
    var dvy = (other.velocity.y || 0) - (target.velocity.y || 0);
    var rv = Math.sqrt(dvx * dvx + dvy * dvy);
    if (rv < CFG.IMPACT_MIN_SPEED) return 0;
    var mass = other.isStatic ? CFG.STATIC_IMPACT_MASS
      : Math.min(other.mass || 1, CFG.IMPACT_MASS_CLAMP);
    return rv * mass * CFG.DAMAGE_SCALE;
  };

  // 월드 정지: 모든 비정적 바디의 속도/각속도가 임계 이하
  Physics.isWorldQuiet = function (engine) {
    var bodies = M.Composite.allBodies(engine.world);
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (b.isStatic) continue;
      if (Physics.speed(b) > CFG.SETTLE_SPEED) return false;
      if (Math.abs(b.angularVelocity) > 0.08) return false;
    }
    return true;
  };

  AB.Physics = Physics;
})(window.AB);
