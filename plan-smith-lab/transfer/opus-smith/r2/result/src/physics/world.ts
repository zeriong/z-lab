import Engine from 'matter-js/Build/Engine';
import World from 'matter-js/Build/World';

export const engine = Engine.create();
export const world = engine.world;

// Set default gravity
world.gravity.y = 1.0;
world.gravity.x = 0;

export function setGravity(gravity: number): void {
  world.gravity.y = gravity;
}

export function resetWorld(): void {
  // Remove all bodies and constraints except ground
  World.clear(world);
  Engine.clear(engine);
}
