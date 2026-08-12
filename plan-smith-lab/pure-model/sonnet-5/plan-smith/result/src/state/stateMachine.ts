export type GameStateName = 'MainMenu' | 'Loading' | 'Playing' | 'Paused' | 'Cleared' | 'Failed';

export type GameAction =
  | { type: 'LOAD_STAGE'; stageIndex: number }
  | { type: 'STAGE_READY' }
  | { type: 'PAUSE' }
  | { type: 'RESTART' }
  | { type: 'MAIN_MENU' }
  | { type: 'CLEARED' }
  | { type: 'FAILED' }
  | { type: 'NEXT_STAGE' }
  | { type: 'RETRY' };

export interface StateContext {
  currentStageIndex: number | null;
}

type Listener = (state: GameStateName, prev: GameStateName, ctx: StateContext) => void;

// 가정(로드베어링): 일시정지 오버레이에는 "다시하기"/"메인으로"만 있고 재개(RESUME) 전이는 없다.
// 그래서 Paused에서 Playing으로 돌아가는 전이가 의도적으로 존재하지 않는다.
const TRANSITIONS: Record<GameStateName, Partial<Record<GameAction['type'], GameStateName>>> = {
  MainMenu: { LOAD_STAGE: 'Loading' },
  Loading: { STAGE_READY: 'Playing' },
  Playing: { PAUSE: 'Paused', CLEARED: 'Cleared', FAILED: 'Failed' },
  Paused: { RESTART: 'Loading', MAIN_MENU: 'MainMenu' },
  Cleared: { NEXT_STAGE: 'Loading', MAIN_MENU: 'MainMenu' },
  Failed: { RETRY: 'Loading', MAIN_MENU: 'MainMenu' },
};

/**
 * 스텝 1 — 물리 월드 + 상태머신 골격.
 * 상태: MainMenu / Loading / Playing / Paused / Cleared / Failed.
 */
export class GameStateMachine {
  private state: GameStateName = 'MainMenu';
  private ctx: StateContext = { currentStageIndex: null };
  private enterCallbacks: Partial<Record<GameStateName, Array<(ctx: StateContext) => void>>> = {};
  private exitCallbacks: Partial<Record<GameStateName, Array<(ctx: StateContext) => void>>> = {};
  private listeners: Listener[] = [];

  getState(): GameStateName {
    return this.state;
  }

  getContext(): StateContext {
    return this.ctx;
  }

  onEnter(state: GameStateName, cb: (ctx: StateContext) => void): void {
    (this.enterCallbacks[state] ??= []).push(cb);
  }

  onExit(state: GameStateName, cb: (ctx: StateContext) => void): void {
    (this.exitCallbacks[state] ??= []).push(cb);
  }

  subscribe(listener: Listener): void {
    this.listeners.push(listener);
  }

  dispatch(action: GameAction): boolean {
    const nextState = TRANSITIONS[this.state]?.[action.type];
    if (!nextState) return false;

    if (action.type === 'LOAD_STAGE') {
      this.ctx = { ...this.ctx, currentStageIndex: action.stageIndex };
    }
    if (action.type === 'NEXT_STAGE') {
      const next = (this.ctx.currentStageIndex ?? 0) + 1;
      this.ctx = { ...this.ctx, currentStageIndex: next };
    }
    // RESTART/RETRY는 currentStageIndex를 그대로 유지한다 (동일 스테이지 재로드).

    const prevState = this.state;
    (this.exitCallbacks[prevState] ?? []).forEach((cb) => cb(this.ctx));
    this.state = nextState;
    (this.enterCallbacks[nextState] ?? []).forEach((cb) => cb(this.ctx));
    this.listeners.forEach((l) => l(nextState, prevState, this.ctx));
    return true;
  }
}
