/**
 * Screen-level state machine (plan §3). Only transitions listed in the table
 * are legal; anything else throws in dev builds so a bad transition surfaces
 * immediately instead of producing a ghost state.
 */

export type GameState =
  | 'BOOT'
  | 'MAIN_MENU'
  | 'LEVEL_SELECT'
  | 'LOADING'
  | 'PLAYING'
  | 'PAUSED'
  | 'LEVEL_CLEAR'
  | 'LEVEL_FAIL';

const TRANSITIONS: Record<GameState, readonly GameState[]> = {
  BOOT: ['MAIN_MENU'],
  MAIN_MENU: ['LEVEL_SELECT', 'LOADING'],
  LEVEL_SELECT: ['MAIN_MENU', 'LOADING'],
  LOADING: ['PLAYING', 'MAIN_MENU'],
  PLAYING: ['PAUSED', 'LEVEL_CLEAR', 'LEVEL_FAIL'],
  PAUSED: ['PLAYING', 'LOADING', 'MAIN_MENU'],
  LEVEL_CLEAR: ['LOADING', 'MAIN_MENU', 'LEVEL_SELECT'],
  LEVEL_FAIL: ['LOADING', 'MAIN_MENU', 'LEVEL_SELECT'],
};

export interface StateMachineOptions {
  strict?: boolean;
  onChange?: (next: GameState, prev: GameState) => void;
}

export class StateMachine {
  private current: GameState;
  private readonly strict: boolean;
  private readonly onChange: ((next: GameState, prev: GameState) => void) | undefined;

  constructor(initial: GameState, options: StateMachineOptions = {}) {
    this.current = initial;
    this.strict = options.strict ?? true;
    this.onChange = options.onChange;
  }

  get state(): GameState {
    return this.current;
  }

  is(...states: GameState[]): boolean {
    return states.includes(this.current);
  }

  canGo(next: GameState): boolean {
    return TRANSITIONS[this.current].includes(next);
  }

  /** @returns true when the transition was applied. */
  go(next: GameState): boolean {
    if (next === this.current) return false;
    if (!this.canGo(next)) {
      const message = `[StateMachine] illegal transition ${this.current} -> ${next}`;
      if (this.strict) throw new Error(message);
      console.warn(message);
      return false;
    }
    const prev = this.current;
    this.current = next;
    this.onChange?.(next, prev);
    return true;
  }
}
