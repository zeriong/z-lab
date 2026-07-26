import type { BirdType } from "../types";

export interface BirdSpec {
  radius: number;
  density: number;
  friction: number;
  restitution: number;
  color: string;
  strokeColor: string;
  label: string;
  /** 발사 후 탭(클릭)으로 능력 발동 여부 */
  hasAbility: boolean;
  description: string;
}

export const BIRDS: Record<BirdType, BirdSpec> = {
  normal: {
    radius: 18,
    density: 0.004,
    friction: 0.5,
    restitution: 0.3,
    color: "#e33d3d",
    strokeColor: "#8f1f1f",
    label: "레드",
    hasAbility: false,
    description: "균형잡힌 기본 새",
  },
  speedy: {
    radius: 15,
    density: 0.0032,
    friction: 0.4,
    restitution: 0.35,
    color: "#f2d43d",
    strokeColor: "#a68c1f",
    label: "스피디",
    hasAbility: true,
    description: "비행 중 탭하면 순간 가속",
  },
  bomb: {
    radius: 19,
    density: 0.0055,
    friction: 0.5,
    restitution: 0.15,
    color: "#3a3a3a",
    strokeColor: "#000000",
    label: "폭탄",
    hasAbility: true,
    description: "비행 중 탭하면 주변에 폭발",
  },
};

/** 새 발사 시 당김 벡터에 곱하는 속도 계수 */
export const LAUNCH_POWER = 0.185;
/** 새총 최대 당김 반경(px) */
export const MAX_PULL_RADIUS = 120;
/** 스피디 새 가속 배율 */
export const SPEEDY_BOOST = 1.7;
/** 폭탄 새 폭발 반경(px) */
export const BOMB_RADIUS = 160;
/** 폭탄 새 폭발 임펄스 세기 */
export const BOMB_FORCE = 0.045;
