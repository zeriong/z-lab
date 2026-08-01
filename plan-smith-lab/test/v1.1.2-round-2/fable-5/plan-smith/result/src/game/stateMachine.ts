// 상태 머신: main → ingame → paused → cleared | failed (플랜 S2)

export type GameState = 'main' | 'ingame' | 'paused' | 'cleared' | 'failed';

const TRANSITIONS: Record<GameState, GameState[]> = {
  main: ['ingame'],
  ingame: ['paused', 'cleared', 'failed', 'main'],
  paused: ['ingame', 'main'],
  cleared: ['ingame', 'main'],
  failed: ['ingame', 'main'],
};

export class StateMachine {
  private _state: GameState = 'main';

  get state(): GameState {
    return this._state;
  }

  can(next: GameState): boolean {
    return TRANSITIONS[this._state].includes(next);
  }

  to(next: GameState): void {
    if (!this.can(next)) {
      throw new Error(`Invalid state transition: ${this._state} -> ${next}`);
    }
    this._state = next;
  }
}
