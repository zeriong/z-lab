/**
 * 재질·새·돼지·TNT 테이블 (§5.3). 수치는 초기값이다.
 */

export type BirdKind = 'red' | 'yellow' | 'bomb';
export type PigSize = 'S' | 'M' | 'L';
export type Material = 'glass' | 'wood' | 'stone';

export const BIRD_KINDS: readonly BirdKind[] = ['red', 'yellow', 'bomb'];
export const PIG_SIZES: readonly PigSize[] = ['S', 'M', 'L'];
export const MATERIALS: readonly Material[] = ['glass', 'wood', 'stone'];

export interface FixtureSpec {
  density: number;
  friction: number;
  restitution: number;
}

export interface BirdSpec extends FixtureSpec {
  kind: BirdKind;
  /** px */
  radius: number;
  color: string;
  label: string;
}

export const BIRDS: Readonly<Record<BirdKind, BirdSpec>> = {
  red: {
    kind: 'red',
    radius: 22,
    density: 3.0,
    friction: 0.5,
    restitution: 0.2,
    color: '#d7263d',
    label: '빨강',
  },
  yellow: {
    kind: 'yellow',
    radius: 20,
    density: 3.0,
    friction: 0.5,
    restitution: 0.2,
    color: '#f4c20d',
    label: '노랑',
  },
  bomb: {
    kind: 'bomb',
    radius: 26,
    density: 4.0,
    friction: 0.5,
    restitution: 0.15,
    color: '#26262b',
    label: '폭탄',
  },
};

export interface PigSpec extends FixtureSpec {
  size: PigSize;
  radius: number;
  hp: number;
  score: number;
  angularDamping: number;
}

export const PIGS: Readonly<Record<PigSize, PigSpec>> = {
  S: { size: 'S', radius: 20, density: 1.0, friction: 0.6, restitution: 0.1, hp: 40, score: 5000, angularDamping: 0.8 },
  M: { size: 'M', radius: 28, density: 1.0, friction: 0.6, restitution: 0.1, hp: 70, score: 5000, angularDamping: 0.8 },
  L: { size: 'L', radius: 38, density: 1.0, friction: 0.6, restitution: 0.1, hp: 120, score: 5000, angularDamping: 0.8 },
};

export interface MaterialSpec extends FixtureSpec {
  material: Material;
  hp: number;
  score: number;
  /**
   * 충격 데미지 배율. 단일 K로는 무거운 돌 판자가 오히려 더 큰 충격량을 받아
   * A1(유리·나무 파괴, 돌은 HP 60% 이상 유지)을 만족할 수 없으므로 재질별 배율을 튜닝 노브로 둔다.
   * 폭발 데미지에는 적용하지 않는다.
   */
  impactFactor: number;
  fill: string;
  stroke: string;
  label: string;
}

export const MATERIAL_SPECS: Readonly<Record<Material, MaterialSpec>> = {
  glass: {
    material: 'glass',
    density: 0.9,
    friction: 0.2,
    restitution: 0.05,
    hp: 50,
    score: 300,
    impactFactor: 1.0,
    fill: 'rgba(170, 225, 255, 0.55)',
    stroke: 'rgba(90, 160, 210, 0.95)',
    label: '유리',
  },
  wood: {
    material: 'wood',
    density: 0.6,
    friction: 0.6,
    restitution: 0.1,
    hp: 100,
    score: 500,
    impactFactor: 1.0,
    fill: '#b7803f',
    stroke: '#6e4518',
    label: '나무',
  },
  stone: {
    material: 'stone',
    density: 2.4,
    friction: 0.8,
    restitution: 0.02,
    hp: 250,
    score: 800,
    impactFactor: 0.2,
    fill: '#8d9199',
    stroke: '#51555c',
    label: '돌',
  },
};

export interface TntSpec extends FixtureSpec {
  w: number;
  h: number;
  hp: number;
  score: number;
}

export const TNT: Readonly<TntSpec> = {
  w: 40,
  h: 40,
  density: 0.6,
  friction: 0.6,
  restitution: 0.1,
  hp: 20,
  score: 1000,
};

export interface ExplosionSpec {
  /** px */
  radius: number;
  /** 최대 충격량 (N·s). 앵커 A6로 맞춘다. */
  impulseMax: number;
  /** 최대 데미지 */
  damageMax: number;
}

export type ExplosionSource = 'bomb' | 'tnt';

/**
 * 폭발 (§5.6). 폭탄 새 D_max는 A6(3×3 돌 상자 격자 중앙 폭발 시 인접 4개 파괴,
 * 중심 거리 40px에서 HP 250 이상)를 만족하도록 초기값 300에서 360으로 올렸다.
 */
export const EXPLOSIONS: Readonly<Record<ExplosionSource, ExplosionSpec>> = {
  bomb: { radius: 160, impulseMax: 12, damageMax: 360 },
  tnt: { radius: 180, impulseMax: 10, damageMax: 200 },
};

export const TERRAIN_FIXTURE: Readonly<FixtureSpec> = { density: 0, friction: 0.9, restitution: 0.05 };
export const GROUND_FIXTURE: Readonly<FixtureSpec> = { density: 0, friction: 0.9, restitution: 0.05 };

export const SCORE = {
  pig: 5000,
  birdLeft: 10000,
} as const;
