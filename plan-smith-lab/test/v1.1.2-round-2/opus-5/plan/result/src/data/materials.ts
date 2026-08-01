/**
 * 재료 테이블 (플랜 §4).
 * 스테이지 JSON은 물리 수치를 갖지 않는다 — 밸런싱은 전부 이 파일에서 돌린다.
 */
export type MaterialName = 'wood' | 'ice' | 'stone';

export interface MaterialDef {
  density: number;
  friction: number;
  frictionStatic: number;
  restitution: number;
  /** 단위 면적 기준 hp 계수(실제 hp = hpBase * areaFactor) */
  hpBase: number;
  /** 이 값 이하의 충격은 무시한다 */
  breakThreshold: number;
  fill: string;
  stroke: string;
  /** 파편 파티클 색 */
  debris: string;
  score: number;
}

export const MATERIALS: Record<MaterialName, MaterialDef> = {
  wood: {
    density: 0.0012,
    friction: 0.55,
    frictionStatic: 0.7,
    restitution: 0.12,
    hpBase: 60,
    breakThreshold: 6,
    fill: '#c9884a',
    stroke: '#8a5626',
    debris: '#d9a066',
    score: 500,
  },
  ice: {
    density: 0.0008,
    friction: 0.08,
    frictionStatic: 0.12,
    restitution: 0.26,
    hpBase: 30,
    breakThreshold: 3,
    fill: '#a5dced',
    stroke: '#5fa9c4',
    debris: '#d8f2fb',
    score: 500,
  },
  stone: {
    density: 0.0026,
    friction: 0.62,
    frictionStatic: 0.8,
    restitution: 0.04,
    hpBase: 140,
    breakThreshold: 12,
    fill: '#8d9297',
    stroke: '#5b6166',
    debris: '#b3b8bd',
    score: 500,
  },
};

/** 면적 보정: 큰 블록은 조금 더 튼튼하다 (기준 면적 3360 = 24×140 판자) */
export function blockHp(material: MaterialName, w: number, h: number): number {
  const area = w * h;
  const factor = 0.6 + 0.4 * Math.min(2.2, area / 3360);
  return MATERIALS[material].hpBase * factor;
}

export type PigSize = 'small' | 'large';

export interface PigDef {
  r: number;
  hp: number;
  density: number;
  breakThreshold: number;
  score: number;
  fill: string;
  stroke: string;
}

export const PIGS: Record<PigSize, PigDef> = {
  small: { r: 22, hp: 20, density: 0.0015, breakThreshold: 1.5, score: 5000, fill: '#7bc86c', stroke: '#3f7a34' },
  large: { r: 34, hp: 34, density: 0.0015, breakThreshold: 2.5, score: 5000, fill: '#69b95c', stroke: '#356b2c' },
};

export type BirdType = 'basic';

export interface BirdDef {
  r: number;
  density: number;
  friction: number;
  restitution: number;
  fill: string;
  stroke: string;
}

/** §9: 새 종류별 특수 능력은 이번 범위 밖. 1종만. */
export const BIRDS: Record<BirdType, BirdDef> = {
  basic: {
    r: 20,
    density: 0.004,
    friction: 0.4,
    restitution: 0.25,
    fill: '#e2564a',
    stroke: '#94271f',
  },
};

/** 점수 규칙 (플랜 §5) */
export const SCORE = {
  PIG: 5000,
  BLOCK: 500,
  BIRD_LEFT: 10000,
} as const;

/** 물리 상수: 중력 y 배율. 궤적 예측은 World.gravityPerStep을 참조한다. */
export const GRAVITY_Y = 1;

/** 슬링샷 상수 (플랜 §5) */
export const SLING = {
  /** 월드 단위 최대 당김 거리 */
  maxPull: 96,
  /** 히트테스트 관용: 새 반경 × 1.8 */
  grabRadiusFactor: 1.8,
  /** 최대 발사 속도 (px/step) */
  maxSpeed: 24,
} as const;

/** settle 판정 (플랜 §5) */
export const SETTLE = {
  speed: 0.4,
  angularSpeed: 0.05,
  frames: 30,
  timeoutMs: 3500,
} as const;

/** 모바일 성능 상한 (플랜 R4) */
export const PERF = {
  maxParticles: 120,
  dprCap: 2,
  debrisLifeMs: 1200,
} as const;
