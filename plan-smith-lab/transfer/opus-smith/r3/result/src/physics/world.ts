import Engine from 'matter-js/Build/Engine';
import World from 'matter-js/Build/World';
import Body from 'matter-js/Build/Body';
import Matter from 'matter-js';

export function createEngine(): Matter.Engine {
  const engine = Engine.create();
  return engine;
}

export function setGravity(engine: Matter.Engine, gravity: number): void {
  engine.world.gravity.y = gravity;
}

export function getWorldBodies(engine: Matter.Engine): Matter.Body[] {
  return engine.world.bodies;
}

export function removeBodyFromWorld(engine: Matter.Engine, body: Matter.Body): void {
  World.remove(engine.world, body);
}

export function addBodyToWorld(engine: Matter.Engine, body: Matter.Body): void {
  World.add(engine.world, body);
}

export function removeConstraintFromWorld(engine: Matter.Engine, constraint: Matter.Constraint): void {
  World.removeConstraint(engine.world, constraint);
}

export function addConstraintToWorld(engine: Matter.Engine, constraint: Matter.Constraint): void {
  World.addConstraint(engine.world, constraint);
}

export function clearWorld(engine: Matter.Engine): void {
  // Remove all bodies
  const bodies = engine.world.bodies.slice();
  for (const body of bodies) {
    World.remove(engine.world, body);
  }

  // Remove all constraints
  const constraints = engine.world.constraints.slice();
  for (const constraint of constraints) {
    World.removeConstraint(engine.world, constraint);
  }

  // Clear events
  engine.world.events = {};
}
