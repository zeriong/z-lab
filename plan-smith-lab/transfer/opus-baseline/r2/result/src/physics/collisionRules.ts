import { getMaterial } from './materials';

export interface DamageInfo {
  damage: number;
  impactForce: number;
}

export function calculateDamage(
  relativeVelocity: number,
  materialA: string,
  materialB: string,
  massA: number,
  massB: number
): { damageA: number; damageB: number } {
  const matA = getMaterial(materialA);
  const matB = getMaterial(materialB);

  // Simplified impulse calculation
  const effectiveMass = (massA * massB) / (massA + massB);
  const impactForce = 0.5 * effectiveMass * relativeVelocity * relativeVelocity;

  let damageA = 0;
  let damageB = 0;

  // Calculate damage for A
  if (impactForce > matA.damageThreshold) {
    damageA = Math.max(0, (impactForce - matA.damageThreshold) * matA.damageScale);
  }

  // Calculate damage for B
  if (impactForce > matB.damageThreshold) {
    damageB = Math.max(0, (impactForce - matB.damageThreshold) * matB.damageScale);
  }

  return { damageA: Math.round(damageA), damageB: Math.round(damageB) };
}

export function shouldBreak(currentHp: number, incomingDamage: number): boolean {
  return currentHp - incomingDamage <= 0;
}
