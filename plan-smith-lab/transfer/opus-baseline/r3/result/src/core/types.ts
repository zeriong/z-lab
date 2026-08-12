export type GameState =
  | 'BOOT'
  | 'MAIN_MENU'
  | 'LEVEL_SELECT'
  | 'LOADING'
  | 'PLAYING'
  | 'PAUSED'
  | 'LEVEL_CLEAR'
  | 'LEVEL_FAIL';

export type PlayingPhase = 'AIMING' | 'FLYING' | 'SETTLING';

export interface Vector {
  x: number;
  y: number;
}

export interface InputEvent {
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel' | 'keydown';
  position?: Vector;
  key?: string;
}

export interface LevelData {
  id: number;
  name: string;
  world: { width: number; height: number; gravity: number };
  camera: { minX: number; maxX: number; minZoom: number; maxZoom: number };
  slingshot: { x: number; y: number; maxPull: number; power: number };
  birds: string[];
  ground: Array<{ x: number; y: number; w: number; h: number }>;
  blocks: Array<{
    type: string;
    shape: string;
    x: number;
    y: number;
    w?: number;
    h?: number;
    r?: number;
    angle?: number;
  }>;
  pigs: Array<{ size: string; x: number; y: number }>;
  starThresholds: [number, number, number];
  trajectoryHints?: number;
}

export interface GameResult {
  cleared: boolean;
  score: number;
  blockPoints: number;
  pigPoints: number;
  birdBonusPoints: number;
  stars: number;
}

export interface StoredLevelProgress {
  cleared: boolean;
  stars: number;
  highScore: number;
}
