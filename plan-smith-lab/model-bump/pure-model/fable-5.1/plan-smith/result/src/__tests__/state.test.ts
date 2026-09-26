import { describe, expect, it } from 'vitest';
import { GAME_STATES, StateMachine, TRANSITIONS, TransitionError } from '../state';

describe('state machine (D1)', () => {
  it('starts in MAIN', () => {
    expect(new StateMachine().state).toBe('MAIN');
  });

  it('follows MAIN -> SELECT -> PLAYING -> PAUSED -> PLAYING', () => {
    const sm = new StateMachine();
    sm.transition('SELECT');
    sm.transition('PLAYING');
    sm.transition('PAUSED', 1234);
    expect(sm.pausedAt).toBe(1234);
    sm.transition('PLAYING');
    expect(sm.pausedAt).toBeNull();
    expect(sm.state).toBe('PLAYING');
  });

  it('throws on PAUSED -> CLEARED (illegal transition)', () => {
    const sm = new StateMachine();
    sm.transition('SELECT');
    sm.transition('PLAYING');
    sm.transition('PAUSED');
    expect(() => sm.transition('CLEARED')).toThrow(TransitionError);
    expect(sm.state).toBe('PAUSED');
  });

  it('throws on MAIN -> PLAYING and PLAYING -> MAIN', () => {
    const sm = new StateMachine();
    expect(() => sm.transition('PLAYING')).toThrow(TransitionError);
    sm.transition('SELECT');
    sm.transition('PLAYING');
    expect(() => sm.transition('MAIN')).toThrow(TransitionError);
  });

  it('notifies listeners with (to, from) and supports unsubscribe', () => {
    const sm = new StateMachine();
    const seen: string[] = [];
    const off = sm.onChange((to, from) => seen.push(`${from}>${to}`));
    sm.transition('SELECT');
    off();
    sm.transition('MAIN');
    expect(seen).toEqual(['MAIN>SELECT']);
  });

  it('transition table covers every state', () => {
    for (const s of GAME_STATES) expect(Array.isArray(TRANSITIONS[s])).toBe(true);
  });
});
