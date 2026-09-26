// 공용 타입 (§4.3, §4.9)

export type MaterialId = 'glass' | 'wood' | 'stone';
export type BirdType = 'red' | 'blue' | 'yellow' | 'black';
export type PigType = 'small' | 'large' | 'helmet';

export interface Vec2 {
  x: number;
  y: number;
}

export type BlockDef =
  | { kind: 'box'; material: MaterialId; x: number; y: number; w: number; h: number; angle?: number }
  | { kind: 'circle'; material: MaterialId; x: number; y: number; r: number };

export interface StaticDef {
  x: number;
  y: number;
  w: number;
  h: number;
  angle?: number;
}

export interface PigDef {
  type: PigType;
  x: number;
  y: number;
}

/** 발사 한 번. pull = anchor - pointer. abilityAtStep = 발사 후 몇 번째 스텝에 능력 발동 */
export interface ShotDef {
  pull: Vec2;
  abilityAtStep?: number;
}

export interface StarThresholds {
  two: number;
  three: number;
}

export interface StageData {
  id: number;
  name: string;
  birds: BirdType[];
  blocks: BlockDef[];
  pigs: PigDef[];
  statics?: StaticDef[];
  stars?: StarThresholds;
  slack: number;
  solution: ShotDef[];
  hint?: boolean;
}

export type SceneId = 'MAIN_MENU' | 'STAGE_SELECT' | 'PLAYING' | 'PAUSED' | 'RESULT_CLEAR' | 'RESULT_FAIL';

export type Phase = 'AIMING' | 'FLYING' | 'WAITING_NEXT' | 'CLEAR_PENDING' | 'FAIL_PENDING';

export type SlingState = 'EMPTY' | 'LOADED' | 'DRAGGING';

export type SoundId =
  | 'launch'
  | 'impact'
  | 'break-glass'
  | 'break-wood'
  | 'break-stone'
  | 'pig'
  | 'clear'
  | 'fail';

/** 레지스트리에 들어가는 엔티티 (body.id → Entity) */
export type Entity =
  | { kind: 'block'; material: MaterialId; hp: number; maxHp: number }
  | { kind: 'pig'; pigType: PigType; hp: number; maxHp: number }
  | { kind: 'bird'; birdType: BirdType }
  | { kind: 'static' };

export interface StageRecord {
  bestScore: number;
  stars: number;
}

export interface SaveData {
  version: 1;
  unlocked: number;
  stages: Record<string, StageRecord>;
  muted: boolean;
}

export interface ResultInfo {
  stageId: number;
  cleared: boolean;
  score: number;
  stars: number;
  bestScore: number;
  newBest: boolean;
  isLast: boolean;
}
