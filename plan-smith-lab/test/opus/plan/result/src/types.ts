// Shared types, constants and material tables for the game.

/** Logical (design) resolution. The canvas is scaled to fit the viewport. */
export const W = 1280;
export const H = 720;

/** Ground surface Y (top of the ground strip). Bodies rest on this line. */
export const GROUND_Y = 640;

/** Physics tuning. Velocities are in Matter units (~pixels per 60fps step). */
export const GRAVITY_Y = 1.6;
export const MAX_PULL = 140;      // max slingshot draw distance in px
export const LAUNCH_POWER = 0.17; // launch speed = pull_distance * LAUNCH_POWER
export const BIRD_RADIUS = 18;

/** Impact model: relative collision speed below this deals no damage. */
export const IMPACT_MIN = 4;
/** Damage per unit of relative speed above IMPACT_MIN. */
export const IMPACT_SCALE = 7;

/** A body is "at rest" when its speed is under this. */
export const SETTLE_SPEED = 0.55;
/** Seconds the whole world must stay at rest before a FAIL is declared. */
export const SETTLE_HOLD = 1.1;

export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'CLEAR' | 'FAIL';

export type MaterialName = 'wood' | 'stone' | 'glass' | 'ice';

export interface MaterialDef {
  density: number;
  restitution: number;
  friction: number;
  hp: number;
  fill: string;
  stroke: string;
}

/** Material table — density, bounciness, and how much punishment a block takes. */
export const MATERIALS: Record<MaterialName, MaterialDef> = {
  wood:  { density: 0.006, restitution: 0.18, friction: 0.7, hp: 65,  fill: '#c88b4a', stroke: '#8a5a28' },
  stone: { density: 0.014, restitution: 0.08, friction: 0.9, hp: 150, fill: '#9aa1a8', stroke: '#5f666c' },
  glass: { density: 0.004, restitution: 0.05, friction: 0.4, hp: 28,  fill: '#8fd4e8', stroke: '#4a9cb5' },
  ice:   { density: 0.0035, restitution: 0.05, friction: 0.15, hp: 34, fill: '#bfe9f2', stroke: '#77b8cc' },
};

/** Kind of a body, used by the renderer and the collision/damage logic. */
export type BodyKind = 'bird' | 'pig' | 'block' | 'ground';

/** Metadata attached to every Matter body via a side map keyed by body id. */
export interface BodyMeta {
  kind: BodyKind;
  hp: number;
  maxHp: number;
  material?: MaterialName;
  // geometry cache for rendering
  r?: number;   // circle radius (bird / pig)
  w?: number;   // rect width (block)
  h?: number;   // rect height (block)
}

// ---- Stage data ------------------------------------------------------------

export interface PigSpec {
  x: number;
  y: number;
  r?: number;   // default 22
  hp?: number;  // default 50
}

export interface BlockSpec {
  x: number;
  y: number;
  w: number;
  h: number;
  material: MaterialName;
  angle?: number; // radians, default 0
}

export interface StageData {
  id: number;
  name: string;
  birds: number;               // number of shots available
  slingshot: { x: number; y: number };
  pigs: PigSpec[];
  blocks: BlockSpec[];
  sky: [string, string];       // sky gradient [top, bottom]
  ground: string;              // ground fill color
  starThresholds?: [number, number, number]; // score for 1/2/3 stars
}
