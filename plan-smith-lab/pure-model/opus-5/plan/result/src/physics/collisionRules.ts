import type { MaterialSpec } from './materials';

/**
 * Impulse -> damage conversion (plan §6.2).
 *
 *   impact = 0.5 * effectiveMass * relativeNormalSpeed^2      (approx. KE)
 *   damage = max(0, impact - threshold) * damageScale
 *
 * `effectiveMass` is the reduced mass of the pair (a static body counts as
 * infinite, i.e. the reduced mass collapses to the dynamic body's mass), so a
 * pebble hitting a wall does not inherit the wall's mass.
 */

/** Collisions below this are ignored entirely (settling jitter, resting stacks). */
export const MIN_EVENT_ENERGY = 3;

export function impactEnergy(effectiveMass: number, relativeNormalSpeed: number): number {
  if (!Number.isFinite(effectiveMass) || effectiveMass <= 0) return 0;
  return 0.5 * effectiveMass * relativeNormalSpeed * relativeNormalSpeed;
}

export function damageFrom(spec: MaterialSpec, energy: number): number {
  const over = energy - spec.threshold;
  if (over <= 0) return 0;
  return over * spec.damageScale;
}

/** Explosion falloff: 1 at the centre, 0 at the radius (plan §6.2, no raycast). */
export function radialFalloff(distance: number, radius: number): number {
  if (distance >= radius) return 0;
  const t = 1 - distance / radius;
  return t * t;
}
