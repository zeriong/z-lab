import { describe, expect, it } from 'vitest';
import {
  ALL_APP_EVENTS,
  ALL_APP_STATES,
  holdsSession,
  transition,
} from '../../src/app/appMachine';
import type { AppEvent, AppEventType, AppState, AppStateName } from '../../src/app/appMachine';

// U-1: 모든 상태×이벤트 조합이 전이표와 일치하고, 정의되지 않은 조합은 상태를 바꾸지 않는다.

const ctx = { totalStages: 10, unlocked: 3 };

function eventOf(type: AppEventType, stage = 2): AppEvent {
  return type === 'select' ? { type, stage } : ({ type } as AppEvent);
}

function stateOf(name: AppStateName, stage: number | null = null): AppState {
  const needsStage = name === 'PLAYING' || name === 'PAUSED' || name === 'CLEARED' || name === 'FAILED';
  return { name, stage: needsStage ? (stage ?? 2) : null };
}

/** 기대 전이표 (§4.1). 키: "상태|이벤트" → [다음 상태, 다음 스테이지, 부수 효과] */
const TABLE: Record<string, [AppStateName, number | null, string[]]> = {
  'BOOT|ready': ['MAIN', null, []],
  'MAIN|start': ['STAGE_SELECT', null, []],
  'STAGE_SELECT|select': ['PLAYING', 2, ['createSession']],
  'STAGE_SELECT|back': ['MAIN', null, []],
  'PLAYING|pause': ['PAUSED', 2, ['cancelAim']],
  'PLAYING|cleared': ['CLEARED', 2, ['saveProgress']],
  'PLAYING|failed': ['FAILED', 2, []],
  'PAUSED|resume': ['PLAYING', 2, ['resetClock']],
  'PAUSED|retry': ['PLAYING', 2, ['recreateSession', 'resetClock']],
  'PAUSED|toMain': ['MAIN', null, ['destroySession']],
  'CLEARED|next': ['PLAYING', 3, ['recreateSession', 'resetClock']],
  'CLEARED|retry': ['PLAYING', 2, ['recreateSession', 'resetClock']],
  'CLEARED|toMain': ['MAIN', null, ['destroySession']],
  'FAILED|retry': ['PLAYING', 2, ['recreateSession', 'resetClock']],
  'FAILED|toMain': ['MAIN', null, ['destroySession']],
};

describe('appMachine (U-1)', () => {
  for (const name of ALL_APP_STATES) {
    for (const type of ALL_APP_EVENTS) {
      const key = `${name}|${type}`;
      it(`${key}`, () => {
        const s = stateOf(name);
        const tr = transition(s, eventOf(type), ctx);
        const expected = TABLE[key];
        if (!expected) {
          expect(tr).toBeNull();
          return;
        }
        expect(tr).not.toBeNull();
        expect(tr!.state).toEqual({ name: expected[0], stage: expected[1] });
        expect(tr!.effects).toEqual(expected[2]);
      });
    }
  }

  it('잠긴 스테이지나 범위 밖 번호는 선택되지 않는다', () => {
    const s = stateOf('STAGE_SELECT');
    expect(transition(s, { type: 'select', stage: 4 }, ctx)).toBeNull();
    expect(transition(s, { type: 'select', stage: 0 }, ctx)).toBeNull();
    expect(transition(s, { type: 'select', stage: 11 }, { totalStages: 10, unlocked: 10 })).toBeNull();
    expect(transition(s, { type: 'select', stage: 1.5 }, ctx)).toBeNull();
    expect(transition(s, { type: 'select', stage: 3 }, ctx)?.state).toEqual({ name: 'PLAYING', stage: 3 });
  });

  it('10단계에서는 next가 무시된다', () => {
    expect(transition({ name: 'CLEARED', stage: 10 }, { type: 'next' }, ctx)).toBeNull();
  });

  it('CLEARED에서 pause 같은 조합은 무시된다', () => {
    expect(transition({ name: 'CLEARED', stage: 1 }, { type: 'pause' }, ctx)).toBeNull();
    expect(transition({ name: 'PAUSED', stage: 1 }, { type: 'pause' }, ctx)).toBeNull();
  });

  it('세션 보유 상태 불변식', () => {
    expect(ALL_APP_STATES.filter(holdsSession)).toEqual(['PLAYING', 'PAUSED', 'CLEARED', 'FAILED']);
  });
});
