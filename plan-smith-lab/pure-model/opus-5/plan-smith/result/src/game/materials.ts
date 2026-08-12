/**
 * 재질 상수 테이블 (§6.2).
 *
 * 여기 있는 숫자는 **전부 초기값**이다. 교체 지점은 §9 Step 10 밸런싱 패스이며,
 * 교체할 때는 값 옆에 "무엇을 보고 바꿨는지" 한 줄을 남긴다.
 *
 * 이 파일이 존재하는 이유(§11 판정): Matter를 쓰기로 하면서 패자(자체 물리) 논거를
 * 제약으로 승격시켰다 — 파괴 규칙의 손잡이는 엔진 내부(restitution/slop)가 아니라
 * 이 테이블 하나에 모여 있어야 한다. 튜닝 왕복이 4회를 넘으면 R38이 발화한다.
 */

export type MaterialName = 'glass' | 'wood' | 'stone' | 'tnt';
export type PigSize = 'small' | 'boss';
export type BirdKind = 'red' | 'bomb' | 'speed';

export interface MaterialSpec {
  hp: number;
  /** 이 임계 미만의 임펄스는 데미지 0 — "스치면 안 부서진다"의 유일한 장치 */
  threshold: number;
  density: number;
  friction: number;
  restitution: number;
  /** 파괴 시 가산 점수 */
  score: number;
  fill: string;
  stroke: string;
  /** 파편 파티클 색 */
  shard: string;
}

export const MATERIALS: Record<MaterialName, MaterialSpec> = {
  glass: {
    hp: 12,
    threshold: 2,
    density: 0.0008,
    friction: 0.4,
    restitution: 0.05,
    score: 500,
    fill: 'rgba(150, 214, 226, 0.55)',
    stroke: 'rgba(224, 248, 255, 0.85)',
    shard: '#cbeaf2',
  },
  wood: {
    hp: 30,
    threshold: 6,
    density: 0.0015,
    friction: 0.6,
    restitution: 0.02,
    score: 500,
    fill: '#c08a4a',
    stroke: '#7d5327',
    shard: '#a9743a',
  },
  stone: {
    hp: 70,
    threshold: 14,
    density: 0.0035,
    friction: 0.7,
    restitution: 0.02,
    score: 500,
    fill: '#8f949c',
    stroke: '#5c6068',
    shard: '#787d85',
  },
  tnt: {
    hp: 10,
    threshold: 3,
    density: 0.0012,
    friction: 0.5,
    restitution: 0.02,
    score: 1000,
    fill: '#c8362c',
    stroke: '#f0d24a',
    shard: '#e8574a',
  },
};

export interface PigSpec {
  hp: number;
  threshold: number;
  density: number;
  friction: number;
  restitution: number;
  score: number;
  radius: number;
  fill: string;
}

export const PIGS: Record<PigSize, PigSpec> = {
  small: {
    hp: 20,
    threshold: 4,
    density: 0.001,
    friction: 0.5,
    restitution: 0.1,
    score: 5000,
    radius: 24,
    fill: '#7ac36a',
  },
  boss: {
    hp: 60,
    threshold: 8,
    density: 0.002,
    friction: 0.5,
    restitution: 0.1,
    score: 10000,
    radius: 44,
    fill: '#4f9a3f',
  },
};

export interface BirdSpec {
  radius: number;
  density: number;
  friction: number;
  restitution: number;
  frictionAir: number;
  fill: string;
  /** 비행 중 탭으로 발동하는 능력 (R12) */
  ability: 'none' | 'detonate' | 'dash';
  label: string;
}

export const BIRDS: Record<BirdKind, BirdSpec> = {
  red: {
    radius: 18,
    density: 0.004,
    friction: 0.4,
    restitution: 0.35,
    // frictionAir 0.005: Matter 기본 0.01은 궤적 예측(공기저항 무시 모델)과
    // 눈에 띄게 어긋난다. 0으로 두면 잔해가 영원히 구르므로 절반만 남긴다.
    frictionAir: 0.005,
    fill: '#e0483c',
    ability: 'none',
    label: '빨강',
  },
  bomb: {
    radius: 20,
    density: 0.005,
    friction: 0.5,
    restitution: 0.2,
    frictionAir: 0.005,
    fill: '#33373f',
    ability: 'detonate',
    label: '폭탄',
  },
  speed: {
    radius: 15,
    density: 0.0035,
    friction: 0.3,
    restitution: 0.3,
    frictionAir: 0.004,
    fill: '#f5d24a',
    ability: 'dash',
    label: '스피드',
  },
};

/** 폭탄 새의 자폭 — TNT와 같은 규칙을 쓰되 반경/데미지가 더 크다 */
export const BOMB_BIRD_BLAST = { radius: 150, impulse: 0.08, damage: 26 };

/** 스피드 새의 가속 배율 (진행 방향으로 곱한다) */
export const DASH_MULTIPLIER = 1.9;

/** TNT 폭발 파라미터 (§7.3) */
export const TNT_BLAST = { radius: 120, impulse: 0.06, damage: 20 };

/** 연쇄 폭발 재귀 깊이 상한 — 임의값, 무한 연쇄 방지용 (§7.3) */
export const MAX_CHAIN_DEPTH = 8;
