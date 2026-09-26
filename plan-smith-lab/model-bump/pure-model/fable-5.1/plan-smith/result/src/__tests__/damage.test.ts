import Matter from 'matter-js';
import { describe, expect, it } from 'vitest';
import { computeImpact, installDamage } from '../damage';
import { createEngine, spawnStage, stepEngine } from '../physics';
import { PIG, type StageDef } from '../types';

const { Bodies } = Matter;

const dropStage: StageDef = {
  id: 1,
  name: 'drop',
  birds: ['red'],
  pigs: [{ x: 600, y: 974, hp: 5 }],
  blocks: [{ x: 600, y: 450, w: 100, h: 40, material: 'stone' }],
  starThresholds: [1, 2, 3],
};

describe('damage (B4/B5/B6)', () => {
  it('computeImpact uses relative speed and effective mass; static bodies count as infinite mass', () => {
    const a = Bodies.circle(0, 0, 10, { density: 0.01 });
    const b = Bodies.circle(0, 0, 10, { density: 0.01 });
    Matter.Body.setVelocity(a, { x: 10, y: 0 });
    Matter.Body.setVelocity(b, { x: 0, y: 0 });
    const eff = 1 / (1 / a.mass + 1 / b.mass);
    expect(computeImpact(a, b)).toBeCloseTo(10 * eff, 6);

    const wall = Bodies.rectangle(0, 0, 10, 10, { isStatic: true });
    expect(computeImpact(a, wall)).toBeCloseTo(10 * a.mass, 6);
    expect(computeImpact(wall, Bodies.rectangle(0, 0, 10, 10, { isStatic: true }))).toBe(0);
  });

  it('a stone block dropped on a pig removes the pig and scores >= 1000', () => {
    const engine = createEngine();
    const world = spawnStage(engine, dropStage);
    world.armed = true;
    const removed: string[] = [];
    let lastTotal = 0;
    const uninstall = installDamage(world, {
      onPigRemoved: () => removed.push('pig'),
      onScore: (total) => {
        lastTotal = total;
      },
    });
    for (let i = 0; i < 240; i++) stepEngine(engine);
    uninstall();

    expect(world.pigsRemaining).toBe(0);
    expect(removed).toContain('pig');
    expect(world.score).toBeGreaterThanOrEqual(PIG.score);
    expect(lastTotal).toBe(world.score);
    expect(engine.world.bodies.some((b) => b.label === 'pig')).toBe(false);
  });

  it('does nothing before the first launch (armed === false)', () => {
    const engine = createEngine();
    const world = spawnStage(engine, dropStage);
    const uninstall = installDamage(world);
    for (let i = 0; i < 240; i++) stepEngine(engine);
    uninstall();
    expect(world.pigsRemaining).toBe(1);
    expect(world.score).toBe(0);
  });

  it('uninstall stops further damage', () => {
    const engine = createEngine();
    const world = spawnStage(engine, dropStage);
    world.armed = true;
    const uninstall = installDamage(world);
    uninstall();
    for (let i = 0; i < 240; i++) stepEngine(engine);
    expect(world.pigsRemaining).toBe(1);
  });
});
