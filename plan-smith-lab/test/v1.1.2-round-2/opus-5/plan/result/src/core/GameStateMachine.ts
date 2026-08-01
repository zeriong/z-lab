/**
 * 상태 머신 (플랜 §3).
 * 전이는 전부 화이트리스트를 통과해야 하고, 비합법 전이는 no-op + 경고.
 */
export type GameState =
  | 'BOOT'
  | 'MAIN_MENU'
  | 'LOADING'
  | 'PLAYING'
  | 'PAUSED'
  | 'SETTLING'
  | 'CLEAR'
  | 'FAIL';

/** 플랜 §3 표의 합법 전이만 담는다. */
const ALLOWED: Record<GameState, GameState[]> = {
  BOOT: ['MAIN_MENU'],
  MAIN_MENU: ['LOADING'],
  LOADING: ['PLAYING'],
  PLAYING: ['PAUSED', 'SETTLING'],
  PAUSED: ['PLAYING', 'LOADING', 'MAIN_MENU'],
  SETTLING: ['CLEAR', 'FAIL', 'PLAYING'],
  CLEAR: ['LOADING', 'MAIN_MENU'],
  FAIL: ['LOADING', 'MAIN_MENU'],
};

export type TransitionListener = (to: GameState, from: GameState) => void;

export class GameStateMachine {
  private current: GameState = 'BOOT';
  private listeners: TransitionListener[] = [];
  /** 시도된 비합법 전이 수 (완료 기준 6 계측용) */
  rejectedCount = 0;

  get state(): GameState {
    return this.current;
  }

  is(...states: GameState[]): boolean {
    return states.includes(this.current);
  }

  can(to: GameState): boolean {
    return ALLOWED[this.current].includes(to);
  }

  onChange(fn: TransitionListener): void {
    this.listeners.push(fn);
  }

  /** 합법이면 전이하고 true, 아니면 상태 불변 + false. */
  transition(to: GameState): boolean {
    if (!this.can(to)) {
      this.rejectedCount++;
      console.warn(`[fsm] 비합법 전이 무시: ${this.current} -> ${to}`);
      return false;
    }
    const from = this.current;
    // 리스너 안에서의 재진입 전이를 허용하려면 상태를 먼저 확정해야 한다.
    this.current = to;
    for (const fn of this.listeners.slice()) fn(to, from);
    return true;
  }
}
