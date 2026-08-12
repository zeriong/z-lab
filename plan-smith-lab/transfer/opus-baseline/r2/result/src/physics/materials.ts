export interface MaterialProperties {
  density: number;
  friction: number;
  restitution: number;
  hp: number;
  damageThreshold: number;
  damageScale: number;
  score: number;
}

export const MATERIALS: Record<string, MaterialProperties> = {
  glass: {
    density: 0.0008,
    friction: 0.4,
    restitution: 0.1,
    hp: 30,
    damageThreshold: 1,
    damageScale: 1.5,
    score: 500
  },
  wood: {
    density: 0.0015,
    friction: 0.6,
    restitution: 0.15,
    hp: 80,
    damageThreshold: 3,
    damageScale: 1.2,
    score: 700
  },
  stone: {
    density: 0.0035,
    friction: 0.7,
    restitution: 0.05,
    hp: 200,
    damageThreshold: 8,
    damageScale: 0.8,
    score: 1000
  },
  pig: {
    density: 0.0012,
    friction: 0.5,
    restitution: 0.2,
    hp: 40,
    damageThreshold: 1,
    damageScale: 1.3,
    score: 5000
  },
  bird: {
    density: 0.0025,
    friction: 0.5,
    restitution: 0.4,
    hp: 1000,
    damageThreshold: 999,
    damageScale: 0,
    score: 0
  },
  ground: {
    density: 0,
    friction: 0.8,
    restitution: 0.0,
    hp: 999999,
    damageThreshold: 999999,
    damageScale: 0,
    score: 0
  }
};

export function getMaterial(type: string): MaterialProperties {
  return MATERIALS[type] || MATERIALS.wood;
}
