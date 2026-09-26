/**
 * 판정 규칙 (§10.1 judge):
 * 돼지 0 → 1.2초(72틱) 후 클리어, 새 0 + 미정착 → 실패 아님, 정착 후 → 실패, 동시 성립 시 클리어 우선.
 */
import { describe, expect, it } from 'vitest';
import { CLEAR_DELAY_TICKS } from '../src/core/config';
import { Judge } from '../src/gameplay/Judge';

describe('judge', () => {
  it('clears 1.2s (72 ticks) after the last pig dies', () => {
    const j = new Judge();
    for (let i = 0; i < CLEAR_DELAY_TICKS - 1; i++) {
      expect(j.update({ pigsAlive: 0, birdsRemaining: 2, shotSettled: false })).toBe('none');
      expect(j.clearPending).toBe(true);
    }
    expect(j.update({ pigsAlive: 0, birdsRemaining: 2, shotSettled: false })).toBe('clear');
    expect(j.verdict).toBe('clear');
  });

  it('does not fail while the last shot is still in flight', () => {
    const j = new Judge();
    for (let i = 0; i < 300; i++) {
      expect(j.update({ pigsAlive: 1, birdsRemaining: 0, shotSettled: false })).toBe('none');
    }
  });

  it('fails once the last shot has settled with pigs remaining', () => {
    const j = new Judge();
    expect(j.update({ pigsAlive: 1, birdsRemaining: 0, shotSettled: false })).toBe('none');
    expect(j.update({ pigsAlive: 1, birdsRemaining: 0, shotSettled: true })).toBe('failed');
  });

  it('never fails while birds remain', () => {
    const j = new Judge();
    expect(j.update({ pigsAlive: 3, birdsRemaining: 1, shotSettled: true })).toBe('none');
  });

  it('prefers clear when clear and fail conditions coincide', () => {
    const j = new Judge();
    let v: string = 'none';
    for (let i = 0; i < CLEAR_DELAY_TICKS + 5; i++) {
      v = j.update({ pigsAlive: 0, birdsRemaining: 0, shotSettled: true });
      expect(v).not.toBe('failed');
    }
    expect(v).toBe('clear');
  });

  it('resets the clear timer if a pig reappears before the delay elapses', () => {
    const j = new Judge();
    for (let i = 0; i < 10; i++) j.update({ pigsAlive: 0, birdsRemaining: 1, shotSettled: false });
    expect(j.clearPending).toBe(true);
    j.update({ pigsAlive: 1, birdsRemaining: 1, shotSettled: false });
    expect(j.clearPending).toBe(false);
    expect(j.clearTimer).toBe(-1);
  });

  it('keeps a verdict once decided', () => {
    const j = new Judge();
    j.update({ pigsAlive: 1, birdsRemaining: 0, shotSettled: true });
    expect(j.verdict).toBe('failed');
    expect(j.update({ pigsAlive: 0, birdsRemaining: 0, shotSettled: true })).toBe('failed');
    j.reset();
    expect(j.verdict).toBe('none');
  });
});
