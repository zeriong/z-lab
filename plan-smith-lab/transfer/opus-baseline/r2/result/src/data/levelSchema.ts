export type BirdType = 'basic' | 'speed' | 'bomb';
export type BlockShape = 'rect' | 'circle';
export type PigSize = 'small' | 'medium' | 'large';
export type MaterialType = 'wood' | 'stone' | 'glass';

export interface Vector2 {
  x: number;
  y: number;
}

export interface WorldConfig {
  width: number;
  height: number;
  gravity: number;
}

export interface CameraConfig {
  minX: number;
  maxX: number;
  minZoom: number;
  maxZoom: number;
}

export interface SlingshotConfig {
  x: number;
  y: number;
  maxPull: number;
  power: number;
}

export interface GroundEntity {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BlockEntity {
  type: MaterialType;
  shape: BlockShape;
  x: number;
  y: number;
  w?: number;
  h?: number;
  r?: number;
  angle?: number;
}

export interface PigEntity {
  size: PigSize;
  x: number;
  y: number;
}

export interface LevelData {
  id: number;
  name: string;
  world: WorldConfig;
  camera: CameraConfig;
  slingshot: SlingshotConfig;
  birds: BirdType[];
  ground: GroundEntity[];
  blocks: BlockEntity[];
  pigs: PigEntity[];
  starThresholds: number[];
  trajectoryHints?: number;
}

export function validateLevel(data: unknown): data is LevelData {
  if (!data || typeof data !== 'object') return false;
  const level = data as any;

  // Basic structure
  if (
    typeof level.id !== 'number' ||
    typeof level.name !== 'string' ||
    !level.world ||
    !level.camera ||
    !level.slingshot ||
    !Array.isArray(level.birds) ||
    !Array.isArray(level.ground) ||
    !Array.isArray(level.blocks) ||
    !Array.isArray(level.pigs) ||
    !Array.isArray(level.starThresholds)
  ) {
    return false;
  }

  // Validate arrays
  if (!level.birds.every((b: any) => ['basic', 'speed', 'bomb'].includes(b))) return false;
  if (!level.blocks.every((b: any) => ['wood', 'stone', 'glass'].includes(b.type))) return false;
  if (!level.pigs.every((p: any) => ['small', 'medium', 'large'].includes(p.size))) return false;

  return true;
}

export function getStarCount(score: number, thresholds: number[]): number {
  let stars = 0;
  for (const threshold of thresholds) {
    if (score >= threshold) stars++;
  }
  return Math.min(stars, 3);
}
