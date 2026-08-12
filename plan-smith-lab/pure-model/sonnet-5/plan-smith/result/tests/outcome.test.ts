import { describe, expect, it } from 'vitest';
import { consumeProjectile, evaluateOutcome } from '../src/game/outcome';
import { loadStage } from '../src/stages/loadStage';
import { PhysicsAdapter } from '../src/engine/physicsAdapter';
import { STAGES } from '../src/stages';

describe('evaluateOutcome', () => {
  it('returns cleared when pigs.length === 0', () => {
    const adapter = new PhysicsAdapter(1);
    const loaded = loadStage(adapter, STAGES[0]);
    loaded.pigs = [];

    expect(evaluateOutcome(loaded)).toEqual({ type: 'cleared' });
  });

  it('returns failed when projectiles are exhausted and pigs remain', () => {
    const adapter = new PhysicsAdapter(1);
    const loaded = loadStage(adapter, STAGES[0]);
    loaded.projectilesRemaining = 0;

    expect(loaded.pigs.length).toBeGreaterThan(0);
    expect(evaluateOutcome(loaded)).toEqual({ type: 'failed' });
  });

  it('returns none while pigs remain and projectiles are available', () => {
    const adapter = new PhysicsAdapter(1);
    const loaded = loadStage(adapter, STAGES[0]);

    expect(evaluateOutcome(loaded)).toEqual({ type: 'none' });
  });
});

describe('consumeProjectile', () => {
  it('decrements projectilesRemaining and never goes below 0', () => {
    const adapter = new PhysicsAdapter(1);
    const loaded = loadStage(adapter, STAGES[0]);
    loaded.projectilesRemaining = 1;

    consumeProjectile(loaded);
    expect(loaded.projectilesRemaining).toBe(0);

    consumeProjectile(loaded);
    expect(loaded.projectilesRemaining).toBe(0);
  });
});
