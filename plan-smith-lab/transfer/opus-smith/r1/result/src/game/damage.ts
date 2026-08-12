import { Body, World as MatterWorld, Pair } from 'matter-js'
import { MaterialType, getMaterial } from './materials'

export interface HealthTracking {
  [bodyId: number]: number
}

export class DamageSystem {
  private health: HealthTracking = {}
  private onBlockDestroy: (body: Body, material: MaterialType) => void = () => {}
  private onPigDestroy: (body: Body, isBoss: boolean) => void = () => {}
  private onTNTExplode: (x: number, y: number) => void = () => {}

  setBlockDestroyCallback(cb: (body: Body, material: MaterialType) => void) {
    this.onBlockDestroy = cb
  }

  setPigDestroyCallback(cb: (body: Body, isBoss: boolean) => void) {
    this.onPigDestroy = cb
  }

  setTNTExplodeCallback(cb: (x: number, y: number) => void) {
    this.onTNTExplode = cb
  }

  initializeBody(body: Body, material: MaterialType) {
    const mat = getMaterial(material)
    this.health[body.id] = mat.hp
    body.plugin = { ...body.plugin, material, color: mat.color }
  }

  applyDamage(pair: Pair, world: MatterWorld) {
    const { bodyA, bodyB } = pair
    if (!bodyA || !bodyB) return

    const relativeVelocity = bodyA.positionPrev.x - bodyB.positionPrev.x
    const impulse = Math.abs(relativeVelocity * (bodyA.mass * bodyB.mass) / (bodyA.mass + bodyB.mass))

    // Apply damage to both bodies
    this.damageBodies(bodyA, bodyB, impulse, world)
    this.damageBodies(bodyB, bodyA, impulse, world)
  }

  private damageBodies(body: Body, other: Body, impulse: number, world: MatterWorld) {
    const material = body.plugin?.material as MaterialType
    if (!material || !this.health[body.id]) return

    const mat = getMaterial(material)
    const damage = Math.max(0, impulse - mat.threshold)

    if (damage > 0) {
      this.health[body.id] -= damage
      if (this.health[body.id] <= 0) {
        this.destroyBody(body, material, world)
      }
    }
  }

  private destroyBody(body: Body, material: MaterialType, world: MatterWorld) {
    const { World } = require('matter-js')
    World.remove(world, body)
    delete this.health[body.id]

    if (material === 'tnt') {
      this.onTNTExplode(body.position.x, body.position.y)
      this.explodeTNT(body.position.x, body.position.y, world)
    } else if (body.plugin?.kind === 'pig') {
      const isBoss = body.plugin?.size === 'boss'
      this.onPigDestroy(body, isBoss)
    } else {
      this.onBlockDestroy(body, material)
    }
  }

  private explodeTNT(x: number, y: number, world: MatterWorld) {
    const EXPLOSION_RADIUS = 120
    const FIXED_DAMAGE = 20
    const toDestroy: Body[] = []

    for (const body of world.bodies) {
      if (body.isStatic) continue
      const dist = Math.sqrt((body.position.x - x) ** 2 + (body.position.y - y) ** 2)
      if (dist <= EXPLOSION_RADIUS) {
        const impulse = 0.06 * (1 - dist / EXPLOSION_RADIUS)
        const dx = (body.position.x - x) / dist
        const dy = (body.position.y - y) / dist
        Body.applyForce(body, body.position, { x: dx * impulse, y: dy * impulse })

        // Apply fixed damage
        const material = body.plugin?.material as MaterialType
        if (material && this.health[body.id]) {
          this.health[body.id] -= FIXED_DAMAGE
          if (this.health[body.id] <= 0) {
            toDestroy.push(body)
          }
        }
      }
    }

    // Destroy bodies from explosion
    for (const body of toDestroy) {
      const material = body.plugin?.material as MaterialType
      if (material) {
        this.destroyBody(body, material, world)
      }
    }
  }

  getHealth(bodyId: number): number {
    return this.health[bodyId] || 0
  }

  reset() {
    this.health = {}
  }
}
