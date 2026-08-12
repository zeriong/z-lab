import Matter from 'matter-js';
import { getMaterialProperties, getPigProperties } from './materials';
import type { MaterialType, PigSize } from '../data/schema';

export interface BodyHealth {
  hp: number;
  material: MaterialType | 'pig';
  pigSize?: PigSize;
}

const bodyHealthMap = new WeakMap<Matter.Body, BodyHealth>();

export function setBodyHealth(body: Matter.Body, material: MaterialType | 'pig', pigSize?: PigSize): void {
  let hp: number;

  if (material === 'pig') {
    if (!pigSize) throw new Error('pigSize required for pig');
    hp = getPigProperties(pigSize).hp;
  } else {
    hp = getMaterialProperties(material).hp;
  }

  bodyHealthMap.set(body, { hp, material, pigSize });
}

export function getBodyHealth(body: Matter.Body): BodyHealth | undefined {
  return bodyHealthMap.get(body);
}

export function takeDamage(body: Matter.Body, damage: number): number {
  const health = bodyHealthMap.get(body);
  if (!health) return 0;

  health.hp -= damage;
  return health.hp;
}

export function applyCollisionDamage(
  pair: Matter.Pair,
  onBodyDestroyed: (body: Matter.Body) => void,
  onTNTExplosion: (x: number, y: number) => void
): void {
  const { bodyA, bodyB } = pair;

  // Only apply damage if both bodies have health
  const healthA = bodyHealthMap.get(bodyA);
  const healthB = bodyHealthMap.get(bodyB);

  if (!healthA || !healthB) {
    return;
  }

  // Calculate impulse based on relative velocity and mass
  const relativeVelocity = {
    x: bodyB.velocity.x - bodyA.velocity.x,
    y: bodyB.velocity.y - bodyA.velocity.y,
  };

  const relativeSpeed = Math.sqrt(relativeVelocity.x ** 2 + relativeVelocity.y ** 2);

  const massA = bodyA.mass;
  const massB = bodyB.mass;
  const reducedMass = (massA * massB) / (massA + massB);

  const impulse = relativeSpeed * reducedMass;

  // Apply damage to both bodies
  applyDamageToBody(bodyA, impulse, onBodyDestroyed, onTNTExplosion);
  applyDamageToBody(bodyB, impulse, onBodyDestroyed, onTNTExplosion);
}

function applyDamageToBody(
  body: Matter.Body,
  impulse: number,
  onBodyDestroyed: (body: Matter.Body) => void,
  onTNTExplosion: (x: number, y: number) => void,
  recursionDepth: number = 0
): void {
  const health = bodyHealthMap.get(body);
  if (!health) return;

  let threshold: number;
  if (health.material === 'pig') {
    if (!health.pigSize) return;
    threshold = getPigProperties(health.pigSize).threshold;
  } else {
    threshold = getMaterialProperties(health.material).threshold;
  }

  const damage = Math.max(0, impulse - threshold);
  if (damage <= 0) return;

  const newHP = takeDamage(body, damage);

  if (newHP <= 0) {
    onBodyDestroyed(body);

    if (health.material === 'tnt' && recursionDepth < 8) {
      // Trigger explosion
      const explosionRadius = 120;
      const explosionForce = 0.06;
      const explosionDamage = 20;

      onTNTExplosion(body.position.x, body.position.y);

      // Find nearby bodies
      const dynamicBodies = Matter.Composite.allBodies(body.world || (Matter.Engine as any).world);
      for (const nearbyBody of dynamicBodies) {
        if (nearbyBody === body || nearbyBody.isStatic) continue;

        const dx = nearbyBody.position.x - body.position.x;
        const dy = nearbyBody.position.y - body.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < explosionRadius && distance > 0) {
          const force = explosionForce * (1 - distance / explosionRadius);
          const angle = Math.atan2(dy, dx);

          // Apply impulse
          const impulseX = Math.cos(angle) * force;
          const impulseY = Math.sin(angle) * force;

          Matter.Body.applyForce(nearbyBody, nearbyBody.position, { x: impulseX, y: impulseY });

          // Apply fixed damage
          applyDamageToBody(nearbyBody, explosionDamage, onBodyDestroyed, onTNTExplosion, recursionDepth + 1);
        }
      }
    }
  }
}
