import { eventBus } from './eventBus.js';

// Main -> InGame -> Paused -> (Cleared | Failed), exactly as specced.
export const STATES = Object.freeze({
  MAIN: 'MAIN',
  INGAME: 'INGAME',
  PAUSED: 'PAUSED',
  CLEARED: 'CLEARED',
  FAILED: 'FAILED',
});

const TRANSITIONS = {
  [STATES.MAIN]: [STATES.INGAME],
  [STATES.INGAME]: [STATES.PAUSED, STATES.CLEARED, STATES.FAILED, STATES.MAIN],
  [STATES.PAUSED]: [STATES.INGAME, STATES.MAIN],
  [STATES.CLEARED]: [STATES.INGAME, STATES.MAIN],
  [STATES.FAILED]: [STATES.INGAME, STATES.MAIN],
};

// All screen/flow transitions MUST go through this object -- no UI code or
// game code should flip screens directly -- so a stray call can never leave
// the game in an inconsistent state (e.g. two overlays open, or a physics
// loop still running after returning to the main menu).
class StateMachine {
  constructor() {
    this.current = STATES.MAIN;
  }

  can(to) {
    return TRANSITIONS[this.current]?.includes(to) ?? false;
  }

  transition(to) {
    if (!this.can(to)) {
      console.warn(`[state] invalid transition ${this.current} -> ${to}`);
      return false;
    }
    const from = this.current;
    this.current = to;
    eventBus.emit('state:changed', { from, to });
    return true;
  }

  is(state) {
    return this.current === state;
  }
}

export const gameState = new StateMachine();
