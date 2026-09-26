import { PIGS } from '../../config/catalog';
import type { PigSize } from '../../config/catalog';
import type { PhysBody, PhysicsWorld } from '../physics/world';
import type { PigDef } from '../stage/schema';

export interface Pig {
  id: number;
  size: PigSize;
  radius: number;
  hp: number;
  maxHp: number;
  body: PhysBody | null;
  alive: boolean;
}

export function createPig(physics: PhysicsWorld, def: PigDef, id: number): Pig {
  const spec = PIGS[def.size];
  const body = physics.createDynamicCircle(def.x, def.y, spec.radius, { role: 'pig', id }, spec, {
    angularDamping: spec.angularDamping,
  });
  return { id, size: def.size, radius: spec.radius, hp: spec.hp, maxHp: spec.hp, body, alive: true };
}
