// State machine for the game
const GameState = {
  MENU: 'MENU',
  INGAME: 'INGAME',
  AIMING: 'AIMING',
  FLYING: 'FLYING',
  PAUSED: 'PAUSED',
  RESULT: 'RESULT'
};

class StateManager {
  constructor() {
    this.currentState = GameState.MENU;
    this.listeners = [];
  }

  setState(newState) {
    if (this.currentState !== newState) {
      const oldState = this.currentState;
      this.currentState = newState;
      this.notifyListeners(oldState, newState);
    }
  }

  getState() {
    return this.currentState;
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  notifyListeners(oldState, newState) {
    this.listeners.forEach(callback => callback(oldState, newState));
  }

  isInGame() {
    return this.currentState === GameState.INGAME ||
           this.currentState === GameState.AIMING ||
           this.currentState === GameState.FLYING;
  }

  isPaused() {
    return this.currentState === GameState.PAUSED;
  }
}

const stateManager = new StateManager();
