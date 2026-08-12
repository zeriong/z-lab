import { describe, expect, it, vi } from 'vitest';
import Matter from 'matter-js';
import { PhysicsAdapter } from '../src/engine/physicsAdapter';
import { launchProjectile } from '../src/game/launch';

describe('launchProjectile', () => {
  it('calls Matter.Body.setVelocity with the exact input launch vector', () => {
    const adapter = new PhysicsAdapter(1);
    const projectile = Matter.Bodies.circle(0, 0, 15, { label: 'projectile' });
    const spy = vi.spyOn(Matter.Body, 'setVelocity');

    launchProjectile(adapter, projectile, { vx: 12.5, vy: -7.2 });

    expect(spy).toHaveBeenCalledWith(projectile, { x: 12.5, y: -7.2 });
    spy.mockRestore();
  });
});
