const { Engine, Composite, Bodies, Body, Events } = Matter;

const MATERIAL = {
  wood:  { hp: 26, density: 0.0018, color: '#c8873c' },
  ice:   { hp: 13, density: 0.0011, color: '#9ad8e8' },
  stone: { hp: 52, density: 0.0032, color: '#9aa0a6' }
};
const PIG_HP = 15;

function createEngine() {
  const engine = Engine.create();
  engine.world.gravity.y = 1;
  return engine;
}

function bindCollisions(engine) {
  Events.on(engine, 'collisionStart', function (ev) {
    for (let i = 0; i < ev.pairs.length; i++) {
      const a = ev.pairs[i].bodyA, b = ev.pairs[i].bodyB;
      const s = impactSpeed(a, b);
      if (s < IMPACT_MIN) continue;
      const da = damageBody(a, s), db = damageBody(b, s);
      if (da || db) playSfx('hit');
    }
  });
}

function buildStage(engine, stage) {
  Composite.clear(engine.world, false);

  // Ground
  Composite.add(engine.world, Bodies.rectangle(W / 2, GROUND_Y + 60, W + 400, 120, {
    isStatic: true,
    friction: 0.9
  }));

  // Blocks
  const blocks = [];
  for (let i = 0; i < stage.blocks.length; i++) {
    const blockData = stage.blocks[i];
    const mat = MATERIAL[blockData.mat];
    const body = Bodies.rectangle(blockData.x, blockData.y, blockData.w, blockData.h, {
      density: mat.density,
      restitution: 0.4,
      friction: 0.5,
      frictionAir: 0.001,
      angle: blockData.angle,
      isStatic: blockData.isStatic || false
    });
    body.hp = mat.hp;
    body.matColor = mat.color;
    Composite.add(engine.world, body);
    blocks.push(body);
  }

  // Pigs
  const pigs = [];
  for (let i = 0; i < stage.pigs.length; i++) {
    const pigData = stage.pigs[i];
    const body = Bodies.circle(pigData.x, pigData.y, pigData.r, {
      density: 0.004,
      restitution: 0.5,
      friction: 0.5,
      frictionAir: 0.001,
      label: 'pig'
    });
    body.hp = PIG_HP;
    body.matColor = '#90ee90';
    Composite.add(engine.world, body);
    pigs.push(body);
  }

  return { blocks, pigs };
}

function spawnBirdAtSling(engine) {
  const body = Bodies.circle(SLING.x, SLING.y, 18, {
    isStatic: true,
    density: 0.004,
    restitution: 0.35,
    friction: 0.6,
    label: 'bird'
  });
  body.matColor = '#ff0000';
  Composite.add(engine.world, body);
  return body;
}

function impactSpeed(a, b) {
  return Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
}

function damageBody(body, impact) {
  if (body.isStatic || body.hp === undefined || body.destroyed) return false;
  body.hp -= impact;
  if (body.hp > 0) return false;
  body.destroyed = true;
  return true;
}

function removeBody(engine, body) {
  Composite.remove(engine.world, body);
}
