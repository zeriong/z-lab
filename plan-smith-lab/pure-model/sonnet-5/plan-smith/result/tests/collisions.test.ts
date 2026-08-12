import { describe, expect, it, vi } from 'vitest';
import Matter from 'matter-js';
import { PhysicsAdapter } from '../src/engine/physicsAdapter';
import { registerCollisionRules } from '../src/game/collisions';
import { loadStage } from '../src/stages/loadStage';
import { STAGES } from '../src/stages';

function makePairEvent(bodyA: Matter.Body, bodyB: Matter.Body, penetration: { x: number; y: number }) {
  return {
    pairs: [{ bodyA, bodyB, collision: { penetration } }],
  } as unknown as Matter.IEventCollision<Matter.Engine>;
}

describe('registerCollisionRules', () => {
  it('branches on destructible label and removes body above the material threshold', () => {
    const adapter = new PhysicsAdapter(1);
    const loaded = loadStage(adapter, STAGES[0]);
    const outcome = vi.fn();
    registerCollisionRules(adapter, loaded, outcome);

    const target = loaded.destructibles[0];
    const projectile = Matter.Bodies.circle(0, 0, 15, { label: 'projectile' });

    Matter.Events.trigger(adapter.engine, 'collisionStart', makePairEvent(projectile, target, { x: 100, y: 100 }));

    expect(outcome).toHaveBeenCalled();
    const call = outcome.mock.calls[0][0];
    expect(call.destroyedDestructibleIds.length).toBeGreaterThan(0);
  });

  it('branches on pig label and removes the pig above the impact threshold', () => {
    const adapter = new PhysicsAdapter(1);
    const loaded = loadStage(adapter, STAGES[0]);
    const outcome = vi.fn();
    registerCollisionRules(adapter, loaded, outcome);

    const pig = loaded.pigs[0];
    const projectile = Matter.Bodies.circle(0, 0, 15, { label: 'projectile' });

    Matter.Events.trigger(adapter.engine, 'collisionStart', makePairEvent(projectile, pig, { x: 100, y: 100 }));

    expect(outcome).toHaveBeenCalled();
    const call = outcome.mock.calls[0][0];
    expect(call.removedPigIds.length).toBeGreaterThan(0);
  });

  it('does not destroy below the material threshold', () => {
    const adapter = new PhysicsAdapter(1);
    const loaded = loadStage(adapter, STAGES[0]);
    const outcome = vi.fn();
    registerCollisionRules(adapter, loaded, outcome);

    const target = loaded.destructibles[0];
    const projectile = Matter.Bodies.circle(0, 0, 15, { label: 'projectile' });

    Matter.Events.trigger(adapter.engine, 'collisionStart', makePairEvent(projectile, target, { x: 0.1, y: 0.1 }));

    expect(outcome).not.toHaveBeenCalled();
  });
});
