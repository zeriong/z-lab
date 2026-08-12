export type Theme = 'meadow' | 'quarry' | 'dusk';
export type BirdType = 'red' | 'bomb' | 'speed';
export type MaterialType = 'glass' | 'wood' | 'stone' | 'tnt';
export type ShapeType = 'box' | 'circle';
export type PigSize = 'small' | 'boss';

export interface Vector2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GroundPolygon {
  points: Array<[number, number]>;
}

export interface BodyDef {
  material: MaterialType;
  shape: ShapeType;
  x: number;
  y: number;
  w?: number;
  h?: number;
  r?: number;
  angle?: number;
}

export interface ConstraintDef {
  aIndex: number;
  bIndex: number | null;
  pointA: [number, number];
  pointB: [number, number];
  stiffness: number;
  length: number;
}

export interface PigDef {
  x: number;
  y: number;
  size: PigSize;
}

export interface StageDef {
  id: number;
  name: string;
  theme: Theme;
  gravity: number;
  camera: {
    previewRect: Rect;
    minZoom: number;
    maxZoom: number;
  };
  ground: GroundPolygon[];
  slingshot: Vector2;
  birds: BirdType[];
  bodies: BodyDef[];
  pigs: PigDef[];
  constraints?: ConstraintDef[];
  targetScore: number;
}

export function validateStageDef(data: unknown, filename: string): StageDef {
  const stage = data as Partial<StageDef>;

  if (!stage.id || typeof stage.id !== 'number' || stage.id < 1 || stage.id > 10) {
    throw new Error(`${filename}: Invalid id`);
  }
  if (!stage.name || typeof stage.name !== 'string') {
    throw new Error(`${filename}: Missing or invalid name`);
  }
  if (!stage.theme || !['meadow', 'quarry', 'dusk'].includes(stage.theme)) {
    throw new Error(`${filename}: Invalid theme`);
  }
  if (typeof stage.gravity !== 'number') {
    throw new Error(`${filename}: Missing or invalid gravity`);
  }
  if (!stage.camera || !stage.camera.previewRect) {
    throw new Error(`${filename}: Missing camera config`);
  }
  if (!Array.isArray(stage.ground) || stage.ground.length === 0) {
    throw new Error(`${filename}: Missing or invalid ground`);
  }
  if (!stage.slingshot) {
    throw new Error(`${filename}: Missing slingshot position`);
  }
  if (!Array.isArray(stage.birds) || stage.birds.length < 1) {
    throw new Error(`${filename}: Must have at least 1 bird`);
  }
  if (!Array.isArray(stage.bodies)) {
    throw new Error(`${filename}: Missing bodies`);
  }
  if (!Array.isArray(stage.pigs) || stage.pigs.length < 1) {
    throw new Error(`${filename}: Must have at least 1 pig`);
  }
  if (typeof stage.targetScore !== 'number') {
    throw new Error(`${filename}: Missing targetScore`);
  }

  // Validate constraints if present
  if (stage.constraints) {
    for (const c of stage.constraints) {
      if (c.aIndex < 0 || c.aIndex >= (stage.bodies?.length || 0)) {
        throw new Error(`${filename}: Invalid constraint aIndex`);
      }
      if (c.bIndex !== null && (c.bIndex < 0 || c.bIndex >= (stage.bodies?.length || 0))) {
        throw new Error(`${filename}: Invalid constraint bIndex`);
      }
    }
  }

  return stage as StageDef;
}
