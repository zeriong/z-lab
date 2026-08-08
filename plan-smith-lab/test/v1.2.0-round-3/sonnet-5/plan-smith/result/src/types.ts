export type Material = "ice" | "wood" | "stone";

export type GameState =
  | "Idle"
  | "ReadyToShoot"
  | "Dragging"
  | "InFlight"
  | "Paused"
  | "Cleared"
  | "Failed";

export interface Vec2 {
  x: number;
  y: number;
}

export interface TerrainSegment {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BlockConfig {
  id: string;
  material: Material;
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
}

export interface PigConfig {
  id: string;
  x: number;
  y: number;
  radius: number;
  killThreshold: number;
}

export interface StageConfig {
  id: number;
  name: string;
  backgroundTint: string;
  birdLoadout: number;
  slingshotAnchor: Vec2;
  terrain: TerrainSegment[];
  blocks: BlockConfig[];
  pigs: PigConfig[];
  parScore: number;
}

export interface StageProgress {
  unlocked: boolean;
  bestScore: number;
  stars: number;
}

export interface ProgressState {
  unlockedCount: number;
  stages: Record<number, StageProgress>;
  muted: boolean;
}

export interface DebrisParticle {
  x: number;
  y: number;
  color: string;
  createdAt: number;
  ttlMs: number;
}
