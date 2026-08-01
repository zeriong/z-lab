export type MaterialType = 'wood' | 'stone' | 'glass';

export interface BlockData {
  material: MaterialType;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PigData {
  x: number;
  y: number;
}

export interface StarCuts {
  two: number;
  three: number;
}

/**
 * Static stage record. See plan §스테이지 데이터 구조 for the field table this
 * mirrors 1:1. All 10 stages are bundled as a single stages.json array (no
 * server, no per-stage file split) per the plan's stated rationale.
 */
export interface StageData {
  id: string;
  order: number;
  blocks: BlockData[];
  pigs: PigData[];
  birdsGranted: number;
  backgroundTheme: string;
  maxScore: number;
  starCuts: StarCuts;
  unlockCondition: string;
}

export type GameStateName =
  | 'MAIN'
  | 'STAGE_SELECT'
  | 'PLAYING'
  | 'PAUSED'
  | 'CLEARED'
  | 'FAILED';
