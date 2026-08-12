import { Engine, World as MatterWorld } from 'matter-js'

let currentWorld: MatterWorld | null = null
let currentEngine: Engine | null = null

export function createWorld(gravity: number = 1.0): MatterWorld {
  const engine = Engine.create()
  engine.world.gravity.y = gravity
  currentEngine = engine
  currentWorld = engine.world
  return currentWorld
}

export function getWorld(): MatterWorld | null {
  return currentWorld
}

export function getEngine(): Engine | null {
  return currentEngine
}

export function disposeWorld() {
  if (currentEngine) {
    Engine.clear(currentEngine)
  }
  currentWorld = null
  currentEngine = null
}
