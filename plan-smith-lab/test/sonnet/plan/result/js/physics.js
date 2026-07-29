// Thin wrapper around the global Matter.js (loaded via <script> tag in
// index.html) -- body factories + collision -> game-event translation, per
// the plan's Core layer.

const { Engine, World, Composite, Bodies, Body, Events, Vector } = Matter;

import {
  MATERIALS,
  BIRD_TYPES,
  PIG_RADIUS,
  PIG_HEALTH,
  DAMAGE_THRESHOLD,
  DAMAGE_MULTIPLIER,
  PIG_IMPACT_THRESHOLD,
  PIG_DAMAGE_MULTIPLIER,
  EXPLOSION_RADIUS,
  EXPLOSION_FORCE,
  EXPLOSION_DAMAGE,
} from './constants.js';

export function createEngine() {
  const engine = Engine.create();
  engine.gravity.y = 1;
  return engine;
}

export function createGround(world, canvasWidth, groundY) {
  const ground = Bodies.rectangle(canvasWidth / 2, groundY + 60, canvasWidth * 2, 120, {
    isStatic: true,
    friction: 0.9,
    label: 'ground',
  });
  World.add(world, ground);
  return ground;
}

export function createBlock(spec) {
  const mat = MATERIALS[spec.type];
  const body = Bodies.rectangle(spec.x, spec.y, spec.width, spec.height, {
    angle: spec.angle || 0,
    density: mat.density,
    restitution: mat.restitution,
    friction: mat.friction,
    label: 'block',
  });
  body.gameData = {
    kind: 'block',
    material: spec.type,
    health: mat.health,
    maxHealth: mat.health,
    scoreValue: 100,
    destroyed: false,
  };
  return body;
}

export function createPig(spec) {
  const radius = spec.radius || PIG_RADIUS;
  const body = Bodies.circle(spec.x, spec.y, radius, {
    density: 0.004,
    restitution: 0.3,
    friction: 0.6,
    label: 'pig',
  });
  body.gameData = {
    kind: 'pig',
    health: PIG_HEALTH,
    scoreValue: 500,
    destroyed: false,
  };
  return body;
}

export function createBird(type, x, y) {
  const cfg = BIRD_TYPES[type];
  const body = Bodies.circle(x, y, cfg.radius, {
    density: cfg.density,
    restitution: cfg.restitution,
    friction: 0.5,
    label: 'bird',
  });
  body.gameData = {
    kind: 'bird',
    type,
    exploded: false,
  };
  return body;
}

function impactMagnitude(pair) {
  const rv = Vector.sub(pair.bodyA.velocity, pair.bodyB.velocity);
  return Vector.magnitude(rv);
}

function damageBody(body, impact, world, callbacks) {
  const data = body.gameData;
  if (!data || data.destroyed) return;

  if (data.kind === 'block') {
    if (impact <= DAMAGE_THRESHOLD) return;
    data.health -= (impact - DAMAGE_THRESHOLD) * DAMAGE_MULTIPLIER;
    if (data.health <= 0) {
      data.destroyed = true;
      World.remove(world, body);
      callbacks.onBlockDestroyed(body);
    }
  } else if (data.kind === 'pig') {
    if (impact <= PIG_IMPACT_THRESHOLD) return;
    data.health -= (impact - PIG_IMPACT_THRESHOLD) * PIG_DAMAGE_MULTIPLIER;
    if (data.health <= 0) {
      data.destroyed = true;
      World.remove(world, body);
      callbacks.onPigKilled(body);
    }
  }
}

// "Bomb" birds detonate on first contact: nearby blocks/pigs take extra
// falloff damage and a small radial knockback push (the "폭발형" bird the
// plan asks for, to give the slingshot some strategic variety).
function maybeExplode(body, world, callbacks) {
  const data = body.gameData;
  if (!data || data.kind !== 'bird' || data.type !== 'bomb' || data.exploded) return;
  data.exploded = true;

  const center = body.position;
  const bodies = Composite.allBodies(world);

  bodies.forEach((other) => {
    if (other === body || !other.gameData || other.gameData.destroyed) return;
    if (other.gameData.kind !== 'block' && other.gameData.kind !== 'pig') return;

    const dx = other.position.x - center.x;
    const dy = other.position.y - center.y;
    const dist = Math.hypot(dx, dy);
    if (dist > EXPLOSION_RADIUS) return;

    const falloff = 1 - dist / EXPLOSION_RADIUS;
    const forceMag = EXPLOSION_FORCE * falloff;
    if (dist > 0.01) {
      Body.applyForce(other, other.position, {
        x: (dx / dist) * forceMag,
        y: (dy / dist) * forceMag - forceMag * 0.3,
      });
    }

    other.gameData.health -= EXPLOSION_DAMAGE * falloff;
    if (other.gameData.health <= 0 && !other.gameData.destroyed) {
      other.gameData.destroyed = true;
      World.remove(world, other);
      if (other.gameData.kind === 'block') callbacks.onBlockDestroyed(other);
      else callbacks.onPigKilled(other);
    }
  });

  callbacks.onExplosion(center);
}

export function setupCollisions(engine, world, callbacks) {
  Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair) => {
      const impact = impactMagnitude(pair);
      damageBody(pair.bodyA, impact, world, callbacks);
      damageBody(pair.bodyB, impact, world, callbacks);
      maybeExplode(pair.bodyA, world, callbacks);
      maybeExplode(pair.bodyB, world, callbacks);
    });
  });
}
