/**
 * Physics layer (plan Step 1 / Step 6).
 *
 * Anchor A1×A3 decision: Matter.js is driven with a FIXED timestep via
 * an accumulator (see main.js) — Matter.Runner is never used. Every
 * call to Physics.step() advances the simulation by exactly the same
 * delta (FIXED_DT), so the same input sequence always produces the
 * same body trajectories in a given session (A3).
 *
 * Anchor A2×A3 decision ("clean reset"): Physics.loadStage() always
 * tears the whole world down (Composite.clear) and rebuilds it from
 * stage data before adding a single body, so no stale body/constraint
 * from a previous stage or previous attempt can leak into the next.
 */
window.Physics = (function () {
  const { Engine, World, Bodies, Body, Composite } = Matter;

  const FIXED_DT = 1000 / 60;

  const MATERIALS = {
    wood:  { density: 0.0025, restitution: 0.15, friction: 0.6,  frictionStatic: 0.8,  hp: 40, color: '#b5793a', stroke: '#7a4b21' },
    stone: { density: 0.005,  restitution: 0.05, friction: 0.8,  frictionStatic: 0.9,  hp: 90, color: '#9a9a9a', stroke: '#5f5f5f' },
    ice:   { density: 0.0018, restitution: 0.25, friction: 0.02, frictionStatic: 0.05, hp: 25, color: '#cdeeff', stroke: '#6fb9d9' }
  };
  const PIG_HP = 16;
  const BIRD_MATERIAL = { density: 0.004, restitution: 0.35, friction: 0.5, frictionAir: 0 };

  let engine = null;
  let world = null;
  let groundBody = null;
  let blockBodies = [];
  let pigBodies = [];
  let birdBody = null;
  let spentBirdBodies = []; // previously-launched birds left resting on the field

  function init() {
    engine = Engine.create();
    world = engine.world;
    world.gravity.x = 0;
    world.gravity.y = 1;
    world.gravity.scale = 0.001;
    return engine;
  }

  function clearWorld() {
    if (!engine) return;
    Composite.clear(world, false); // false: also clear static bodies (full reset)
    Engine.clear(engine); // purge stale broadphase/pair state so nothing leaks into the next stage/attempt
    blockBodies = [];
    pigBodies = [];
    birdBody = null;
    spentBirdBodies = [];
    groundBody = null;
  }

  function buildGround() {
    const C = window.GAME_CONSTANTS;
    groundBody = Bodies.rectangle(
      C.CANVAS_W / 2, C.GROUND_Y + 40, C.CANVAS_W + 400, 80,
      { isStatic: true, friction: 0.9, label: 'ground' }
    );
    Composite.add(world, groundBody);
  }

  function buildBlock(spec) {
    const mat = MATERIALS[spec.material] || MATERIALS.wood;
    const body = Bodies.rectangle(spec.x, spec.y, spec.w, spec.h, {
      angle: spec.angle || 0,
      density: mat.density,
      restitution: mat.restitution,
      friction: mat.friction,
      frictionStatic: mat.frictionStatic,
      label: 'block'
    });
    body.plugin = { kind: 'block', material: spec.material, hp: mat.hp, maxHp: mat.hp, destroyed: false, w: spec.w, h: spec.h };
    return body;
  }

  function buildPig(spec) {
    const body = Bodies.circle(spec.x, spec.y, spec.r || window.GAME_CONSTANTS.PIG_R, {
      density: 0.0015,
      restitution: 0.3,
      friction: 0.6,
      label: 'pig'
    });
    body.plugin = { kind: 'pig', hp: PIG_HP, maxHp: PIG_HP, destroyed: false, r: spec.r || window.GAME_CONSTANTS.PIG_R };
    return body;
  }

  function makeBirdBody(x, y) {
    const r = window.GAME_CONSTANTS.BIRD_R;
    const body = Bodies.circle(x, y, r, {
      density: BIRD_MATERIAL.density,
      restitution: BIRD_MATERIAL.restitution,
      friction: BIRD_MATERIAL.friction,
      frictionAir: BIRD_MATERIAL.frictionAir,
      label: 'bird'
    });
    body.plugin = { kind: 'bird', r, launched: false };
    return body;
  }

  /** Full teardown + rebuild from stage data. Returns body refs. */
  function loadStage(stageData) {
    clearWorld();
    buildGround();
    blockBodies = stageData.blocks.map(buildBlock);
    pigBodies = stageData.pigs.map(buildPig);
    Composite.add(world, blockBodies);
    Composite.add(world, pigBodies);
    return { ground: groundBody, blocks: blockBodies, pigs: pigBodies };
  }

  function spawnBird() {
    const C = window.GAME_CONSTANTS;
    // the previous bird (if any) is now spent — keep it in the world (as a
    // real Angry Birds field would) and keep rendering/tracking it, instead
    // of silently orphaning it as an invisible-but-still-solid body.
    if (birdBody) spentBirdBodies.push(birdBody);
    birdBody = makeBirdBody(C.SLING_X, C.SLING_Y);
    Body.setStatic(birdBody, true); // held at rest on the sling until launch
    Composite.add(world, birdBody);
    return birdBody;
  }

  function launchBird(vx, vy) {
    if (!birdBody) return;
    Body.setStatic(birdBody, false);
    Body.setVelocity(birdBody, { x: vx, y: vy });
    Body.setAngularVelocity(birdBody, 0);
    birdBody.plugin.launched = true;
  }

  function removeBody(body) {
    Composite.remove(world, body);
    if (body === birdBody) birdBody = null;
    blockBodies = blockBodies.filter((b) => b !== body);
    pigBodies = pigBodies.filter((b) => b !== body);
    spentBirdBodies = spentBirdBodies.filter((b) => b !== body);
  }

  function step() {
    Engine.update(engine, FIXED_DT);
  }

  /** Largest |velocity| among all live non-static bodies — used to detect "world at rest". */
  function maxBodySpeed() {
    let max = 0;
    const all = Composite.allBodies(world);
    for (const b of all) {
      if (b.isStatic) continue;
      const s = Math.hypot(b.velocity.x, b.velocity.y);
      if (s > max) max = s;
    }
    return max;
  }

  return {
    FIXED_DT, MATERIALS, PIG_HP,
    init, loadStage, clearWorld, spawnBird, launchBird, removeBody, step, maxBodySpeed,
    get engine() { return engine; },
    get world() { return world; },
    get blocks() { return blockBodies; },
    get pigs() { return pigBodies; },
    get bird() { return birdBody; },
    get spentBirds() { return spentBirdBodies; },
    get ground() { return groundBody; }
  };
})();
