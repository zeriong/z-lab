import Matter from 'matter-js';
import { describe, expect, it } from 'vitest';
import { Judge, starsFor, summarizeScore, type JudgeResult } from '../judge';
import { createEngine, removeBody, spawnStage, stepEngine } from '../physics';
import { TUNING, type StageDef } from '../types';

const onePig: StageDef = {
  id: 1,
  name: 'judge',
  birds: ['red', 'red'],
  pigs: [{ x: 1200, y: 974, hp: 10 }],
  blocks: [],
  starThresholds: [500, 1500, 2500],
};

/** 엔진을 스텝하며 정착이 확정될 때까지(최대 maxTicks) 판정한다. */
function runUntilSettled(judge: Judge, world: ReturnType<typeof spawnStage>, maxTicks: number): JudgeResult | null {
  for (let i = 0; i < maxTicks; i++) {
    stepEngine(world.engine);
    const r = judge.tick(world);
    if (r.settled) return r;
  }
  return null;
}

describe('judge (B7)', () => {
  it('does not judge while waiting for a launch with pigs remaining', () => {
    const world = spawnStage(createEngine(), onePig);
    const judge = new Judge();
    for (let i = 0; i < 100; i++) {
      const r = judge.tick(world);
      expect(r.settled).toBe(false);
      expect(r.verdict).toBeNull();
    }
  });

  it('CLEARED only after the world has settled (settleFrames) and only once', () => {
    const world = spawnStage(createEngine(), onePig);
    const judge = new Judge();
    const pig = world.engine.world.bodies.find((b) => b.label === 'pig')!;
    removeBody(world, pig);
    world.pigsRemaining = 0;
    judge.onLaunch();
    // 동적 body가 없으므로 속도 0 → 정확히 settleFrames 번째 tick에서 정착
    for (let i = 0; i < TUNING.settleFrames - 1; i++) {
      expect(judge.tick(world).settled).toBe(false);
    }
    const r = judge.tick(world);
    expect(r.settled).toBe(true);
    expect(r.verdict).toBe('CLEARED');
    expect(judge.tick(world)).toEqual({ settled: false, verdict: null });
  });

  it('FAILED when settled with pigs left and no birds available', () => {
    const world = spawnStage(createEngine(), { ...onePig, birds: ['red'] });
    const judge = new Judge();
    // 마지막 새를 발사한 것으로 간주: 컵도 대기열도 비어 있다
    world.currentBird = null;
    world.birdsRemaining = 0;
    judge.onLaunch();
    const r = runUntilSettled(judge, world, TUNING.settleFrames + 120);
    expect(r).not.toBeNull();
    expect(r!.verdict).toBe('FAILED');
    expect(world.pigsRemaining).toBe(1);
  });

  it('settled with pigs left but birds available yields no verdict (next bird)', () => {
    const world = spawnStage(createEngine(), onePig);
    const judge = new Judge();
    judge.onLaunch();
    const r = runUntilSettled(judge, world, TUNING.settleFrames + 120);
    expect(r).not.toBeNull();
    expect(r!.verdict).toBeNull();
    judge.onAdvanced();
    expect(judge.settled).toBe(false);
    expect(judge.inFlight).toBe(false);
  });

  it('settles by timeout when a body never stops', () => {
    const engine = createEngine();
    engine.gravity.y = 0;
    const world = spawnStage(engine, onePig);
    const judge = new Judge();
    const mover = Matter.Bodies.circle(1000, 500, 10, { frictionAir: 0, density: 0.01 });
    Matter.Composite.add(engine.world, mover);
    Matter.Body.setVelocity(mover, { x: 0, y: -2 });
    judge.onLaunch();
    let settledAt = -1;
    for (let i = 0; i < TUNING.settleTimeoutFrames + 5; i++) {
      stepEngine(engine);
      const r = judge.tick(world);
      if (r.settled) {
        settledAt = i + 1;
        break;
      }
    }
    expect(settledAt).toBe(TUNING.settleTimeoutFrames);
  });

  it('summarizeScore adds bird bonus and computes stars', () => {
    const world = spawnStage(createEngine(), onePig);
    world.score = 1000;
    world.birdsRemaining = 1;
    const s = summarizeScore(world);
    expect(s.bonus).toBe(TUNING.birdBonus);
    expect(s.total).toBe(1500);
    expect(s.stars).toBe(2);
    expect(starsFor(0, [500, 1500, 2500])).toBe(0);
    expect(starsFor(2500, [500, 1500, 2500])).toBe(3);
  });
});
