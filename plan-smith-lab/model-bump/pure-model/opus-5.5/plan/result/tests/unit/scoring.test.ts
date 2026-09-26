import { describe, expect, it } from 'vitest';
import {
  birdsLeftBonus,
  blockScore,
  pigScore,
  starsFor,
  starThresholdsFromReference,
  tntScore,
} from '../../src/core/rules/scoring';

// U-6: 이벤트별 점수, 남은 새 보너스, 별 경계값(임계값과 정확히 같은 점수 포함)

describe('scoring (U-6)', () => {
  it('이벤트별 점수', () => {
    expect(pigScore()).toBe(5000);
    expect(blockScore('glass')).toBe(300);
    expect(blockScore('wood')).toBe(500);
    expect(blockScore('stone')).toBe(800);
    expect(tntScore()).toBe(1000);
  });

  it('남은 새 1마리당 10,000', () => {
    expect(birdsLeftBonus(0)).toBe(0);
    expect(birdsLeftBonus(3)).toBe(30000);
    expect(birdsLeftBonus(-1)).toBe(0);
  });

  it('별 경계값', () => {
    const t: [number, number] = [15000, 25000];
    expect(starsFor(0, t, true)).toBe(1);
    expect(starsFor(14999, t, true)).toBe(1);
    expect(starsFor(15000, t, true)).toBe(2);
    expect(starsFor(24999, t, true)).toBe(2);
    expect(starsFor(25000, t, true)).toBe(3);
    expect(starsFor(99999, t, false)).toBe(0);
  });

  it('별 기준: 3★ = 기준 점수의 95%를 1,000 단위 내림, 2★ = 3★의 75%', () => {
    expect(starThresholdsFromReference(25500)).toEqual([18000, 24000]);
    expect(starThresholdsFromReference(35300)).toEqual([24000, 33000]);
  });
});
