/**
 * §4 엔티티 모델.
 * Matter body를 상속/래핑하지 않고 body.plugin에 게임 데이터를 붙인다(Matter가 공식으로 남겨둔 슬롯).
 * 재료 상수는 §4.3 표 그대로 — 튜닝은 이 표만 고친다.
 */

import { Bodies, Body } from 'matter-js';
import type { BirdType, BlockData, BlockMaterial, GroundData, PigData } from '../stages/schema';

/** §4.1 충돌 카테고리 */
export const CAT = {
  BIRD: 0x0001,
  PIG: 0x0002,
  BLOCK: 0x0004,
  GROUND: 0x0008,
  DEBRIS: 0x0010,
} as const;

const MASK_BIRD = CAT.PIG | CAT.BLOCK | CAT.GROUND;
const MASK_PIG = CAT.BIRD | CAT.BLOCK | CAT.GROUND | CAT.PIG;
const MASK_BLOCK = CAT.BIRD | CAT.BLOCK | CAT.GROUND | CAT.PIG;
const MASK_GROUND = CAT.BIRD | CAT.BLOCK | CAT.GROUND | CAT.PIG | CAT.DEBRIS;

export type Material = BlockMaterial | 'pig' | 'ground';
export type Kind = 'bird' | 'pig' | 'block' | 'ground';

export interface GameData {
  kind: Kind;
  material: Material;
  hp: number;
  maxHp: number;
  /** 이번 스텝에 파괴 확정 (중복 처리 방지) */
  dead: boolean;
  birdType?: BirdType;
  abilityUsed?: boolean;
  /** black bird: 첫 충돌 시각(스텝 카운트). -1이면 미충돌 */
  firstHitStep?: number;
  /** 원 스테이지 좌표 — 프리롤 이동량 검사용(§10.2) */
  spawnX?: number;
  spawnY?: number;
  /** ball/box 렌더 구분 */
  round?: boolean;
  radius?: number;
}

export interface MaterialSpec {
  density: number;
  restitution: number;
  friction: number;
  hp: number;
  /** 데미지 임계 */
  threshold: number;
  /** 파괴 점수 */
  score: number;
  color: string;
  /** 파편 색 */
  debris: string;
}

/** §4.3 재료 상수표 */
export const MATERIAL: Record<Material, MaterialSpec> = {
  wood: {
    density: 0.0015,
    restitution: 0.2,
    friction: 0.6,
    hp: 60,
    threshold: 8,
    score: 60,
    color: '#c88a4a',
    debris: '#a8703a',
  },
  ice: {
    density: 0.001,
    restitution: 0.1,
    friction: 0.15,
    hp: 35,
    threshold: 5,
    score: 40,
    color: '#a8dcf0',
    debris: '#d8f2ff',
  },
  stone: {
    density: 0.0035,
    restitution: 0.1,
    friction: 0.8,
    hp: 140,
    threshold: 14,
    score: 90,
    color: '#8f8f95',
    debris: '#6e6e75',
  },
  pig: {
    density: 0.0012,
    restitution: 0.35,
    friction: 0.5,
    hp: 45,
    threshold: 6,
    score: 500,
    color: '#7dc242',
    debris: '#5aa02c',
  },
  ground: {
    density: 0.005,
    restitution: 0.2,
    friction: 0.9,
    hp: Infinity,
    threshold: Infinity,
    score: 0,
    color: '#5b4636',
    debris: '#4a382b',
  },
};

export interface BirdSpec {
  radius: number;
  density: number;
  /** 데미지 배율 */
  dmgMul: number;
  color: string;
  ability: 'none' | 'boost' | 'bomb';
  label: string;
}

/** §4.3 새 표 */
export const BIRD: Record<BirdType, BirdSpec> = {
  red: { radius: 14, density: 0.004, dmgMul: 1.0, color: '#e2402f', ability: 'none', label: '레드' },
  yellow: {
    radius: 13,
    density: 0.0035,
    dmgMul: 1.3,
    color: '#f5d020',
    ability: 'boost',
    label: '옐로',
  },
  black: {
    radius: 16,
    density: 0.005,
    dmgMul: 1.0,
    color: '#2b2b30',
    ability: 'bomb',
    label: '블랙',
  },
};

/** 새 능력 상수 (§4.3 / §6.2) */
export const YELLOW_BOOST = 1.9;
export const BLACK_FUSE_STEPS = 36; // 0.6초 @60fps
export const EXPLOSION_RADIUS = 90;
export const EXPLOSION_POWER = 0.055;

export function getGame(body: Body): GameData | undefined {
  return (body.plugin as { game?: GameData } | undefined)?.game;
}

function attach(body: Body, game: GameData): Body {
  (body.plugin as { game?: GameData }).game = game;
  return body;
}

export function createGround(g: GroundData): Body {
  const body = Bodies.rectangle(g.x + g.w / 2, g.y + g.h / 2, g.w, g.h, {
    isStatic: true,
    label: 'ground',
    friction: MATERIAL.ground.friction,
    restitution: MATERIAL.ground.restitution,
    collisionFilter: { category: CAT.GROUND, mask: MASK_GROUND },
  });
  return attach(body, {
    kind: 'ground',
    material: 'ground',
    hp: Infinity,
    maxHp: Infinity,
    dead: false,
  });
}

export function createBlock(b: BlockData): Body {
  const spec = MATERIAL[b.material];
  const opts = {
    label: `block:${b.material}`,
    density: spec.density,
    restitution: spec.restitution,
    friction: spec.friction,
    frictionStatic: spec.friction + 0.2,
    frictionAir: 0.001,
    slop: 0.03,
    collisionFilter: { category: CAT.BLOCK, mask: MASK_BLOCK },
  };

  const body =
    b.shape === 'ball'
      ? Bodies.circle(b.x, b.y, b.w / 2, opts)
      : Bodies.rectangle(b.x, b.y, b.w, b.h, opts);

  if (b.angle) Body.setAngle(body, b.angle);

  const hp = b.hp ?? spec.hp;
  return attach(body, {
    kind: 'block',
    material: b.material,
    hp,
    maxHp: hp,
    dead: false,
    spawnX: b.x,
    spawnY: b.y,
    round: b.shape === 'ball',
    radius: b.w / 2,
  });
}

export function createPig(p: PigData): Body {
  const spec = MATERIAL.pig;
  const body = Bodies.circle(p.x, p.y, p.r, {
    label: 'pig',
    density: spec.density,
    restitution: spec.restitution,
    friction: spec.friction,
    frictionAir: 0.002,
    slop: 0.03,
    collisionFilter: { category: CAT.PIG, mask: MASK_PIG },
  });
  const hp = p.hp ?? spec.hp;
  return attach(body, {
    kind: 'pig',
    material: 'pig',
    hp,
    maxHp: hp,
    dead: false,
    spawnX: p.x,
    spawnY: p.y,
    round: true,
    radius: p.r,
  });
}

export function createBird(type: BirdType, x: number, y: number): Body {
  const spec = BIRD[type];
  const body = Bodies.circle(x, y, spec.radius, {
    label: `bird:${type}`,
    density: spec.density,
    restitution: 0.35,
    friction: 0.55,
    frictionAir: 0.002,
    slop: 0.02,
    collisionFilter: { category: CAT.BIRD, mask: MASK_BIRD },
  });
  return attach(body, {
    kind: 'bird',
    material: 'wood', // 새는 재료 데미지 대상이 아니다 — 표 접근 시 안전값
    hp: Infinity,
    maxHp: Infinity,
    dead: false,
    birdType: type,
    abilityUsed: false,
    firstHitStep: -1,
    round: true,
    radius: spec.radius,
  });
}
