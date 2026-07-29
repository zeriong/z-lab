import type { Body } from 'matter-js';

/** 블록 재질 — 밀도/내구도/파괴 임계값이 다르다. */
export type Material = 'wood' | 'stone' | 'glass';

export interface BlockDef {
  /** 중심 x */
  x: number;
  /** 중심 y */
  y: number;
  w: number;
  h: number;
  /** 라디안 회전 (옵션) */
  angle?: number;
  material: Material;
}

export interface PigDef {
  x: number;
  y: number;
  r: number;
  /** 미지정 시 기본 체력 */
  hp?: number;
}

export interface StageDef {
  id: number;
  name: string;
  /** 새총 앵커(고무줄이 모이는 지점) */
  slingshot: { x: number; y: number };
  /** 사용 가능한 발사체 수 */
  birds: number;
  pigs: PigDef[];
  blocks: BlockDef[];
  ground: 'grass' | 'sand' | 'snow';
  background: 'day' | 'dusk' | 'night';
  /** [1성, 2성, 3성] 점수 기준 */
  starThresholds: [number, number, number];
}

export type GameStateName = 'MENU' | 'PLAYING' | 'PAUSED' | 'CLEAR' | 'FAIL';

export type GameType = 'bird' | 'pig' | 'block' | 'ground';

/** Matter body에 붙는 게임 전용 데이터 (`body.plugin.game`). */
export interface GameData {
  gameType: GameType;
  hp: number;
  maxHp: number;
  material?: Material;
  /** 이 값을 넘는 충격량만 데미지가 된다. */
  damageThreshold: number;
  /** 파괴 시 획득 점수 */
  score: number;
  /** 파괴 이펙트 색 */
  color: string;
  /** 중복 제거 방지 플래그 */
  dead?: boolean;
}

export type GameBody = Body & { plugin: { game?: GameData } };

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface ProgressRecord {
  /** 클리어한 스테이지 id 목록 */
  cleared: number[];
  /** 스테이지 id → 최고 점수 */
  best: Record<string, number>;
}
