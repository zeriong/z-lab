export type BirdType = 'red' | 'bomb' | 'speed';
export type MaterialType = 'glass' | 'wood' | 'stone' | 'tnt';
export type ShapeType = 'box' | 'circle';
export type PigSize = 'small' | 'boss';
export type ThemeType = 'meadow' | 'quarry' | 'dusk';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PolygonGround {
  points: [number, number][];
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

export interface CameraDef {
  previewRect: Rect;
  minZoom: number;
  maxZoom: number;
}

export interface StageDef {
  id: number;
  name: string;
  theme: ThemeType;
  gravity: number;
  camera: CameraDef;
  ground: PolygonGround[];
  slingshot: Point;
  birds: BirdType[];
  bodies: BodyDef[];
  pigs: PigDef[];
  constraints?: ConstraintDef[];
  targetScore: number;
}

export function parseStageDef(data: unknown): StageDef {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid stage data');
  }

  const obj = data as Record<string, unknown>;

  // Validate required fields
  if (typeof obj.id !== 'number' || obj.id < 1 || obj.id > 10) {
    throw new Error('Invalid stage id');
  }

  if (typeof obj.name !== 'string') {
    throw new Error('Invalid stage name');
  }

  if (!['meadow', 'quarry', 'dusk'].includes(obj.theme as string)) {
    throw new Error('Invalid theme');
  }

  if (typeof obj.gravity !== 'number') {
    throw new Error('Invalid gravity');
  }

  if (!Array.isArray(obj.birds) || obj.birds.length < 1) {
    throw new Error('Birds array must have at least 1 bird');
  }

  if (!Array.isArray(obj.pigs) || obj.pigs.length < 1) {
    throw new Error('Pigs array must have at least 1 pig');
  }

  if (!Array.isArray(obj.bodies)) {
    throw new Error('Invalid bodies array');
  }

  if (!Array.isArray(obj.ground)) {
    throw new Error('Invalid ground array');
  }

  // Validate bodies don't overlap
  const bodies = obj.bodies as BodyDef[];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const b1 = bodies[i];
      const b2 = bodies[j];
      const dx = (b2.x || 0) - (b1.x || 0);
      const dy = (b2.y || 0) - (b1.y || 0);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = ((b1.w || b1.r || 0) + (b2.w || b2.r || 0)) / 2;
      if (dist < minDist && dist > 0) {
        throw new Error(`Bodies ${i} and ${j} overlap initially`);
      }
    }
  }

  // Validate constraint references
  if (obj.constraints) {
    const constraints = obj.constraints as ConstraintDef[];
    for (const constraint of constraints) {
      if (constraint.aIndex < 0 || constraint.aIndex >= bodies.length) {
        throw new Error(`Invalid constraint aIndex ${constraint.aIndex}`);
      }
      if (constraint.bIndex !== null && (constraint.bIndex < 0 || constraint.bIndex >= bodies.length)) {
        throw new Error(`Invalid constraint bIndex ${constraint.bIndex}`);
      }
    }
  }

  return obj as StageDef;
}
