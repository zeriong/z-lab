const { Engine, Composite, Bodies, Body, Events } = Matter;

const MATERIAL = {
  wood:  { hp: 26, density: 0.0018, color: '#c8873c' },
  ice:   { hp: 13, density: 0.0011, color: '#9ad8e8' },
  stone: { hp: 52, density: 0.0032, color: '#9aa0a6' }
};
const PIG_HP = 15;

function createEngine() {
  const engine = Engine.create();
  engine.gravity.y = 1;
  engine.gravity.scale = 0.001;
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

  const ground = Bodies.rectangle(W / 2, GROUND_Y + 60, W + 400, 120, {
    isStatic: true,
    friction: 0.9
  });
  Composite.add(engine.world, ground);

  const blocks = [];
  for (const blockData of stage.blocks) {
    const mat = MATERIAL[blockData.mat];
    const opts = {
      density: mat.density,
      restitution: 0.5,
      friction: 0.5,
      angle: blockData.angle * Math.PI / 180
    };

    let body;
    if (blockData.w > blockData.h) {
      body = Bodies.rectangle(blockData.x, blockData.y, blockData.w, blockData.h, opts);
    } else {
      body = Bodies.rectangle(blockData.x, blockData.y, blockData.w, blockData.h, opts);
    }

    body.hp = mat.hp;
    body.color = mat.color;
    body.destroyed = false;
    Composite.add(engine.world, body);
    blocks.push(body);
  }

  const pigs = [];
  for (const pigData of stage.pigs) {
    const pig = Bodies.circle(pigData.x, pigData.y, pigData.r, {
      density: 0.002,
      restitution: 0.5,
      friction: 0.5
    });
    pig.hp = PIG_HP;
    pig.color = '#2d5016';
    pig.destroyed = false;
    pig.circleRadius = pigData.r;
    Composite.add(engine.world, pig);
    pigs.push(pig);
  }

  return { blocks, pigs };
}

function spawnBirdAtSling(engine) {
  const bird = Bodies.circle(SLING.x, SLING.y, 18, {
    isStatic: true,
    density: 0.004,
    restitution: 0.35,
    friction: 0.6,
    label: 'bird'
  });
  bird.color = '#ffcc00';
  bird.destroyed = false;
  bird.circleRadius = 18;
  Composite.add(engine.world, bird);
  return bird;
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
