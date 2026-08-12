export type MaterialType = 'glass' | 'wood' | 'stone' | 'tnt' | 'pig_small' | 'pig_boss'

export interface Material {
  hp: number
  threshold: number // impulse threshold
  density: number
  friction: number
  score: number
  color: string
}

export const materials: Record<MaterialType, Material> = {
  glass: {
    hp: 12,
    threshold: 2,
    density: 0.0008,
    friction: 0.4,
    score: 500,
    color: '#B0E0E6'
  },
  wood: {
    hp: 30,
    threshold: 6,
    density: 0.0015,
    friction: 0.6,
    score: 500,
    color: '#8B4513'
  },
  stone: {
    hp: 70,
    threshold: 14,
    density: 0.0035,
    friction: 0.7,
    score: 500,
    color: '#808080'
  },
  tnt: {
    hp: 10,
    threshold: 3,
    density: 0.0012,
    friction: 0.5,
    score: 1000,
    color: '#FF6347'
  },
  pig_small: {
    hp: 20,
    threshold: 4,
    density: 0.0010,
    friction: 0.5,
    score: 5000,
    color: '#FFB347'
  },
  pig_boss: {
    hp: 60,
    threshold: 8,
    density: 0.0020,
    friction: 0.5,
    score: 10000,
    color: '#FF8C00'
  }
}

export function getMaterial(type: MaterialType): Material {
  return materials[type]
}
