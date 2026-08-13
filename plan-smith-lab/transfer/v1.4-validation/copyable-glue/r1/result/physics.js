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
  Bodies.rectangle(W / 2, GROUND_Y + 60, W + 400, 120, { isStatic: true, friction: 0.9 });
  Composite.add(engine.world, [
    Bodies.rectangle(W / 2, GROUND_Y + 60, W + 400, 120, { isStatic: true, friction: 0.9 })
  ]);

  const blocks = [];
  for (let i = 0; i < stage.blocks.length; i++) {
    const b = stage.blocks[i];
    const mat = MATERIAL[b.mat];
    const body = Bodies.rectangle(b.x, b.y, b.w, b.h, {
      density: mat.density,
      restitution: 0.5,
      friction: 0.5,
      label: 'block'
    });
    body.hp = mat.hp;
    body.color = mat.color;
    body.destroyed = false;
    if (b.angle) Body.rotate(body, b.angle);
    Composite.add(engine.world, body);
    blocks.push(body);
  }

  const pigs = [];
  for (let i = 0; i < stage.pigs.length; i++) {
    const p = stage.pigs[i];
    const body = Bodies.circle(p.x, p.y, p.r, {
      density: 0.002,
      restitution: 0.6,
      friction: 0.5,
      label: 'pig'
    });
    body.hp = PIG_HP;
    body.color = '#3d8000';
    body.destroyed = false;
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
  body.color = '#ff0000';
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
