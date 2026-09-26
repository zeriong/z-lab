/**
 * 엔티티 모델 (§4.4). 모든 게임 바디는 하나의 Entity 를 가진다.
 * 조회는 World 의 Map<bodyId, Entity> 로 한다.
 */
import type Matter from 'matter-js';
import type { BirdKind, BlockShape, Material, PigSize } from '../levels/types';

export type EntityKind = 'bird' | 'pig' | 'block' | 'ground' | 'terrain';

export interface Entity {
  id: number;
  kind: EntityKind;
  body: Matter.Body;
  /** 파괴 불가(ground/terrain/bird)는 Infinity */
  health: number;
  maxHealth: number;
  alive: boolean;
  /** block 전용 */
  material?: Material;
  shape?: BlockShape;
  w?: number;
  h?: number;
  r?: number;
  /** pig 전용 */
  pigSize?: PigSize;
  /** bird 전용 */
  birdKind?: BirdKind;
}

let nextEntityId = 1;

export function allocEntityId(): number {
  return nextEntityId++;
}

/** 테스트에서 결정성을 위해 id 카운터를 되돌릴 때 사용. */
export function resetEntityIds(): void {
  nextEntityId = 1;
}

export const isDestructible = (e: Entity): boolean =>
  e.kind === 'block' || e.kind === 'pig';

/** 체력 비율 → 균열 단계 0/1/2 */
export function crackStage(e: Entity, stage1 = 0.66, stage2 = 0.33): 0 | 1 | 2 {
  if (!isFinite(e.maxHealth) || e.maxHealth <= 0) return 0;
  const ratio = e.health / e.maxHealth;
  if (ratio < stage2) return 2;
  if (ratio < stage1) return 1;
  return 0;
}
