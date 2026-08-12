export type BirdType = 'red' | 'bomb' | 'speed'
export type MaterialName = 'glass' | 'wood' | 'stone' | 'tnt'
export type ShapeType = 'box' | 'circle'
export type PigSize = 'small' | 'boss'
export type ThemeName = 'meadow' | 'quarry' | 'dusk'

export interface Point {
  x: number
  y: number
}

export interface GroundPolygon {
  points: [number, number][]
}

export interface BodyDef {
  material: MaterialName
  shape: ShapeType
  x: number
  y: number
  w?: number
  h?: number
  r?: number
  angle?: number
}

export interface PigDef {
  x: number
  y: number
  size: PigSize
}

export interface ConstraintDef {
  aIndex: number
  bIndex?: number | null
  pointA: Point
  pointB: Point
  stiffness: number
  length: number
}

export interface StageDef {
  id: number
  name: string
  theme: ThemeName
  gravity?: number
  camera: {
    previewRect: { x: number; y: number; w: number; h: number }
    minZoom: number
    maxZoom: number
  }
  ground: GroundPolygon[]
  slingshot: Point
  birds: BirdType[]
  bodies: BodyDef[]
  pigs: PigDef[]
  constraints?: ConstraintDef[]
  targetScore: number
}

export function validateStageDef(data: unknown): data is StageDef {
  if (typeof data !== 'object' || data === null) return false
  const obj = data as any

  // Check required fields
  if (typeof obj.id !== 'number' || obj.id < 1 || obj.id > 10) return false
  if (typeof obj.name !== 'string') return false
  if (!['meadow', 'quarry', 'dusk'].includes(obj.theme)) return false
  if (!obj.camera || typeof obj.camera !== 'object') return false
  if (!Array.isArray(obj.ground)) return false
  if (typeof obj.slingshot !== 'object') return false
  if (!Array.isArray(obj.birds) || obj.birds.length < 1) return false
  if (!Array.isArray(obj.bodies)) return false
  if (!Array.isArray(obj.pigs) || obj.pigs.length < 1) return false
  if (typeof obj.targetScore !== 'number') return false

  // Check materials exist
  for (const body of obj.bodies) {
    if (!['glass', 'wood', 'stone', 'tnt'].includes(body.material)) return false
  }

  // Check constraint references
  if (Array.isArray(obj.constraints)) {
    for (const constraint of obj.constraints) {
      if (constraint.aIndex < 0 || constraint.aIndex >= obj.bodies.length) return false
      if (constraint.bIndex !== null && constraint.bIndex !== undefined) {
        if (constraint.bIndex < 0 || constraint.bIndex >= obj.bodies.length) return false
      }
    }
  }

  // Check no initial body overlaps (basic check)
  for (let i = 0; i < obj.bodies.length; i++) {
    for (let j = i + 1; j < obj.bodies.length; j++) {
      const b1 = obj.bodies[i]
      const b2 = obj.bodies[j]
      const dist = Math.sqrt((b1.x - b2.x) ** 2 + (b1.y - b2.y) ** 2)
      const minDist = (b1.r || Math.sqrt(b1.w * b1.w + b1.h * b1.h) / 2) +
                      (b2.r || Math.sqrt(b2.w * b2.w + b2.h * b2.h) / 2)
      if (dist < minDist) return false
    }
  }

  return true
}

export function parseStageDef(data: unknown): StageDef {
  if (!validateStageDef(data)) {
    throw new Error('Invalid stage definition')
  }
  return data
}
