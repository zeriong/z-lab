import type { MaterialType, PigSize } from '../data/schema';

export interface MaterialProperties {
  hp: number;
  threshold: number;
  density: number;
  friction: number;
  breakScore: number;
}

export const MATERIALS: Record<MaterialType, MaterialProperties> = {
  glass: {
    hp: 12,
    threshold: 2,
    density: 0.0008,
    friction: 0.4,
    breakScore: 500,
  },
  wood: {
    hp: 30,
    threshold: 6,
    density: 0.0015,
    friction: 0.6,
    breakScore: 500,
  },
  stone: {
    hp: 70,
    threshold: 14,
    density: 0.0035,
    friction: 0.7,
    breakScore: 500,
  },
  tnt: {
    hp: 10,
    threshold: 3,
    density: 0.0012,
    friction: 0.5,
    breakScore: 1000,
  },
};

export const PIG_PROPERTIES: Record<PigSize, MaterialProperties> = {
  small: {
    hp: 20,
    threshold: 4,
    density: 0.001,
    friction: 0.5,
    breakScore: 5000,
  },
  boss: {
    hp: 60,
    threshold: 8,
    density: 0.002,
    friction: 0.5,
    breakScore: 10000,
  },
};

export function getMaterialProperties(material: MaterialType): MaterialProperties {
  return MATERIALS[material];
}

export function getPigProperties(size: PigSize): MaterialProperties {
  return PIG_PROPERTIES[size];
}
