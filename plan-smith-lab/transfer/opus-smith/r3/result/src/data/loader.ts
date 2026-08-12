import Matter from 'matter-js';
import { parseStageDef, type StageDef } from './schema';
import { getMaterialProperties, getPigProperties } from '../game/materials';
import { setBodyHealth } from '../game/damage';
import * as WorldModule from '../physics/world';

const stages: Record<number, StageDef> = {};
let loadedStages: Record<number, StageDef> = {};

export async function loadStageDefinition(stageId: number): Promise<StageDef> {
  if (stages[stageId]) {
    return stages[stageId];
  }

  const padded = String(stageId).padStart(2, '0');
  const response = await fetch(`/src/data/stages/${padded}.json`);
  if (!response.ok) {
    throw new Error(`Failed to load stage ${stageId}`);
  }

  const data = await response.json();
  const stageDef = parseStageDef(data);
  stages[stageId] = stageDef;
  return stageDef;
}

export function createStageWorld(engine: Matter.Engine, stageDef: StageDef): StageWorld {
  const world: StageWorld = {
    stageId: stageDef.id,
    bodies: [],
    constraints: [],
    birds: [],
    pigs: [],
    groundBodies: [],
    engine,
    stageDef,
  };

  // Set gravity
  WorldModule.setGravity(engine, stageDef.gravity);

  // Create ground bodies
  for (const groundDef of stageDef.ground) {
    const groundBody = Matter.Body.create({
      isStatic: true,
      position: { x: 0, y: 0 },
      vertices: groundDef.points.map(([x, y]) => ({ x, y })),
    });
    WorldModule.addBodyToWorld(engine, groundBody);
    world.groundBodies.push(groundBody);
  }

  // Create block bodies
  for (const bodyDef of stageDef.bodies) {
    let body: Matter.Body;

    if (bodyDef.shape === 'box') {
      body = Matter.Body.create({
        label: bodyDef.material,
        position: { x: bodyDef.x, y: bodyDef.y },
        width: bodyDef.w || 40,
        height: bodyDef.h || 40,
        angle: bodyDef.angle || 0,
      });
    } else {
      body = Matter.Body.create({
        label: bodyDef.material,
        position: { x: bodyDef.x, y: bodyDef.y },
        circleRadius: bodyDef.r || 20,
      });
    }

    // Set physics properties based on material
    const material = getMaterialProperties(bodyDef.material);
    Matter.Body.setDensity(body, material.density);
    body.friction = material.friction;
    body.restitution = 0.2;

    // Set health
    setBodyHealth(body, bodyDef.material);

    WorldModule.addBodyToWorld(engine, body);
    world.bodies.push(body);
  }

  // Create pigs
  for (let i = 0; i < stageDef.pigs.length; i++) {
    const pigDef = stageDef.pigs[i];
    const pigBody = Matter.Body.create({
      label: 'pig',
      position: { x: pigDef.x, y: pigDef.y },
      circleRadius: pigDef.size === 'boss' ? 15 : 10,
    });

    // Mark as pig
    (pigBody as any).plugin = { kind: 'pig', size: pigDef.size };

    const pigProps = getPigProperties(pigDef.size);
    Matter.Body.setDensity(pigBody, pigProps.density);
    pigBody.friction = pigProps.friction;
    pigBody.restitution = 0.2;

    setBodyHealth(pigBody, 'pig', pigDef.size);

    WorldModule.addBodyToWorld(engine, pigBody);
    world.pigs.push(pigBody);
  }

  // Create constraints if present
  if (stageDef.constraints) {
    for (const constraintDef of stageDef.constraints) {
      const bodyA = stageDef.bodies[constraintDef.aIndex] ? world.bodies[constraintDef.aIndex] : null;
      const bodyB = constraintDef.bIndex !== null ? world.bodies[constraintDef.bIndex] : null;

      if (bodyA) {
        const constraint = Matter.Constraint.create({
          bodyA,
          bodyB: bodyB || undefined,
          pointA: { x: constraintDef.pointA[0], y: constraintDef.pointA[1] },
          pointB: bodyB ? { x: constraintDef.pointB[0], y: constraintDef.pointB[1] } : undefined,
          stiffness: constraintDef.stiffness,
          length: constraintDef.length,
        });
        WorldModule.addConstraintToWorld(engine, constraint);
        world.constraints.push(constraint);
      }
    }
  }

  // Create bird bodies (initially static, positioned at slingshot)
  for (const birdType of stageDef.birds) {
    const birdBody = Matter.Body.create({
      label: birdType,
      position: { x: stageDef.slingshot.x, y: stageDef.slingshot.y },
      circleRadius: 8,
      isStatic: true,
    });

    (birdBody as any).birdType = birdType;
    Matter.Body.setDensity(birdBody, 0.002);

    WorldModule.addBodyToWorld(engine, birdBody);
    world.birds.push(birdBody);
  }

  loadedStages[stageDef.id] = stageDef;
  return world;
}

export function unloadStageWorld(engine: Matter.Engine, world: StageWorld): void {
  // Remove all bodies
  for (const body of world.bodies) {
    WorldModule.removeBodyFromWorld(engine, body);
  }
  for (const body of world.groundBodies) {
    WorldModule.removeBodyFromWorld(engine, body);
  }
  for (const body of world.pigs) {
    WorldModule.removeBodyFromWorld(engine, body);
  }
  for (const body of world.birds) {
    WorldModule.removeBodyFromWorld(engine, body);
  }

  // Remove all constraints
  for (const constraint of world.constraints) {
    WorldModule.removeConstraintFromWorld(engine, constraint);
  }

  // Clear event listeners
  Matter.Events.off(engine, 'collisionStart');
  Matter.Events.off(engine, 'collisionEnd');
}

export interface StageWorld {
  stageId: number;
  bodies: Matter.Body[];
  constraints: Matter.Constraint[];
  birds: Matter.Body[];
  pigs: Matter.Body[];
  groundBodies: Matter.Body[];
  engine: Matter.Engine;
  stageDef: StageDef;
}
