import { GameState, GameStateEnum } from './types';

export type GameEvent =
    | { type: 'PLAY_STAGE'; stage: number }
    | { type: 'PAUSE' }
    | { type: 'RESUME' }
    | { type: 'STAGE_CLEAR' }
    | { type: 'STAGE_FAIL' }
    | { type: 'RESTART' }
    | { type: 'NEXT_STAGE' }
    | { type: 'RETURN_TO_MENU' };

export class StateMachine {
    private eventQueue: GameEvent[] = [];
    private currentState: GameStateEnum = GameStateEnum.MENU;

    constructor() {}

    getState(): GameStateEnum {
        return this.currentState;
    }

    setState(state: GameStateEnum): void {
        this.currentState = state;
    }

    pushEvent(event: GameEvent): void {
        this.eventQueue.push(event);
    }

    processEvents(): GameEvent[] {
        const events = this.eventQueue;
        this.eventQueue = [];

        events.forEach(event => {
            const newState = this.transitionState(this.currentState, event);
            if (newState !== this.currentState) {
                this.currentState = newState;
            }
        });

        return events;
    }

    private transitionState(currentState: GameStateEnum, event: GameEvent): GameStateEnum {
        switch (currentState) {
            case GameStateEnum.MENU:
                if (event.type === 'PLAY_STAGE') {
                    return GameStateEnum.PLAY;
                }
                break;

            case GameStateEnum.PLAY:
                if (event.type === 'PAUSE') {
                    return GameStateEnum.PAUSE;
                } else if (event.type === 'STAGE_CLEAR') {
                    return GameStateEnum.CLEAR;
                } else if (event.type === 'STAGE_FAIL') {
                    return GameStateEnum.FAIL;
                }
                break;

            case GameStateEnum.PAUSE:
                if (event.type === 'RESUME') {
                    return GameStateEnum.PLAY;
                } else if (event.type === 'RESTART') {
                    return GameStateEnum.PLAY;
                } else if (event.type === 'RETURN_TO_MENU') {
                    return GameStateEnum.MENU;
                }
                break;

            case GameStateEnum.CLEAR:
                if (event.type === 'NEXT_STAGE') {
                    return GameStateEnum.PLAY;
                } else if (event.type === 'RETURN_TO_MENU') {
                    return GameStateEnum.MENU;
                }
                break;

            case GameStateEnum.FAIL:
                if (event.type === 'RESTART') {
                    return GameStateEnum.PLAY;
                } else if (event.type === 'RETURN_TO_MENU') {
                    return GameStateEnum.MENU;
                }
                break;
        }

        return currentState;
    }

    canTransition(currentState: GameStateEnum, event: GameEvent): boolean {
        const newState = this.transitionState(currentState, event);
        return newState !== currentState;
    }
}
