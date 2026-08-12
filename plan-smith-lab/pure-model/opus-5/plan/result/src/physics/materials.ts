import type { BirdKind, MaterialKind, PigSize } from '../data/levelSchema';

/**
 * Single tuning table (plan §6.1). Everything that decides "how hard is it to
 * break X" lives here — spread across entity files it becomes untunable.
 *
 * Units follow Matter's convention: velocity is px/step at 60 Hz, mass is
 * density * area. `threshold` is compared against the approximated collision
 * energy from collisionRules.ts.
 */

export interface MaterialSpec {
  key: string;
  density: number;
  friction: number;
  frictionStatic: number;
  restitution: number;
  frictionAir: number;
  /** Hit points; damage above `threshold` chips away at this. */
  hp: number;
  /** Impacts below this energy do nothing at all — stops self-collapse. */
  threshold: number;
  damageScale: number;
  score: number;
  fill: string;
  stroke: string;
  debris: string;
}

export const MATERIALS: Record<MaterialKind, MaterialSpec> = {
  glass: {
    key: 'glass',
    density: 0.0008,
    friction: 0.4,
    frictionStatic: 0.6,
    restitution: 0.1,
    frictionAir: 0.01,
    hp: 30,
    threshold: 8,
    damageScale: 0.9,
    score: 500,
    fill: 'rgba(150, 216, 245, 0.72)',
    stroke: 'rgba(238, 253, 255, 0.95)',
    debris: '#bfe9fb',
  },
  wood: {
    key: 'wood',
    density: 0.0015,
    friction: 0.6,
    frictionStatic: 0.9,
    restitution: 0.15,
    frictionAir: 0.01,
    hp: 80,
    threshold: 20,
    damageScale: 0.35,
    score: 700,
    fill: '#c98b4b',
    stroke: '#8a5a2b',
    debris: '#a8703a',
  },
  stone: {
    key: 'stone',
    density: 0.0035,
    friction: 0.7,
    frictionStatic: 1,
    restitution: 0.05,
    frictionAir: 0.01,
    hp: 200,
    threshold: 40,
    damageScale: 0.22,
    score: 1000,
    fill: '#9aa3ab',
    stroke: '#666f77',
    debris: '#8b949c',
  },
};

export const PIG_MATERIAL: MaterialSpec = {
  key: 'pig',
  density: 0.0012,
  friction: 0.5,
  frictionStatic: 0.7,
  restitution: 0.2,
  frictionAir: 0.01,
  hp: 40,
  threshold: 6,
  damageScale: 0.7,
  score: 5000,
  fill: '#7ec850',
  stroke: '#4e8f2f',
  debris: '#8fd45f',
};

export const PIG_HP: Record<PigSize, number> = {
  small: 40,
  medium: 75,
};

export interface BirdSpec {
  kind: BirdKind;
  radius: number;
  density: number;
  friction: number;
  frictionStatic: number;
  restitution: number;
  frictionAir: number;
  body: string;
  belly: string;
  beak: string;
  /** UI copy for the ability hint shown while flying. */
  ability: string;
}

export const BIRDS: Record<BirdKind, BirdSpec> = {
  basic: {
    kind: 'basic',
    radius: 18,
    density: 0.0025,
    friction: 0.5,
    frictionStatic: 0.6,
    restitution: 0.4,
    frictionAir: 0.006,
    body: '#e2483c',
    belly: '#f6d6b8',
    beak: '#f7b32b',
    ability: '',
  },
  speed: {
    kind: 'speed',
    radius: 15,
    density: 0.002,
    friction: 0.4,
    frictionStatic: 0.5,
    restitution: 0.45,
    frictionAir: 0.004,
    body: '#f2c14e',
    belly: '#fdf0c4',
    beak: '#e07a1f',
    ability: 'TAP: 가속',
  },
  bomb: {
    kind: 'bomb',
    radius: 21,
    density: 0.0045,
    friction: 0.6,
    frictionStatic: 0.7,
    restitution: 0.25,
    frictionAir: 0.008,
    body: '#3a3f47',
    belly: '#5b626c',
    beak: '#f0a01e',
    ability: 'TAP: 폭발',
  },
};

/** Ability constants (plan §4.2 / §6.2). */
export const SPEED_BOOST = 1.65;
export const BOMB_RADIUS = 190;
export const BOMB_IMPULSE = 46;
export const BOMB_ENERGY = 260;

/** Static geometry (ground) needs no hp, only surface behaviour. */
export const GROUND_SURFACE = {
  friction: 0.85,
  frictionStatic: 1,
  restitution: 0.05,
};
