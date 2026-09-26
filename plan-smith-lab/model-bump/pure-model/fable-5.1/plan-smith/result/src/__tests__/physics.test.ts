import { describe, expect, it } from 'vitest';
import {
  advanceBird,
  clampDrag,
  createEngine,
  getMeta,
  launch,
  predictTrajectory,
  spawnStage,
  stepEngine,
} from '../physics';
import { STAGES } from '../stages';
import { BIRD, SLINGSHOT, TUNING, WORLD } from '../types';

describe('physics (B1/B2/B3)', () => {
  it('creates an engine with gravity y = 1 and static ground/walls', () => {
    const engine = createEngine();
    expect(engine.gravity.y).toBe(TUNING.gravityY);
    const kinds = engine.world.bodies.map((b) => getMeta(b)?.kind);
    expect(kinds).toContain('ground');
    expect(kinds.filter((k) => k === 'wall').length).toBe(2);
  });

  it('spawnStage puts the first bird on the slingshot as a static body', () => {
    const engine = createEngine();
    const world = spawnStage(engine, STAGES[0]);
    expect(world.currentBird).not.toBeNull();
    expect(world.currentBird!.isStatic).toBe(true);
    expect(world.currentBird!.position.x).toBeCloseTo(SLINGSHOT.x, 6);
    expect(world.currentBird!.position.y).toBeCloseTo(SLINGSHOT.y, 6);
    expect(world.pigsRemaining).toBe(STAGES[0].pigs.length);
    expect(world.birdsRemaining).toBe(STAGES[0].birds.length);
    expect(world.queue.length).toBe(STAGES[0].birds.length - 1);
  });

  it('a launched bird falls under gravity and never passes through the ground (120 steps)', () => {
    const engine = createEngine();
    const world = spawnStage(engine, { ...STAGES[0], blocks: [], pigs: [{ x: 2400, y: 974, hp: 10 }] });
    const bird = launch(world, { x: -70, y: -20 }); // 살짝 아래로 향하는 발사
    expect(bird).not.toBeNull();
    expect(bird!.isStatic).toBe(false);
    const startY = bird!.position.y;
    let maxY = startY;
    for (let i = 0; i < 120; i++) {
      stepEngine(engine);
      maxY = Math.max(maxY, bird!.position.y);
      expect(bird!.position.y).toBeLessThanOrEqual(WORLD.groundY - BIRD.r + 3);
    }
    expect(maxY).toBeGreaterThan(startY + 50);
    expect(bird!.position.x).toBeGreaterThan(SLINGSHOT.x + 200);
  });

  it('same input yields the same trajectory (deterministic)', () => {
    const run = () => {
      const engine = createEngine();
      const world = spawnStage(engine, STAGES[0]);
      const bird = launch(world, { x: -64, y: 64 })!;
      const pts: number[] = [];
      for (let i = 0; i < 60; i++) {
        stepEngine(engine);
        pts.push(bird.position.x, bird.position.y);
      }
      return pts;
    };
    expect(run()).toEqual(run());
  });

  it('launch velocity is -drag × k and pull is clamped to maxPull', () => {
    expect(Math.hypot(clampDrag({ x: -300, y: 300 }).x, clampDrag({ x: -300, y: 300 }).y)).toBeCloseTo(
      TUNING.maxPull,
      6,
    );
    const engine = createEngine();
    const world = spawnStage(engine, STAGES[0]);
    const bird = launch(world, { x: -50, y: 30 })!;
    expect(bird.velocity.x).toBeCloseTo(50 * TUNING.k, 3);
    expect(bird.velocity.y).toBeCloseTo(-30 * TUNING.k, 3);
    expect(world.birdsRemaining).toBe(STAGES[0].birds.length - 1);
    expect(world.currentBird).toBeNull();
    expect(world.flyingBird).toBe(bird);
  });

  it('a pull shorter than minPull does not launch', () => {
    const engine = createEngine();
    const world = spawnStage(engine, STAGES[0]);
    expect(launch(world, { x: -5, y: 5 })).toBeNull();
    expect(world.currentBird).not.toBeNull();
    expect(world.birdsRemaining).toBe(STAGES[0].birds.length);
  });

  it('predictTrajectory returns up to 12 dots that first rise then fall for a 45° pull', () => {
    const engine = createEngine();
    const pts = predictTrajectory(engine, { x: -64, y: 64 });
    expect(pts.length).toBeGreaterThan(3);
    expect(pts.length).toBeLessThanOrEqual(TUNING.trajectoryDots);
    expect(pts[0]!.x).toBeGreaterThan(SLINGSHOT.x - 64);
    expect(pts[0]!.y).toBeLessThan(SLINGSHOT.y + 64);
    const last = pts[pts.length - 1]!;
    expect(last.x).toBeGreaterThan(pts[0]!.x);
  });

  it('advanceBird cycles through the queue and ends with no bird', () => {
    const engine = createEngine();
    const world = spawnStage(engine, STAGES[9]); // 새 3
    for (let i = 0; i < 3; i++) {
      expect(world.currentBird).not.toBeNull();
      expect(launch(world, { x: -60, y: 60 })).not.toBeNull();
      advanceBird(world);
    }
    expect(world.currentBird).toBeNull();
    expect(world.flyingBird).toBeNull();
    expect(world.birdsRemaining).toBe(0);
  });
});
