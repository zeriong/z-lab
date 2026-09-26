/**
 * 재질·돼지·새 물리 파라미터 (§6.4 표). 전부 튜닝 대상이며
 * 디버그 패널이 이 객체를 제자리에서 수정한다 (새로 생성되는 바디부터 반영).
 */
import type { BirdKind, Material, PigSize } from '../levels/types';

export interface MaterialParams {
  density: number;
  friction: number;
  restitution: number;
  frictionAir: number;
  health: number;
  /** 취약도: damage = impact × vulnerability */
  vulnerability: number;
  /** 파괴 점수 */
  score: number;
  /** 렌더 색 */
  color: string;
  edge: string;
}

export const MATERIALS: Record<Material, MaterialParams> = {
  ice: {
    density: 0.0009,
    friction: 0.3,
    restitution: 0.1,
    frictionAir: 0.01,
    health: 20,
    vulnerability: 2.0,
    score: 300,
    color: 'rgba(160, 220, 255, 0.75)',
    edge: '#6fb6e6',
  },
  wood: {
    density: 0.0012,
    friction: 0.6,
    restitution: 0.1,
    frictionAir: 0.01,
    health: 18,
    vulnerability: 1.0,
    score: 500,
    color: '#c98a4b',
    edge: '#7a4a1e',
  },
  stone: {
    density: 0.0025,
    friction: 0.7,
    restitution: 0.05,
    frictionAir: 0.01,
    health: 30,
    vulnerability: 0.6,
    score: 800,
    color: '#9a9a9a',
    edge: '#4f4f4f',
  },
};

export interface PigParams {
  density: number;
  friction: number;
  restitution: number;
  frictionAir: number;
  vulnerability: number;
  score: number;
}

export const PIG: PigParams = {
  density: 0.0015,
  friction: 0.5,
  restitution: 0.2,
  frictionAir: 0.01,
  vulnerability: 1.5,
  score: 5000,
};

export const PIG_SIZES: Record<PigSize, { r: number; health: number }> = {
  small: { r: 14, health: 10 },
  medium: { r: 20, health: 12 },
  large: { r: 26, health: 16 },
};

export interface BirdParams {
  r: number;
  density: number;
  friction: number;
  restitution: number;
  frictionAir: number;
  /** 클리어 시 미사용 새 1마리당 보너스 */
  unusedScore: number;
}

export const BIRD: BirdParams = {
  r: 18,
  density: 0.004,
  friction: 0.5,
  restitution: 0.3,
  frictionAir: 0,
  unusedScore: 10000,
};

export const BIRD_COLORS: Record<BirdKind, string> = {
  red: '#d83a2a',
  yellow: '#f2c230',
  black: '#2b2b2b',
};
