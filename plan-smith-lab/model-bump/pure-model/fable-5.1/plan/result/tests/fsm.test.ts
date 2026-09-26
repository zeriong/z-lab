/**
 * 상태 머신 (§10.1 fsm): 모든 전이표 항목, 잘못된 전이 거부, Paused 진입 시 드래그 취소 콜백 호출.
 */
import { describe, expect, it } from 'vitest';
import { ANCHOR } from '../src/core/config';
import { GAME_TRANSITIONS, StateMachine, type GameState } from '../src/core/StateMachine';
import { Session } from '../src/gameplay/Session';
import { LEVELS } from '../src/levels/index';

const ALL_STATES = Object.keys(GAME_TRANSITIONS) as GameState[];

describe('fsm', () => {
  it('accepts every transition listed in the table', () => {
    for (const from of ALL_STATES) {
      for (const to of GAME_TRANSITIONS[from]) {
        const m = new StateMachine<GameState>(from, GAME_TRANSITIONS);
        expect(m.can(to)).toBe(true);
        expect(m.transition(to)).toBe(true);
        expect(m.state).toBe(to);
      }
    }
  });

  it('rejects every transition not listed in the table and keeps the state', () => {
    for (const from of ALL_STATES) {
      for (const to of ALL_STATES) {
        if (GAME_TRANSITIONS[from].includes(to)) continue;
        const m = new StateMachine<GameState>(from, GAME_TRANSITIONS);
        expect(m.can(to)).toBe(false);
        expect(m.transition(to)).toBe(false);
        expect(m.state).toBe(from);
      }
    }
  });

  it('covers the required screens: MainMenu → Playing, Playing → Paused → (Playing | MainMenu)', () => {
    const m = new StateMachine<GameState>('MainMenu', GAME_TRANSITIONS);
    expect(m.transition('Playing')).toBe(true);
    expect(m.transition('Paused')).toBe(true);
    expect(m.transition('Playing')).toBe(true); // 계속하기 / 다시하기
    expect(m.transition('Paused')).toBe(true);
    expect(m.transition('MainMenu')).toBe(true); // 메인으로
    expect(m.state).toBe('MainMenu');
  });

  it('runs enter/exit hooks with (from, to) and supports unsubscribe', () => {
    const m = new StateMachine<GameState>('Playing', GAME_TRANSITIONS);
    const calls: string[] = [];
    m.onExit('Playing', (from, to) => calls.push(`exit ${from}->${to}`));
    const off = m.onEnter('Paused', (from, to) => calls.push(`enter ${from}->${to}`));
    m.onChange((from, to) => calls.push(`change ${from}->${to}`));
    m.transition('Paused');
    expect(calls).toEqual([
      'exit Playing->Paused',
      'enter Playing->Paused',
      'change Playing->Paused',
    ]);
    off();
    m.transition('Playing');
    m.transition('Paused');
    expect(calls.filter((c) => c.startsWith('enter')).length).toBe(1);
  });

  it('calls the drag-cancel hook on entering Paused and the bird returns to the anchor', () => {
    const session = new Session(LEVELS[0]);
    const m = new StateMachine<GameState>('Playing', GAME_TRANSITIONS);
    let cancelCalls = 0;
    m.onEnter('Paused', () => {
      cancelCalls += 1;
      session.shot.cancelDrag();
    });

    // 드래그 시작: 새 중심(앵커) 근처를 누르고 당긴다
    expect(session.shot.pointerDown({ x: ANCHOR.x, y: ANCHOR.y })).toBe(true);
    session.shot.pointerMove({ x: ANCHOR.x - 80, y: ANCHOR.y + 30 });
    expect(session.shot.phase).toBe('dragging');
    expect(session.shot.birdPosition?.x).toBeLessThan(ANCHOR.x - 50);

    m.transition('Paused');
    expect(cancelCalls).toBe(1);
    expect(session.shot.phase).toBe('ready');
    expect(session.shot.birdPosition).toEqual({ x: ANCHOR.x, y: ANCHOR.y });
    expect(session.birdsRemaining).toBe(LEVELS[0].birds.length);
    session.dispose();
  });

  it('leaves zero bodies behind after a session is disposed (no leak on "메인으로")', () => {
    const session = new Session(LEVELS[9]);
    expect(session.world.bodyCount()).toBeGreaterThan(1);
    session.dispose();
    expect(session.world.bodyCount()).toBe(0);
    expect(session.world.entities.size).toBe(0);
  });
});
