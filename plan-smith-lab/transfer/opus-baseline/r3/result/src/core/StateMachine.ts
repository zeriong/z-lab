import { GameState } from './types';

type StateTransitions = {
  [key in GameState]: GameState[];
};

const VALID_TRANSITIONS: StateTransitions = {
  BOOT: ['MAIN_MENU'],
  MAIN_MENU: ['LEVEL_SELECT', 'LOADING'],
  LEVEL_SELECT: ['MAIN_MENU', 'LOADING'],
  LOADING: ['PLAYING'],
  PLAYING: ['PAUSED', 'LEVEL_CLEAR', 'LEVEL_FAIL'],
  PAUSED: ['PLAYING', 'LOADING', 'MAIN_MENU'],
  LEVEL_CLEAR: ['LOADING', 'MAIN_MENU'],
  LEVEL_FAIL: ['LOADING', 'MAIN_MENU'],
};

export class StateMachine {
  private currentState: GameState = 'BOOT';
  private callbacks: Map<GameState, Set<(state: GameState) => void>> = new Map();

  constructor() {
    for (const state of Object.keys(VALID_TRANSITIONS) as GameState[]) {
      this.callbacks.set(state, new Set());
    }
  }

  current(): GameState {
    return this.currentState;
  }

  canTransition(toState: GameState): boolean {
    return VALID_TRANSITIONS[this.currentState].includes(toState);
  }

  transition(toState: GameState): void {
    if (!this.canTransition(toState)) {
      console.error(
        `Invalid state transition: ${this.currentState} -> ${toState}. Valid: ${VALID_TRANSITIONS[this.currentState].join(', ')}`
      );
      return;
    }
    this.currentState = toState;
    const callbacks = this.callbacks.get(toState);
    if (callbacks) {
      callbacks.forEach((cb) => cb(toState));
    }
  }

  on(state: GameState, callback: (state: GameState) => void): void {
    const callbacks = this.callbacks.get(state);
    if (callbacks) {
      callbacks.add(callback);
    }
  }
}
