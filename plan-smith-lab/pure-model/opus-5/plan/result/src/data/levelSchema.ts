/**
 * Level JSON schema + runtime validation (plan §4.1).
 *
 * Coordinate convention, chosen for hand-editing comfort:
 *   - world pixels, y grows downward (same as canvas)
 *   - ground rects use TOP-LEFT
 *   - blocks and pigs use BOTTOM-CENTER; the loader converts to body centres
 * Stacking towers by hand is unbearable with centre coordinates, so the
 * conversion lives here once instead of in every level file.
 */

export type MaterialKind = 'glass' | 'wood' | 'stone';
export type BlockShape = 'rect' | 'circle';
export type BirdKind = 'basic' | 'speed' | 'bomb';
export type PigSize = 'small' | 'medium';

export interface RectBlockDef {
  type: MaterialKind;
  shape: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  angle?: number;
}

export interface CircleBlockDef {
  type: MaterialKind;
  shape: 'circle';
  x: number;
  y: number;
  r: number;
  angle?: number;
}

export type BlockDef = RectBlockDef | CircleBlockDef;

export interface GroundDef {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PigDef {
  size: PigSize;
  x: number;
  y: number;
}

export interface LevelData {
  id: number;
  name: string;
  world: { width: number; height: number; gravity: number };
  camera: { minX: number; maxX: number; minZoom: number; maxZoom: number };
  slingshot: { x: number; y: number; maxPull: number; power: number };
  birds: BirdKind[];
  ground: GroundDef[];
  blocks: BlockDef[];
  pigs: PigDef[];
  starThresholds: [number, number, number];
  /** Number of predicted trajectory dots — difficulty dial (plan §5.2). */
  trajectoryHints: number;
}

export const PIG_RADIUS: Record<PigSize, number> = {
  small: 16,
  medium: 24,
};

const MATERIAL_KINDS: MaterialKind[] = ['glass', 'wood', 'stone'];
const BIRD_KINDS: BirdKind[] = ['basic', 'speed', 'bomb'];
const PIG_SIZES: PigSize[] = ['small', 'medium'];

export class LevelSchemaError extends Error {}

interface Box {
  label: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function num(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new LevelSchemaError(`${path} must be a finite number (got ${String(value)})`);
  }
  return value;
}

function str(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new LevelSchemaError(`${path} must be a non-empty string`);
  }
  return value;
}

function obj(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LevelSchemaError(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function arr(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new LevelSchemaError(`${path} must be an array`);
  return value;
}

function oneOf<T extends string>(value: unknown, allowed: T[], path: string): T {
  const s = str(value, path);
  if (!allowed.includes(s as T)) {
    throw new LevelSchemaError(`${path} must be one of ${allowed.join(' | ')} (got ${s})`);
  }
  return s as T;
}

/** Bottom-center rect -> AABB, used for the initial-overlap check. */
function blockBox(block: BlockDef): Box {
  if (block.shape === 'circle') {
    return {
      label: `${block.type} circle @${block.x},${block.y}`,
      left: block.x - block.r,
      right: block.x + block.r,
      top: block.y - block.r * 2,
      bottom: block.y,
    };
  }
  return {
    label: `${block.type} rect @${block.x},${block.y}`,
    left: block.x - block.w / 2,
    right: block.x + block.w / 2,
    top: block.y - block.h,
    bottom: block.y,
  };
}

function pigBox(pig: PigDef): Box {
  const r = PIG_RADIUS[pig.size];
  return {
    label: `pig @${pig.x},${pig.y}`,
    left: pig.x - r,
    right: pig.x + r,
    top: pig.y - r * 2,
    bottom: pig.y,
  };
}

function overlapArea(a: Box, b: Box): number {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  if (w <= 0 || h <= 0) return 0;
  return w * h;
}

export interface ValidationReport {
  errors: string[];
  warnings: string[];
}

/**
 * Geometry sanity pass. Initial overlap is the #1 source of "the tower
 * explodes on load", so it is reported loudly instead of silently tolerated
 * (plan §4.1). Rotated blocks are checked with their unrotated AABB, which is
 * conservative — a false positive is cheaper than a missed explosion.
 */
export function inspectGeometry(level: LevelData): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  const groundTop = level.ground.length
    ? Math.min(...level.ground.map((g) => g.y))
    : level.world.height;

  const boxes: Box[] = [];
  for (const block of level.blocks) {
    const box = blockBox(block);
    if (box.bottom > groundTop + 0.5) {
      warnings.push(`${box.label} starts below the ground line (${box.bottom} > ${groundTop})`);
    }
    if (box.top < 0) warnings.push(`${box.label} sticks out above the world top`);
    if (box.left < 0 || box.right > level.world.width) {
      warnings.push(`${box.label} sticks out of the world horizontally`);
    }
    if ((block as RectBlockDef).angle === undefined) boxes.push(box);
  }
  for (const pig of level.pigs) {
    const box = pigBox(pig);
    if (box.bottom > groundTop + 0.5) {
      warnings.push(`${box.label} starts below the ground line`);
    }
    boxes.push(box);
  }

  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const area = overlapArea(boxes[i], boxes[j]);
      if (area > 1) {
        warnings.push(
          `initial overlap (${area.toFixed(1)}px^2) between ${boxes[i].label} and ${boxes[j].label}`,
        );
      }
    }
  }

  if (level.pigs.length === 0) errors.push('level has no pigs — it can never be cleared');
  if (level.birds.length === 0) errors.push('level has no birds — it can never be played');

  return { errors, warnings };
}

/** Parses + validates raw JSON. Throws on structural problems. */
export function parseLevel(raw: unknown): LevelData {
  const root = obj(raw, 'level');
  const world = obj(root.world, 'level.world');
  const camera = obj(root.camera, 'level.camera');
  const sling = obj(root.slingshot, 'level.slingshot');

  const blocks: BlockDef[] = arr(root.blocks, 'level.blocks').map((entry, i) => {
    const b = obj(entry, `level.blocks[${i}]`);
    const type = oneOf(b.type, MATERIAL_KINDS, `level.blocks[${i}].type`);
    const shape = oneOf<BlockShape>(b.shape, ['rect', 'circle'], `level.blocks[${i}].shape`);
    const x = num(b.x, `level.blocks[${i}].x`);
    const y = num(b.y, `level.blocks[${i}].y`);
    const angle = b.angle === undefined ? undefined : num(b.angle, `level.blocks[${i}].angle`);
    if (shape === 'circle') {
      const def: CircleBlockDef = { type, shape, x, y, r: num(b.r, `level.blocks[${i}].r`) };
      if (angle !== undefined) def.angle = angle;
      return def;
    }
    const def: RectBlockDef = {
      type,
      shape,
      x,
      y,
      w: num(b.w, `level.blocks[${i}].w`),
      h: num(b.h, `level.blocks[${i}].h`),
    };
    if (angle !== undefined) def.angle = angle;
    return def;
  });

  const thresholds = arr(root.starThresholds, 'level.starThresholds');
  if (thresholds.length !== 3) {
    throw new LevelSchemaError('level.starThresholds must have exactly 3 entries');
  }

  const level: LevelData = {
    id: num(root.id, 'level.id'),
    name: str(root.name, 'level.name'),
    world: {
      width: num(world.width, 'level.world.width'),
      height: num(world.height, 'level.world.height'),
      gravity: num(world.gravity, 'level.world.gravity'),
    },
    camera: {
      minX: num(camera.minX, 'level.camera.minX'),
      maxX: num(camera.maxX, 'level.camera.maxX'),
      minZoom: num(camera.minZoom, 'level.camera.minZoom'),
      maxZoom: num(camera.maxZoom, 'level.camera.maxZoom'),
    },
    slingshot: {
      x: num(sling.x, 'level.slingshot.x'),
      y: num(sling.y, 'level.slingshot.y'),
      maxPull: num(sling.maxPull, 'level.slingshot.maxPull'),
      power: num(sling.power, 'level.slingshot.power'),
    },
    birds: arr(root.birds, 'level.birds').map((b, i) =>
      oneOf(b, BIRD_KINDS, `level.birds[${i}]`),
    ),
    ground: arr(root.ground, 'level.ground').map((entry, i) => {
      const g = obj(entry, `level.ground[${i}]`);
      return {
        x: num(g.x, `level.ground[${i}].x`),
        y: num(g.y, `level.ground[${i}].y`),
        w: num(g.w, `level.ground[${i}].w`),
        h: num(g.h, `level.ground[${i}].h`),
      };
    }),
    blocks,
    pigs: arr(root.pigs, 'level.pigs').map((entry, i) => {
      const p = obj(entry, `level.pigs[${i}]`);
      return {
        size: oneOf(p.size, PIG_SIZES, `level.pigs[${i}].size`),
        x: num(p.x, `level.pigs[${i}].x`),
        y: num(p.y, `level.pigs[${i}].y`),
      };
    }),
    starThresholds: [
      num(thresholds[0], 'level.starThresholds[0]'),
      num(thresholds[1], 'level.starThresholds[1]'),
      num(thresholds[2], 'level.starThresholds[2]'),
    ],
    trajectoryHints:
      root.trajectoryHints === undefined ? 8 : num(root.trajectoryHints, 'level.trajectoryHints'),
  };

  const report = inspectGeometry(level);
  if (report.errors.length) {
    throw new LevelSchemaError(`level ${level.id}: ${report.errors.join('; ')}`);
  }
  if (report.warnings.length && import.meta.env.DEV) {
    console.warn(`[level ${level.id} "${level.name}"] geometry warnings:`);
    for (const w of report.warnings) console.warn('  - ' + w);
  }

  return level;
}
