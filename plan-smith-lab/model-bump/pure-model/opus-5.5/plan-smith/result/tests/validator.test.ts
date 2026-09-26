import { describe, expect, it } from 'vitest';
import { STAGES } from '../src/stages';
import { validateAll, validateStage } from '../src/stages/validate';
import type { StageData } from '../src/types';

const good: StageData = {
  id: 1,
  name: 'good',
  birds: ['red', 'red'],
  blocks: [
    { kind: 'box', material: 'wood', x: 1000, y: 770, w: 20, h: 100 },
    { kind: 'box', material: 'wood', x: 1000, y: 710, w: 100, h: 20 },
  ],
  pigs: [{ type: 'small', x: 1000, y: 680 }],
  slack: 1,
  solution: [{ pull: { x: 100, y: -50 } }],
};

describe('validator', () => {
  it('STAGES.length === 10, ids 1..10, all stages pass', () => {
    expect(STAGES.length).toBe(10);
    expect(validateAll(STAGES)).toEqual([]);
  });

  it.each(STAGES.map((s) => [s.id, s] as const))('stage %i passes validateStage', (_id, s) => {
    expect(validateStage(s)).toEqual([]);
  });

  it('accepts the good fixture', () => {
    expect(validateStage(good)).toEqual([]);
  });

  const bad: Array<[string, StageData]> = [
    [
      'overlap',
      { ...good, blocks: [...good.blocks, { kind: 'box', material: 'wood', x: 1005, y: 770, w: 20, h: 100 }] },
    ],
    ['out of bounds', { ...good, pigs: [{ type: 'small', x: 1595, y: 700 }] }],
    ['thin block', { ...good, blocks: [{ kind: 'box', material: 'glass', x: 900, y: 810, w: 60, h: 10 }] }],
    ['no pigs', { ...good, pigs: [] }],
    ['slack mismatch', { ...good, slack: 0 }],
    ['stars inverted', { ...good, stars: { two: 9000, three: 8000 } }],
  ];

  it.each(bad)('rejects %s', (_name, stage) => {
    expect(validateStage(stage).length).toBeGreaterThan(0);
  });

  it('rejects wrong stage count and duplicate ids', () => {
    expect(validateAll(STAGES.slice(0, 9)).length).toBeGreaterThan(0);
    const dup = [...STAGES.slice(0, 9), { ...STAGES[0]! }];
    expect(validateAll(dup).length).toBeGreaterThan(0);
  });
});
