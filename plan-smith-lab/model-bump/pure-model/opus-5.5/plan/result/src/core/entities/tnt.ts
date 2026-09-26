import { TNT } from '../../config/catalog';
import type { PhysBody, PhysicsWorld } from '../physics/world';
import type { TntDef } from '../stage/schema';

export interface Tnt {
  id: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  body: PhysBody | null;
  alive: boolean;
}

export function createTnt(physics: PhysicsWorld, def: TntDef, id: number): Tnt {
  const body = physics.createDynamicRect(def.x, def.y, TNT.w, TNT.h, 0, { role: 'tnt', id }, TNT);
  return { id, w: TNT.w, h: TNT.h, hp: TNT.hp, maxHp: TNT.hp, body, alive: true };
}
