export interface MaterialProps {
  hp: number;
  threshold: number;
  density: number;
  friction: number;
  points: number;
}

export const materials: Record<string, MaterialProps> = {
  glass: {
    hp: 12,
    threshold: 2,
    density: 0.0008,
    friction: 0.4,
    points: 500
  },
  wood: {
    hp: 30,
    threshold: 6,
    density: 0.0015,
    friction: 0.6,
    points: 500
  },
  stone: {
    hp: 70,
    threshold: 14,
    density: 0.0035,
    friction: 0.7,
    points: 500
  },
  tnt: {
    hp: 10,
    threshold: 3,
    density: 0.0012,
    friction: 0.5,
    points: 1000
  },
  pig_small: {
    hp: 20,
    threshold: 4,
    density: 0.0010,
    friction: 0.5,
    points: 5000
  },
  pig_boss: {
    hp: 60,
    threshold: 8,
    density: 0.0020,
    friction: 0.5,
    points: 10000
  }
};
