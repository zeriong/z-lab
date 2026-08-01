/** 공통 타입 — 플랜 §3 파일 경계의 `types.ts` */

export type Material = 'wood' | 'ice' | 'stone';

/** R2: 새 2종 — 기본새 / 탭-대시새 (돌 벽을 실용적으로 뚫는 유일한 수단) */
export type BirdKind = 'basic' | 'dash';

export type BodyKind = 'ground' | 'terrain' | 'block' | 'pig' | 'bird' | 'debris';

export interface Vec2 {
  x: number;
  y: number;
}

/** 블록: x,y 는 중심 좌표(Matter 규약과 동일) */
export interface BlockDef {
  x: number;
  y: number;
  w: number;
  h: number;
  material: Material;
  angle?: number;
}

export interface PigDef {
  x: number;
  y: number;
}

/** 정적 지형(경사면 등) */
export interface TerrainDef {
  x: number;
  y: number;
  w: number;
  h: number;
  angle?: number;
}

export interface StageDef {
  id: number;
  name: string;
  /** §6 "이 스테이지가 가르치는 것" — 스테이지마다 달라야 한다 */
  teaches: string;
  birds: BirdKind[];
  slingshot: Vec2;
  blocks: BlockDef[];
  pigs: PigDef[];
  terrain: TerrainDef[];
  /**
   * 저작자 par 점수. 별 임계값은 이 값의 0.70 / 0.90 (플랜 §8 규칙).
   * 구현자 주: 실제 플레이 측정이 불가능한 환경이므로 저작 시점 산식 추정값이다.
   */
  parScore: number;
}

export type StateName = 'BOOT' | 'MAIN' | 'SELECT' | 'PLAYING' | 'PAUSED' | 'CLEAR' | 'FAIL';

/** 인게임 내부 페이즈(상태 머신의 PLAYING 하위 단계) */
export type Phase = 'IDLE' | 'AIM' | 'FLYING' | 'SETTLING' | 'DONE';

export interface ScoreParts {
  pigs: number;
  birdsLeft: number;
  blocks: number;
}

export interface StageResult {
  stageId: number;
  cleared: boolean;
  parts: ScoreParts;
  score: number;
  stars: number;
  par: number;
}

export interface HudData {
  stageId: number;
  score: number;
  birdsLeft: number;
}
