import { GROUND_FIXTURE, TERRAIN_FIXTURE } from '../../config/catalog';
import type { Vec } from '../math';
import type { PhysBody, PhysicsWorld } from '../physics/world';
import { groundVerts, terrainWorldVerts } from '../stage/geometry';
import type { TerrainDef } from '../stage/schema';

/** 정적 지형. 파괴되지 않는다. 렌더링을 위해 월드 좌표 외곽선을 들고 있다. */
export interface Terrain {
  id: number;
  points: Vec[];
  body: PhysBody;
}

export function createTerrain(physics: PhysicsWorld, def: TerrainDef, id: number): Terrain {
  const points = terrainWorldVerts(def);
  const tag = { role: 'terrain' as const, id };
  const body =
    'points' in def
      ? physics.createStaticPolygon(points, tag, TERRAIN_FIXTURE)
      : physics.createStaticRect(def.x, def.y, def.w, def.h, def.angle ?? 0, tag, TERRAIN_FIXTURE);
  return { id, points, body };
}

/** 지면: x ∈ [-400, 2320], 윗면 y = 980인 정적 바디 */
export function createGround(physics: PhysicsWorld, id: number): Terrain {
  const points = groundVerts();
  const body = physics.createStaticPolygon(points, { role: 'ground', id }, GROUND_FIXTURE);
  return { id, points, body };
}
