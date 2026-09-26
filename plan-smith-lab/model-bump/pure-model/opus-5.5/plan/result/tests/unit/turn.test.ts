import { describe, expect, it } from 'vitest';
import { DEFAULT_TIMINGS, initialTurn, turnReducer } from '../../src/core/rules/turn';
import type { TurnCtx, TurnInput, TurnState } from '../../src/core/rules/turn';

// U-4: LOADING부터 EVALUATE까지의 전이. 마지막 돼지 처치 시 어느 상태에서든 CLEAR_PENDING. 실패는 EVALUATE에서만.

const run = (ctx: TurnCtx, ...inputs: TurnInput[]) => inputs.reduce((c, i) => turnReducer(c, i), ctx);
const at = (state: TurnState, birdsLeft = 2, pigsLeft = 1, since = 0): TurnCtx => ({ state, since, birdsLeft, pigsLeft });

describe('turn (U-4)', () => {
  it('LOADING → (0.5s) → READY', () => {
    const c0 = initialTurn(3, 1);
    expect(turnReducer(c0, { type: 'tick', now: 0.49 }).state).toBe('LOADING');
    expect(turnReducer(c0, { type: 'tick', now: DEFAULT_TIMINGS.loading }).state).toBe('READY');
  });

  it('READY → grab → AIMING → release(≥최소) → FLYING, 새 1마리 소모', () => {
    const c = run(at('READY', 3), { type: 'grab', now: 1 }, { type: 'release', now: 1.2, pullLen: 50, minPull: 20 });
    expect(c.state).toBe('FLYING');
    expect(c.birdsLeft).toBe(2);
  });

  it('release(<최소)와 cancel은 READY로 돌아가고 새를 소모하지 않는다', () => {
    const a = run(at('READY', 3), { type: 'grab', now: 1 }, { type: 'release', now: 1.1, pullLen: 5, minPull: 20 });
    expect(a).toMatchObject({ state: 'READY', birdsLeft: 3 });
    const b = run(at('READY', 3), { type: 'grab', now: 1 }, { type: 'cancel', now: 1.1 });
    expect(b).toMatchObject({ state: 'READY', birdsLeft: 3 });
  });

  it('FLYING → birdDone → SETTLING → settled → EVALUATE → LOADING', () => {
    const c = run(
      at('FLYING', 2, 1, 1),
      { type: 'birdDone', now: 2 },
      { type: 'settled', now: 3 },
    );
    expect(c.state).toBe('EVALUATE');
    expect(turnReducer(c, { type: 'evaluate', now: 3 }).state).toBe('LOADING');
  });

  it('FLYING 8s, SETTLING 3s 타임아웃', () => {
    expect(turnReducer(at('FLYING', 2, 1, 0), { type: 'tick', now: 8 }).state).toBe('SETTLING');
    expect(turnReducer(at('FLYING', 2, 1, 0), { type: 'tick', now: 7.9 }).state).toBe('FLYING');
    expect(turnReducer(at('SETTLING', 2, 1, 0), { type: 'tick', now: 3 }).state).toBe('EVALUATE');
  });

  it('CLEAR_PENDING → (1.5s) → CLEARED', () => {
    expect(turnReducer(at('CLEAR_PENDING', 1, 0, 5), { type: 'tick', now: 6.4 }).state).toBe('CLEAR_PENDING');
    expect(turnReducer(at('CLEAR_PENDING', 1, 0, 5), { type: 'tick', now: 6.5 }).state).toBe('CLEARED');
  });

  const states: TurnState[] = ['LOADING', 'READY', 'AIMING', 'FLYING', 'SETTLING', 'EVALUATE'];
  for (const s of states) {
    it(`${s}에서 마지막 돼지가 죽으면 즉시 CLEAR_PENDING`, () => {
      const c = turnReducer(at(s, 0, 1), { type: 'pigs', now: 4, pigsLeft: 0 });
      expect(c.state).toBe('CLEAR_PENDING');
      expect(c.since).toBe(4);
    });
  }

  it('실패는 EVALUATE에서만: 새 0, 돼지 남음', () => {
    // FLYING/SETTLING에서 새가 0이어도 실패하지 않는다
    expect(turnReducer(at('SETTLING', 0, 1, 0), { type: 'tick', now: 1 }).state).toBe('SETTLING');
    const ev = turnReducer(at('SETTLING', 0, 1, 0), { type: 'settled', now: 1 });
    expect(ev.state).toBe('EVALUATE');
    expect(turnReducer(ev, { type: 'evaluate', now: 1 }).state).toBe('FAILED');
  });

  it('마지막 새를 쏜 뒤 정착 중에 돼지가 죽으면 클리어', () => {
    const c = turnReducer(at('SETTLING', 0, 1, 0), { type: 'pigs', now: 1, pigsLeft: 0 });
    expect(c.state).toBe('CLEAR_PENDING');
  });

  it('EVALUATE에서 돼지가 0이면 CLEAR_PENDING', () => {
    expect(turnReducer(at('EVALUATE', 0, 0), { type: 'evaluate', now: 1 }).state).toBe('CLEAR_PENDING');
  });

  it('종료 상태는 더 이상 바뀌지 않는다', () => {
    for (const s of ['CLEARED', 'FAILED'] as const) {
      const c = at(s);
      expect(turnReducer(c, { type: 'tick', now: 100 })).toBe(c);
      expect(turnReducer(c, { type: 'pigs', now: 100, pigsLeft: 0 })).toBe(c);
    }
  });

  it('정의되지 않은 조합은 무시한다', () => {
    const c = at('LOADING');
    expect(turnReducer(c, { type: 'grab', now: 0.1 })).toBe(c);
    expect(turnReducer(at('READY'), { type: 'birdDone', now: 1 }).state).toBe('READY');
  });
});
