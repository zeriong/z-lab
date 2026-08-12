export type GameState =
  | 'BOOT'
  | 'MAIN_MENU'
  | 'LEVEL_SELECT'
  | 'LOADING'
  | 'PLAYING'
  | 'PAUSED'
  | 'LEVEL_CLEAR'
  | 'LEVEL_FAIL';

export type PlayingSubstate = 'AIMING' | 'FLYING' | 'SETTLING';

const ALLOWED_TRANSITIONS: Record<GameState, GameState[]> = {
  BOOT: ['MAIN_MENU'],
  MAIN_MENU: ['LEVEL_SELECT', 'LOADING'],
  LEVEL_SELECT: ['MAIN_MENU', 'LOADING'],
  LOADING: ['PLAYING'],
  PLAYING: ['PAUSED', 'LEVEL_CLEAR', 'LEVEL_FAIL'],
  PAUSED: ['PLAYING', 'LOADING', 'MAIN_MENU'],
  LEVEL_CLEAR: ['LOADING', 'MAIN_MENU'],
  LEVEL_FAIL: ['LOADING', 'MAIN_MENU']
};

export class StateMachine {
  private currentState: GameState = 'BOOT';
  private currentSubstate: PlayingSubstate = 'AIMING';
  private listeners: Map<string, Set<(state: GameState, substate?: PlayingSubstate) => void>> = new Map();

  constructor() {
    this.currentState = 'BOOT';
  }

  getCurrentState(): GameState {
    return this.currentState;
  }

  getCurrentSubstate(): PlayingSubstate {
    return this.currentSubstate;
  }

  isPlaying(): boolean {
    return this.currentState === 'PLAYING';
  }

  isPaused(): boolean {
    return this.currentState === 'PAUSED';
  }

  transitionTo(newState: GameState, substate?: PlayingSubstate): void {
    if (!this.canTransitionTo(newState)) {
      console.error(`Invalid transition: ${this.currentState} -> ${newState}`);
      return;
    }

    const prevState = this.currentState;
    this.currentState = newState;

    if (substate && newState === 'PLAYING') {
      this.currentSubstate = substate;
    }

    this.emit('stateChange', newState, substate);

    if (prevState !== newState) {
      this.emit(newState, newState, substate);
    }
  }

  setPlayingSubstate(substate: PlayingSubstate): void {
    if (this.currentState === 'PLAYING') {
      this.currentSubstate = substate;
      this.emit('substateChange', this.currentState, substate);
    }
  }

  private canTransitionTo(newState: GameState): boolean {
    return ALLOWED_TRANSITIONS[this.currentState]?.includes(newState) ?? false;
  }

  on(event: string, callback: (state: GameState, substate?: PlayingSubstate) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (state: GameState, substate?: PlayingSubstate) => void): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: string, state: GameState, substate?: PlayingSubstate): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(state, substate));
    }
  }
}
