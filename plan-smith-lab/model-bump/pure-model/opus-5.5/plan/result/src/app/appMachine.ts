/**
 * 앱 상태 머신 (§4.1). 순수 전이표다. 전이표에 없는 조합은 모두 무시(null)한다.
 */

export type AppStateName = 'BOOT' | 'MAIN' | 'STAGE_SELECT' | 'PLAYING' | 'PAUSED' | 'CLEARED' | 'FAILED';

export interface AppState {
  name: AppStateName;
  /** PLAYING / PAUSED / CLEARED / FAILED에서 현재 스테이지 번호, 그 외 null */
  stage: number | null;
}

export type AppEvent =
  | { type: 'ready' }
  | { type: 'start' }
  | { type: 'select'; stage: number }
  | { type: 'back' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'retry' }
  | { type: 'toMain' }
  | { type: 'cleared' }
  | { type: 'failed' }
  | { type: 'next' };

export type AppEventType = AppEvent['type'];

export type AppEffect =
  | 'createSession'
  | 'recreateSession'
  | 'destroySession'
  | 'saveProgress'
  | 'cancelAim'
  | 'resetClock';

export interface AppContext {
  /** 전체 스테이지 수 (10) */
  totalStages: number;
  /** 해금된 최대 스테이지 */
  unlocked: number;
}

export interface Transition {
  state: AppState;
  effects: AppEffect[];
}

export const ALL_APP_STATES: readonly AppStateName[] = ['BOOT', 'MAIN', 'STAGE_SELECT', 'PLAYING', 'PAUSED', 'CLEARED', 'FAILED'];
export const ALL_APP_EVENTS: readonly AppEventType[] = [
  'ready', 'start', 'select', 'back', 'pause', 'resume', 'retry', 'toMain', 'cleared', 'failed', 'next',
];

export const INITIAL_APP_STATE: AppState = { name: 'BOOT', stage: null };

const go = (name: AppStateName, stage: number | null, effects: AppEffect[] = []): Transition => ({
  state: { name, stage },
  effects,
});

/** 다음 상태와 부수 효과. 무시해야 하는 조합이면 null */
export function transition(s: AppState, e: AppEvent, ctx: AppContext): Transition | null {
  switch (s.name) {
    case 'BOOT':
      return e.type === 'ready' ? go('MAIN', null) : null;

    case 'MAIN':
      return e.type === 'start' ? go('STAGE_SELECT', null) : null;

    case 'STAGE_SELECT':
      if (e.type === 'back') return go('MAIN', null);
      if (e.type === 'select') {
        const n = e.stage;
        if (!Number.isInteger(n) || n < 1 || n > ctx.totalStages || n > ctx.unlocked) return null;
        return go('PLAYING', n, ['createSession']);
      }
      return null;

    case 'PLAYING':
      if (e.type === 'pause') return go('PAUSED', s.stage, ['cancelAim']);
      if (e.type === 'cleared') return go('CLEARED', s.stage, ['saveProgress']);
      if (e.type === 'failed') return go('FAILED', s.stage);
      return null;

    case 'PAUSED':
      if (e.type === 'resume') return go('PLAYING', s.stage, ['resetClock']);
      if (e.type === 'retry') return go('PLAYING', s.stage, ['recreateSession', 'resetClock']);
      if (e.type === 'toMain') return go('MAIN', null, ['destroySession']);
      return null;

    case 'CLEARED':
      if (e.type === 'next') {
        if (s.stage === null || s.stage >= ctx.totalStages) return null;
        return go('PLAYING', s.stage + 1, ['recreateSession', 'resetClock']);
      }
      if (e.type === 'retry') return go('PLAYING', s.stage, ['recreateSession', 'resetClock']);
      if (e.type === 'toMain') return go('MAIN', null, ['destroySession']);
      return null;

    case 'FAILED':
      if (e.type === 'retry') return go('PLAYING', s.stage, ['recreateSession', 'resetClock']);
      if (e.type === 'toMain') return go('MAIN', null, ['destroySession']);
      return null;

    default:
      return null;
  }
}

/** 세션이 존재해야 하는 상태 (결과 화면은 배경용 멈춘 세션을 유지한다) */
export function holdsSession(name: AppStateName): boolean {
  return name === 'PLAYING' || name === 'PAUSED' || name === 'CLEARED' || name === 'FAILED';
}
