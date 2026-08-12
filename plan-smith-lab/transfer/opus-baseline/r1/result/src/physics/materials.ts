export interface Material {
  density: number;
  friction: number;
  restitution: number;
  hp: number;
  damageThreshold: number;
  damageScale: number;
  score: number;
  color: string;
}

export const MATERIALS: Record<string, Material> = {
  glass: {
    density: 0.0008,
    friction: 0.4,
    restitution: 0.1,
    hp: 30,
    damageThreshold: 0.3,
    damageScale: 2.0,
    score: 500,
    color: '#e0f2ff',
  },
  wood: {
    density: 0.0015,
    friction: 0.6,
    restitution: 0.15,
    hp: 80,
    damageThreshold: 0.7,
    damageScale: 1.2,
    score: 700,
    color: '#8b4513',
  },
  stone: {
    density: 0.0035,
    friction: 0.7,
    restitution: 0.05,
    hp: 200,
    damageThreshold: 1.5,
    damageScale: 0.8,
    score: 1000,
    color: '#999999',
  },
  pig: {
    density: 0.0012,
    friction: 0.5,
    restitution: 0.2,
    hp: 40,
    damageThreshold: 0.4,
    damageScale: 1.5,
    score: 5000,
    color: '#ff9800',
  },
  bird: {
    density: 0.0025,
    friction: 0.5,
    restitution: 0.4,
    hp: 999,
    damageThreshold: 0,
    damageScale: 0,
    score: 0,
    color: '#ffd54f',
  },
};

export function getMaterial(name: string): Material {
  return MATERIALS[name] || MATERIALS.bird;
}
