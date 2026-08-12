import { world, setGravity } from '../physics/world';
import { validateStageDef, type StageDef } from './schema';
import { materials } from '../game/materials';
import { initializeBodyHealth } from '../game/damage';
import Body from 'matter-js/Build/Body';
import World from 'matter-js/Build/World';
import Bodies from 'matter-js/Build/Bodies';
import Events from 'matter-js/Build/Events';

let currentStage: StageDef | null = null;
let loadedBodies: Body[] = [];

export async function loadStage(stageId: number): Promise<StageDef> {
  const response = await fetch(`/src/data/stages/${String(stageId).padStart(2, '0')}.json`);
  const data = await response.json();
  const stage = validateStageDef(data, `stage ${stageId}`);

  currentStage = stage;
  loadedBodies = [];

  // Reset world
  World.clear(world);

  // Set gravity
  setGravity(stage.gravity ?? 1.0);

  // Load ground
  for (const groundPoly of stage.ground) {
    const ground = Bodies.fromVertices(0, 0, [groundPoly.points as any], {
      isStatic: true,
      label: 'ground'
    });
    World.add(world, ground);
    loadedBodies.push(ground);
  }

  // Load bodies
  for (const bodyDef of stage.bodies) {
    let body: Body;

    if (bodyDef.shape === 'box') {
      body = Bodies.rectangle(bodyDef.x, bodyDef.y, bodyDef.w!, bodyDef.h!, {
        angle: bodyDef.angle ?? 0,
        label: bodyDef.material,
        density: materials[bodyDef.material]?.density ?? 0.001,
        friction: materials[bodyDef.material]?.friction ?? 0.5
      });
    } else {
      body = Bodies.circle(bodyDef.x, bodyDef.y, bodyDef.r!, {
        label: bodyDef.material,
        density: materials[bodyDef.material]?.density ?? 0.001,
        friction: materials[bodyDef.material]?.friction ?? 0.5
      });
    }

    World.add(world, body);
    loadedBodies.push(body);
    initializeBodyHealth(body, bodyDef.material);
  }

  // Load pigs
  for (const pigDef of stage.pigs) {
    const material = pigDef.size === 'boss' ? 'pig_boss' : 'pig_small';
    const body = Bodies.circle(pigDef.x, pigDef.y, 8, {
      label: 'pig',
      density: materials[material]?.density ?? 0.001,
      friction: 0.5
    });
    (body as any).plugin = { kind: 'pig', size: pigDef.size };
    World.add(world, body);
    loadedBodies.push(body);
    initializeBodyHealth(body, material);
  }

  // Load slingshot bird
  const bird = Bodies.circle(stage.slingshot.x, stage.slingshot.y, 6, {
    isStatic: true,
    label: 'bird'
  });
  World.add(world, bird);
  loadedBodies.push(bird);

  return stage;
}

export function unloadStage(): void {
  currentStage = null;
  World.clear(world);
  loadedBodies = [];
}

export function getCurrentStage(): StageDef | null {
  return currentStage;
}

export function getLoadedBodies(): Body[] {
  return loadedBodies;
}
