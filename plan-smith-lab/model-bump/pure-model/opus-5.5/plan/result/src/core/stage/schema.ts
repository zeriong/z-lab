import type { BirdKind, Material, PigSize } from '../../config/catalog';

/** 스테이지 데이터 스키마 (§6.1). 좌표는 논리 px, 바디 위치는 중심 좌표다. */

export interface TerrainRectDef {
  x: number;
  y: number;
  w: number;
  h: number;
  /** 라디안, 시계 방향이 양수 */
  angle?: number;
}

export interface TerrainPolyDef {
  /** 절대 좌표 꼭짓점 (볼록 다각형, 3~8개) */
  points: [number, number][];
}

export type TerrainDef = TerrainRectDef | TerrainPolyDef;

export type BlockShape = 'rect' | 'circle' | 'triangle';

export interface BlockDef {
  material: Material;
  shape: BlockShape;
  x: number;
  y: number;
  w?: number;
  h?: number;
  r?: number;
  angle?: number;
}

export interface PigDef {
  size: PigSize;
  x: number;
  y: number;
}

export interface TntDef {
  x: number;
  y: number;
}

export interface ShotDef {
  pull: [number, number];
  /** 발사 후 이 시간(초)이 되면 능력을 쓴다 */
  abilityAt?: number;
}

export interface StageData {
  id: number;
  name: string;
  birds: BirdKind[];
  slingshot: { x: number };
  terrain: TerrainDef[];
  blocks: BlockDef[];
  pigs: PigDef[];
  tnt?: TntDef[];
  stars: [number, number];
  /** 기준 해법. 자동 테스트가 재생한다. 게임 화면에서는 쓰지 않는다. */
  solution: ShotDef[];
}

export function isPolyTerrain(t: TerrainDef): t is TerrainPolyDef {
  return Array.isArray((t as TerrainPolyDef).points);
}

/** 세션은 언제나 원본의 깊은 복사본으로 만든다 (§4.1 불변식). */
export function cloneStage(stage: StageData): StageData {
  return JSON.parse(JSON.stringify(stage)) as StageData;
}

/** dev 빌드에서 원본 스테이지 데이터를 보호한다. */
export function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const v of Object.values(obj as Record<string, unknown>)) deepFreeze(v);
  }
  return obj;
}
