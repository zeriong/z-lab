import { materials } from './materials';
import type Body from 'matter-js/Build/Body';
import type { IPair } from 'matter-js/Build/Pair';

interface BodyHealth {
  hp: number;
  material: string;
}

const bodyHealth = new WeakMap<Body, BodyHealth>();

export function initializeBodyHealth(body: Body, material: string): void {
  const props = materials[material];
  if (!props) return;
  bodyHealth.set(body, {
    hp: props.hp,
    material
  });
}

export function getBodyHealth(body: Body): BodyHealth | undefined {
  return bodyHealth.get(body);
}

export function damageBody(body: Body, amount: number): boolean {
  const health = bodyHealth.get(body);
  if (!health) return false;

  health.hp -= amount;
  return health.hp <= 0;
}

export function applyDamage(pair: IPair, onDestroy: (body: Body, material: string) => void): void {
  const { bodyA, bodyB } = pair;
  const healthA = bodyHealth.get(bodyA);
  const healthB = bodyHealth.get(bodyB);

  if (!healthA || !healthB) return;

  const propsA = materials[healthA.material];
  const propsB = materials[healthB.material];

  if (!propsA || !propsB) return;

  // Calculate relative velocity
  const vx = (bodyA.velocity.x - bodyB.velocity.x);
  const vy = (bodyA.velocity.y - bodyB.velocity.y);
  const relativeSpeed = Math.sqrt(vx * vx + vy * vy);

  // Calculate impulse
  const mA = bodyA.mass;
  const mB = bodyB.mass;
  const reducedMass = (mA * mB) / (mA + mB);
  const impulse = relativeSpeed * reducedMass;

  // Apply damage
  const damageA = Math.max(0, impulse - propsB.threshold);
  const damageB = Math.max(0, impulse - propsA.threshold);

  if (damageA > 0) {
    const destroyed = damageBody(bodyB, damageA);
    if (destroyed) {
      onDestroy(bodyB, healthB.material);
    }
  }

  if (damageB > 0) {
    const destroyed = damageBody(bodyA, damageB);
    if (destroyed) {
      onDestroy(bodyA, healthA.material);
    }
  }
}

export function clearHealthMap(): void {
  // Create new WeakMap
  bodyHealth = new WeakMap();
}
