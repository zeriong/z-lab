// 공유 타입 정의 (Core/Game/Render/UI 레이어가 공통으로 참조)

export type MaterialType = "wood" | "stone" | "glass";
export type BirdType = "normal" | "speedy" | "bomb";
export type BlockShape = "rect" | "circle";

export interface BlockData {
  type: MaterialType;
  shape: BlockShape;
  x: number;
  y: number;
  /** rect: 폭, circle: 지름 */
  w: number;
  /** rect 전용 (circle은 무시) */
  h?: number;
  angle?: number;
}

export interface PigData {
  x: number;
  y: number;
  r: number;
}

export interface StageData {
  id: number;
  name: string;
  worldWidth: number;
  groundY: number;
  slingshotAnchor: { x: number; y: number };
  birds: BirdType[];
  pigs: PigData[];
  blocks: BlockData[];
  parScore: number;
}

export type GameState = "Main" | "InGame" | "Paused" | "Cleared" | "Failed";
