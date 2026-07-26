import type { MaterialType } from "../types";

export interface MaterialSpec {
  density: number;
  friction: number;
  restitution: number;
  /** 내구도(hp). 누적 충격이 이 값을 넘으면 파괴 */
  hp: number;
  color: string;
  strokeColor: string;
  /** 파편 색상 (파티클용) */
  debrisColor: string;
  /** 파괴 시 점수 */
  score: number;
}

export const MATERIALS: Record<MaterialType, MaterialSpec> = {
  wood: {
    density: 0.0025,
    friction: 0.6,
    restitution: 0.05,
    hp: 55,
    color: "#c98a4b",
    strokeColor: "#8a5a2b",
    debrisColor: "#8a5a2b",
    score: 200,
  },
  stone: {
    density: 0.006,
    friction: 0.8,
    restitution: 0.02,
    hp: 130,
    color: "#9a9a9a",
    strokeColor: "#5f5f5f",
    debrisColor: "#6f6f6f",
    score: 350,
  },
  glass: {
    density: 0.0015,
    friction: 0.3,
    restitution: 0.1,
    hp: 18,
    color: "#bfe6f0",
    strokeColor: "#7fb8cc",
    debrisColor: "#8fd0e3",
    score: 150,
  },
};
