/**
 * 레벨 데이터 스키마 (§7.1). 순수 타입/데이터, 어디에도 의존하지 않는다.
 * 좌표는 저작 편의를 위해 "바닥 중심" 기준이며 팩토리가 Matter 중심 좌표로 바꾼다.
 */

export type Material = 'wood' | 'ice' | 'stone';
export type BirdKind = 'red' | 'yellow' | 'black';
export type PigSize = 'small' | 'medium' | 'large';
export type BlockShape = 'rect' | 'circle' | 'tri';

export interface BlockDef {
  kind: 'block';
  material: Material;
  shape: BlockShape;
  /** 바닥 중심 x */
  x: number;
  /** 바닥 y (아래쪽 끝) */
  y: number;
  w?: number;
  h?: number;
  /** circle: 반지름, tri: 외접원 반지름 */
  r?: number;
  /** 라디안. rect 에만 의미 있음 */
  angle?: number;
}

export interface PigDef {
  kind: 'pig';
  size: PigSize;
  x: number;
  y: number;
}

export interface TerrainDef {
  kind: 'terrain';
  /** 바닥 중심 x */
  x: number;
  /** 바닥 y */
  y: number;
  w: number;
  h: number;
}

export type EntityDef = BlockDef | PigDef | TerrainDef;

/** 테스트용 정답 샷. angle: 도(°), x축 기준 반시계(위쪽이 +). power: 0..1 */
export interface Shot {
  angle: number;
  power: number;
  /** 확장 새 능력 발동 틱 (발사 후). MVP 미사용 */
  abilityAt?: number;
}

export interface LevelDef {
  id: number; // 1..10
  name: string;
  birds: BirdKind[];
  star2: number;
  star3: number;
  entities: EntityDef[];
  solutionShots: Shot[];
}
