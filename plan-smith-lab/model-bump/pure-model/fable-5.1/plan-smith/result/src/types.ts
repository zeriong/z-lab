// 공용 타입과 상수. 숫자는 전부 계획서 §9의 "초기값(declared arbitrary)" — 플레이테스트로 교체 대상.

export type Material = 'wood' | 'ice' | 'stone';

/** B11(특수 새)은 defer. 기본 새 한 종류만 존재한다. */
export type BirdKind = 'red';

export interface Vec2 {
  x: number;
  y: number;
}

export interface PigDef {
  x: number;
  y: number;
  hp: number;
  r?: number;
}

export interface BlockDef {
  x: number;
  y: number;
  w: number;
  h: number;
  material: Material;
  angle?: number;
}

export interface StageDef {
  id: number;
  name: string;
  birds: BirdKind[];
  pigs: PigDef[];
  blocks: BlockDef[];
  /** [별1, 별2, 별3] 점수 임계. 오름차순. */
  starThresholds: [number, number, number];
}

/** 자동 클리어 스크립트 입력: 각 발사의 dragVector(월드 px). 발사 속도 = -drag × k. */
export interface StageSolution {
  stageId: number;
  shots: Vec2[];
}

export interface MaterialSpec {
  hp: number;
  density: number;
  score: number;
  color: string;
  edge: string;
}

export const MATERIAL: Record<Material, MaterialSpec> = {
  wood: { hp: 20, density: 0.0012, score: 100, color: '#c68a4a', edge: '#7d4f24' },
  ice: { hp: 10, density: 0.0009, score: 50, color: '#a9e2f5', edge: '#4fa8cc' },
  stone: { hp: 45, density: 0.0025, score: 200, color: '#8f949a', edge: '#4f545a' },
};

/** 논리 캔버스(16:9). 렌더와 입력은 이 단위를 쓴다. */
export const VIEW = { w: 1920, h: 1080 } as const;

/** 물리 월드. 카메라가 [0, WORLD.w - VIEW.w] 범위로 클램프된다. */
export const WORLD = { w: 2600, h: 1080, groundY: 1000, wallThickness: 200 } as const;

/** 새가 놓이는 슬링샷 컵 위치(월드 좌표). */
export const SLINGSHOT = { x: 320, y: 800, forkHalf: 22 } as const;

export const BIRD = { r: 24, density: 0.004, frictionAir: 0.002, restitution: 0.35, friction: 0.6 } as const;

export const PIG = { r: 26, density: 0.001, score: 1000, restitution: 0.2 } as const;

export const TUNING = {
  gravityY: 1,
  /** 발사 계수: velocity = -dragVector × k */
  k: 0.18,
  /** 최대 당김(월드 px) */
  maxPull: 90,
  /** 이 길이 이하로 놓으면 발사되지 않고 새가 컵으로 돌아간다 */
  minPull: 12,
  /** 새를 잡을 수 있는 반경 */
  grabRadius: 40,
  /** 이 충격량 미만의 충돌은 피해 없음 */
  impactThreshold: 4,
  /** 정착 판정: 모든 동적 body 속도 < settleSpeed 가 settleFrames 연속 */
  settleSpeed: 0.05,
  settleFrames: 30,
  /** 발사 후 이 프레임(8초 × 60)이 지나면 강제 정착 */
  settleTimeoutFrames: 480,
  /** 클리어 시 남은 새 1마리당 보너스 */
  birdBonus: 500,
  trajectoryDots: 12,
  trajectoryStepPerDot: 4,
  /** 고정 스텝(ms). 실제 경과시간은 쓰지 않는다(§8 dt 폭주 완화). */
  fixedDeltaMs: 1000 / 60,
} as const;

export type EntityKind = 'bird' | 'pig' | 'block' | 'ground' | 'wall';

export interface EntityMeta {
  kind: EntityKind;
  material?: Material;
  hp: number;
  maxHp: number;
  score: number;
}

export const STAGE_COUNT = 10;
