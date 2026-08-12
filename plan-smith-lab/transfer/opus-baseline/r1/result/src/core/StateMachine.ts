export enum GameState {
  BOOT = 'BOOT',
  MAIN_MENU = 'MAIN_MENU',
  LEVEL_SELECT = 'LEVEL_SELECT',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  LEVEL_CLEAR = 'LEVEL_CLEAR',
  LEVEL_FAIL = 'LEVEL_FAIL',
}

type StateTransition = {
  [key in GameState]?: GameState[];
};

export class StateMachine {
  private currentState: GameState = GameState.BOOT;
  private allowedTransitions: StateTransition = {
    [GameState.BOOT]: [GameState.MAIN_MENU],
    [GameState.MAIN_MENU]: [GameState.LEVEL_SELECT, GameState.LOADING],
    [GameState.LEVEL_SELECT]: [GameState.MAIN_MENU, GameState.LOADING],
    [GameState.LOADING]: [GameState.PLAYING],
    [GameState.PLAYING]: [GameState.PAUSED, GameState.LEVEL_CLEAR, GameState.LEVEL_FAIL],
    [GameState.PAUSED]: [GameState.PLAYING, GameState.LOADING, GameState.MAIN_MENU],
    [GameState.LEVEL_CLEAR]: [GameState.LOADING, GameState.MAIN_MENU],
    [GameState.LEVEL_FAIL]: [GameState.LOADING, GameState.MAIN_MENU],
  };

  constructor() {}

  canTransition(toState: GameState): boolean {
    const allowed = this.allowedTransitions[this.currentState];
    return allowed ? allowed.includes(toState) : false;
  }

  transition(toState: GameState): boolean {
    if (!this.canTransition(toState)) {
      console.warn(`Invalid transition from ${this.currentState} to ${toState}`);
      return false;
    }
    console.log(`State: ${this.currentState} → ${toState}`);
    this.currentState = toState;
    return true;
  }

  getState(): GameState {
    return this.currentState;
  }

  isState(state: GameState): boolean {
    return this.currentState === state;
  }
}
