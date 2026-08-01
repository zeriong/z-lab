export enum GameState {
    MENU = 'MENU',
    GAME = 'GAME',
    PAUSE = 'PAUSE',
    CLEAR = 'CLEAR',
    FAIL = 'FAIL'
}

export class StateMachine {
    private currentState: GameState = GameState.MENU;

    constructor() {}

    public setState(state: GameState): void {
        this.currentState = state;
    }

    public get state(): GameState {
        return this.currentState;
    }

    public is(state: GameState): boolean {
        return this.currentState === state;
    }
}
