import { describe, expect, it } from 'vitest';
import { STAGES, validateStages } from '../stages';
import { SOLUTIONS } from '../stages/solutions';
import { STAGE_COUNT, type StageDef } from '../types';

describe('stages (A1/A3)', () => {
  it('has exactly 10 stages with ids 1..10', () => {
    expect(STAGES.length).toBe(STAGE_COUNT);
    expect(STAGES.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Set(STAGES.map((s) => s.id)).size).toBe(STAGE_COUNT);
  });

  it('every pig has hp > 0 and every block has positive size', () => {
    for (const s of STAGES) {
      for (const p of s.pigs) expect(p.hp).toBeGreaterThan(0);
      for (const b of s.blocks) {
        expect(b.w).toBeGreaterThan(0);
        expect(b.h).toBeGreaterThan(0);
      }
    }
  });

  it('stages are actually different layouts', () => {
    const keys = STAGES.map((s) => JSON.stringify({ p: s.pigs, b: s.blocks }));
    expect(new Set(keys).size).toBe(STAGE_COUNT);
  });

  it('difficulty curve: birds 5 -> 3, pigs 1 -> 5, stone ratio 0% -> >= 40%', () => {
    const first = STAGES[0];
    const last = STAGES[9];
    expect(first.birds.length).toBe(5);
    expect(last.birds.length).toBe(3);
    expect(first.pigs.length).toBe(1);
    expect(last.pigs.length).toBe(5);
    const stoneRatio = (s: StageDef) => s.blocks.filter((b) => b.material === 'stone').length / s.blocks.length;
    expect(stoneRatio(first)).toBe(0);
    expect(stoneRatio(last)).toBeGreaterThanOrEqual(0.4);
    for (let i = 1; i < STAGES.length; i++) {
      expect(STAGES[i]!.birds.length).toBeLessThanOrEqual(STAGES[i - 1]!.birds.length);
    }
  });

  it('validateStages rejects wrong length, duplicate id and hp <= 0', () => {
    expect(() => validateStages(STAGES.slice(0, 9))).toThrow(/expected 10/);
    const dup = STAGES.map((s, i) => (i === 1 ? { ...s, id: 1 } : s));
    expect(() => validateStages(dup)).toThrow();
    const badHp = STAGES.map((s, i) => (i === 0 ? { ...s, pigs: [{ x: 1, y: 1, hp: 0 }] } : s));
    expect(() => validateStages(badHp)).toThrow(/hp/);
  });

  it('solutions: one per stage, shots never exceed bird count', () => {
    expect(SOLUTIONS.length).toBe(STAGE_COUNT);
    for (const sol of SOLUTIONS) {
      const stage = STAGES.find((s) => s.id === sol.stageId);
      expect(stage).toBeDefined();
      expect(sol.shots.length).toBeGreaterThan(0);
      expect(sol.shots.length).toBeLessThanOrEqual(stage!.birds.length);
    }
  });
});
