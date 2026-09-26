// solution / null: 같은 커밋에서 settle과 함께 통과해야 한다 (D7)
import { describe, expect, it } from 'vitest';
import { starThresholds } from '../src/game/score';
import { STAGES } from '../src/stages';
import { runNull, runShots, runSolution } from './helpers';

describe('solution', () => {
  it.each(STAGES.map((s) => [s.id, s] as const))('stage %i: solution replay clears within budget with ≥ 2★ score', (_id, stage) => {
    const r = runSolution(stage);
    expect(r.result).toBe('clear');
    expect(r.shotsFired).toBeLessThanOrEqual(stage.birds.length);
    expect(r.score).toBeGreaterThanOrEqual(starThresholds(stage).two);
  });

  it('stage 1 tolerates ±3 on each pull component (E2E rounding)', () => {
    const stage = STAGES[0]!;
    const base = stage.solution[0]!.pull;
    for (const [dx, dy] of [
      [3, 3],
      [3, -3],
      [-3, 3],
      [-3, -3],
    ] as const) {
      const r = runShots(stage, [{ pull: { x: base.x + dx, y: base.y + dy } }]);
      expect(r.result, `pull (${base.x + dx}, ${base.y + dy})`).toBe('clear');
    }
  });
});

describe('null', () => {
  it.each(STAGES.map((s) => [s.id, s] as const))('stage %i: weak shots (20,0) fail', (_id, stage) => {
    const r = runNull(stage);
    expect(r.result).toBe('fail');
    expect(r.session.pigsAlive).toBeGreaterThan(0);
  });
});
