import { describe, expect, it } from 'vitest';
import { SCORE_BIRD_LEFT, SCORE_PIG } from '../src/config';
import { defaultStars, fairStars, maxScore, starThresholds, starsFor } from '../src/game/score';
import { StageSession } from '../src/physics/session';
import { STAGES } from '../src/stages';
import type { StageData } from '../src/types';
import { fixture } from './helpers';

const stage: StageData = fixture({
  birds: ['red', 'red', 'red'],
  blocks: [
    { kind: 'box', material: 'glass', x: 1000, y: 800, w: 40, h: 40 },
    { kind: 'box', material: 'wood', x: 1100, y: 800, w: 40, h: 40 },
    { kind: 'box', material: 'stone', x: 1200, y: 800, w: 40, h: 40 },
  ],
});

describe('score', () => {
  it('maxScore = Σblocks + Σpigs + (birds − 1) × 10000', () => {
    expect(maxScore(stage)).toBe(300 + 500 + 800 + 5000 + 2 * 10000);
  });

  it('default thresholds are 45% / 65% of maxScore', () => {
    const max = maxScore(stage);
    expect(defaultStars(stage)).toEqual({ two: Math.round(0.45 * max), three: Math.round(0.65 * max) });
  });

  it('stars: not cleared = 0, cleared = at least 1', () => {
    const t = starThresholds(stage);
    expect(starsFor(stage, 999999, false)).toBe(0);
    expect(starsFor(stage, 0, true)).toBe(1);
    expect(starsFor(stage, t.two, true)).toBe(2);
    expect(starsFor(stage, t.three, true)).toBe(3);
  });

  it('fairStars: 2★ is reachable by any clear that uses exactly the solution shots', () => {
    for (const s of STAGES) {
      const t = starThresholds(s);
      expect(t.two).toBeLessThanOrEqual(s.pigs.length * SCORE_PIG + s.slack * SCORE_BIRD_LEFT);
      expect(t.two).toBeLessThan(t.three);
      expect(t.three).toBeLessThanOrEqual(maxScore(s));
      expect(fairStars(s)).toEqual(t);
    }
  });

  it('points are added as events happen (pig 5000, block by material)', () => {
    const s = StageSession.create(stage);
    for (let i = 0; i < 61; i++) s.step();
    const pig = s.registry.list().find((r) => r.entity.kind === 'pig')!;
    const glass = s.registry.list().find((r) => r.entity.kind === 'block' && r.entity.material === 'glass')!;
    s.queueRemoval(pig.body.id, 'destroyed');
    s.queueRemoval(glass.body.id, 'destroyed');
    s.flushRemovals();
    expect(s.score).toBe(5000 + 300);
    expect(s.pigsAlive).toBe(0);
  });

  it('clear adds 10000 per remaining bird, exactly once', () => {
    let results = 0;
    const s = StageSession.create(stage, { onResult: () => results++ });
    const pig = s.registry.list().find((r) => r.entity.kind === 'pig')!;
    s.queueRemoval(pig.body.id, 'destroyed');
    for (let i = 0; i < 300; i++) s.step();
    expect(s.result).toBe('clear');
    expect(results).toBe(1);
    expect(s.score).toBe(5000 + 3 * 10000);
  });
});
