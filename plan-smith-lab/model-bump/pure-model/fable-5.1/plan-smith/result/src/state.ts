// D1: 게임은 정확히 하나의 상태에 있고, 전이는 transition(to) 한 함수로만 일어난다.

export const GAME_STATES = ['MAIN', 'SELECT', 'PLAYING', 'PAUSED', 'CLEARED', 'FAILED'] as const;
export type GameState = (typeof GAME_STATES)[number];

/** 허용 전이표. 표 밖의 전이는 throw. */
export const TRANSITIONS: Record<GameState, readonly GameState[]> = {
  MAIN: ['SELECT'],
  SELECT: ['MAIN', 'PLAYING'],
  PLAYING: ['PAUSED', 'CLEARED', 'FAILED'],
  PAUSED: ['PLAYING', 'MAIN'],
  CLEARED: ['PLAYING', 'SELECT', 'MAIN'],
  FAILED: ['PLAYING', 'SELECT', 'MAIN'],
};

export class TransitionError extends Error {
  constructor(
    public readonly from: GameState,
    public readonly to: GameState,
  ) {
    super(`Illegal state transition: ${from} -> ${to}`);
    this.name = 'TransitionError';
  }
}

export type StateListener = (to: GameState, from: GameState) => void;

export class StateMachine {
  private current: GameState = 'MAIN';
  private listeners: StateListener[] = [];
  /** PAUSED 진입 시각(ms). 재개 시 null. 콜드스타트 표 참고. */
  pausedAt: number | null = null;

  get state(): GameState {
    return this.current;
  }

  is(...states: GameState[]): boolean {
    return states.includes(this.current);
  }

  can(to: GameState): boolean {
    return TRANSITIONS[this.current].includes(to);
  }

  transition(to: GameState, now: number = Date.now()): void {
    const from = this.current;
    if (!this.can(to)) throw new TransitionError(from, to);
    this.current = to;
    this.pausedAt = to === 'PAUSED' ? now : null;
    for (const fn of this.listeners) fn(to, from);
  }

  onChange(fn: StateListener): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }
}

/** 앱 전역 상태 머신. 테스트는 new StateMachine()으로 격리한다. */
export const gameState = new StateMachine();

export function transition(to: GameState): void {
  gameState.transition(to);
}
