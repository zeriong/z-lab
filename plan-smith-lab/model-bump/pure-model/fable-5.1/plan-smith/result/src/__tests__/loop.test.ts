import { describe, expect, it } from 'vitest';
import { GameLoop } from '../loop';
import { createEngine, dynamicBodies, launch, spawnStage } from '../physics';
import { StateMachine } from '../state';
import { STAGES } from '../stages';

function snapshot(engine: ReturnType<typeof createEngine>): string {
  return JSON.stringify(dynamicBodies(engine).map((b) => [b.position.x, b.position.y, b.angle]));
}

describe('loop (C3)', () => {
  it('steps the engine only in PLAYING and never in PAUSED', () => {
    const engine = createEngine();
    const sm = new StateMachine();
    let steps = 0;
    let renders = 0;
    const loop = new GameLoop(engine, sm, { afterStep: () => steps++, render: () => renders++ });

    sm.transition('SELECT');
    sm.transition('PLAYING');
    const world = spawnStage(engine, STAGES[0]);
    const bird = launch(world, { x: -64, y: 64 });
    expect(bird).not.toBeNull();
    const before = snapshot(engine);
    loop.tick();
    loop.tick();
    expect(steps).toBe(2);
    expect(snapshot(engine)).not.toBe(before);

    sm.transition('PAUSED');
    const frozen = snapshot(engine);
    for (let i = 0; i < 30; i++) loop.tick();
    expect(steps).toBe(2);
    expect(renders).toBe(32);
    expect(snapshot(engine)).toBe(frozen);

    sm.transition('PLAYING');
    loop.tick();
    expect(steps).toBe(3);
    expect(snapshot(engine)).not.toBe(frozen);
  });

  it('start/stop drive the injected raf', () => {
    const engine = createEngine();
    const sm = new StateMachine();
    const callbacks: Array<(t: number) => void> = [];
    let cancelled = 0;
    const loop = new GameLoop(
      engine,
      sm,
      {},
      (cb) => {
        callbacks.push(cb);
        return callbacks.length;
      },
      () => {
        cancelled++;
      },
    );
    loop.start();
    expect(loop.isRunning).toBe(true);
    callbacks[0]!(0);
    expect(callbacks.length).toBe(2);
    loop.stop();
    expect(loop.isRunning).toBe(false);
    expect(cancelled).toBe(1);
  });
});
