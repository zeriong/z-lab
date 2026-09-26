import { MATERIAL_SPECS } from '../../config/catalog';
import type { Material } from '../../config/catalog';
import type { Vec } from '../math';
import type { PhysBody, PhysicsWorld } from '../physics/world';
import { triangleLocalVerts } from '../stage/geometry';
import type { BlockDef, BlockShape } from '../stage/schema';

export interface Block {
  id: number;
  material: Material;
  shape: BlockShape;
  w: number;
  h: number;
  r: number;
  /** 삼각형일 때 로컬 꼭짓점 (px) */
  localVerts: Vec[] | null;
  hp: number;
  maxHp: number;
  body: PhysBody | null;
  alive: boolean;
}

export function createBlock(physics: PhysicsWorld, def: BlockDef, id: number): Block {
  const spec = MATERIAL_SPECS[def.material];
  const tag = { role: 'block' as const, id };
  const angle = def.angle ?? 0;
  let body: PhysBody;
  let localVerts: Vec[] | null = null;
  const w = def.w ?? (def.r ?? 0) * 2;
  const h = def.h ?? (def.r ?? 0) * 2;
  if (def.shape === 'circle') {
    body = physics.createDynamicCircle(def.x, def.y, def.r ?? 20, tag, spec, { angularDamping: 0.4 });
  } else if (def.shape === 'triangle') {
    localVerts = triangleLocalVerts(w, h);
    body = physics.createDynamicPolygon(def.x, def.y, localVerts, angle, tag, spec);
  } else {
    body = physics.createDynamicRect(def.x, def.y, w, h, angle, tag, spec);
  }
  return {
    id,
    material: def.material,
    shape: def.shape,
    w,
    h,
    r: def.r ?? 0,
    localVerts,
    hp: spec.hp,
    maxHp: spec.hp,
    body,
    alive: true,
  };
}
