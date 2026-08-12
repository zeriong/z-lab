import { World as MatterWorld, Body, Bodies, Constraint, Events } from 'matter-js'
import { StageDef, parseStageDef } from './schema'
import { MaterialType } from '../game/materials'
import { DamageSystem } from '../game/damage'

export async function loadStage(stageNum: number): Promise<StageDef> {
  const response = await fetch(`./data/stages/${String(stageNum).padStart(2, '0')}.json`)
  const data = await response.json()
  return parseStageDef(data)
}

export function createStageWorld(stage: StageDef, world: MatterWorld, damageSystem: DamageSystem) {
  // Clear world
  world.bodies.length = 0
  world.constraints.length = 0
  Events.removeAllListeners(world)

  // Set gravity
  world.gravity.y = stage.gravity || 1.0

  // Create ground
  for (const ground of stage.ground) {
    const vertices = ground.points.map(([x, y]) => ({ x, y }))
    const groundBody = Bodies.fromVertices(0, 0, [vertices] as any, {
      isStatic: true,
      label: 'ground'
    })
    if (groundBody) {
      MatterWorld.add(world, groundBody)
      damageSystem.initializeBody(groundBody, 'wood')
    }
  }

  // Create bodies
  const bodyMap: { [index: number]: Body } = {}
  for (let i = 0; i < stage.bodies.length; i++) {
    const bodyDef = stage.bodies[i]
    let body: Body

    if (bodyDef.shape === 'circle') {
      body = Bodies.circle(bodyDef.x, bodyDef.y, bodyDef.r || 20)
    } else {
      body = Bodies.rectangle(bodyDef.x, bodyDef.y, bodyDef.w || 40, bodyDef.h || 40)
    }

    if (bodyDef.angle) {
      Body.rotate(body, bodyDef.angle)
    }

    MatterWorld.add(world, body)
    damageSystem.initializeBody(body, bodyDef.material as MaterialType)
    bodyMap[i] = body
  }

  // Create pigs
  const pigBodies: Body[] = []
  for (const pigDef of stage.pigs) {
    const pigBody = Bodies.circle(pigDef.x, pigDef.y, pigDef.size === 'boss' ? 25 : 15)
    MatterWorld.add(world, pigBody)

    const material: MaterialType = pigDef.size === 'boss' ? 'pig_boss' : 'pig_small'
    damageSystem.initializeBody(pigBody, material)
    pigBody.plugin = { kind: 'pig', size: pigDef.size }
    pigBodies.push(pigBody)
  }

  // Create constraints
  if (stage.constraints) {
    for (const constraintDef of stage.constraints) {
      const bodyA = bodyMap[constraintDef.aIndex]
      const bodyB = constraintDef.bIndex !== null && constraintDef.bIndex !== undefined
        ? bodyMap[constraintDef.bIndex]
        : null

      const constraint = Constraint.create({
        bodyA,
        bodyB: bodyB || undefined,
        pointA: constraintDef.pointA,
        pointB: constraintDef.pointB,
        stiffness: constraintDef.stiffness,
        length: constraintDef.length
      })
      MatterWorld.add(world, constraint)
    }
  }

  return pigBodies
}

export function disposeStage(world: MatterWorld) {
  world.bodies.length = 0
  world.constraints.length = 0
  Events.removeAllListeners(world)
}
