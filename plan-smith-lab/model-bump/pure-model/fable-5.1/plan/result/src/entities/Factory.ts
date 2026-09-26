/**
 * LevelDef → 바디·엔티티 생성 (§7.3).
 * 좌표 변환(바닥 중심 → Matter 중심)은 각 생성 함수가 담당한다.
 */
import Matter from 'matter-js';
import type { EntityDef, LevelDef, TerrainDef } from '../levels/types';
import type { PhysicsWorld } from '../physics/World';
import { createBlock } from './Block';
import { allocEntityId, type Entity } from './Entity';
import { createPig } from './Pig';

const { Bodies } = Matter;

export function createTerrain(def: TerrainDef): Entity {
  const body = Bodies.rectangle(def.x, def.y - def.h / 2, def.w, def.h, {
    isStatic: true,
    friction: 0.8,
    restitution: 0,
    label: 'terrain',
  });
  return {
    id: allocEntityId(),
    kind: 'terrain',
    body,
    health: Infinity,
    maxHealth: Infinity,
    alive: true,
    w: def.w,
    h: def.h,
  };
}

export function createEntity(def: EntityDef): Entity {
  switch (def.kind) {
    case 'block':
      return createBlock(def);
    case 'pig':
      return createPig(def.size, def.x, def.y);
    case 'terrain':
      return createTerrain(def);
  }
}

/** 레벨의 모든 엔티티를 월드에 추가한다. 생성 순서는 정의 순서. */
export function buildLevel(world: PhysicsWorld, level: LevelDef): Entity[] {
  const created: Entity[] = [];
  for (const def of level.entities) {
    created.push(world.add(createEntity(def)));
  }
  return created;
}
