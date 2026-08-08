// 스테이지 스키마 (플랜 S3) — 모든 좌표는 960×540 내부(L16 저작 규칙)

export type Material = 'wood' | 'stone' | 'glass';

export interface PigSpec {
  x: number;
  y: number;
  r: number;
}

export interface BlockSpec {
  x: number; // 중심
  y: number; // 중심
  w: number;
  h: number;
  material: Material;
}

/** 별점 규칙 오버라이드: 잔여 새 수 기준 (기본 two=1, three=2) */
export interface StarRule {
  two: number;
  three: number;
}

export interface StageData {
  birds: number;
  pigs: PigSpec[];
  blocks: BlockSpec[];
  starRule?: StarRule;
}
