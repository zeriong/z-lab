import { GameState } from './types';
import { getStage, STAGES } from './stages';

export type ProgressionCallback = (event: ProgressionEvent) => void;

export interface ProgressionEvent {
    type: 'stage_loaded' | 'stage_progression';
    stage: number;
    total_stages: number;
}

export class StageProgression {
    private callbacks: ProgressionCallback[] = [];

    loadStage(gameState: GameState, stageNum: number): boolean {
        const stage = getStage(stageNum);
        if (!stage) {
            return false;
        }

        gameState.current_stage = stageNum;
        gameState.birds_available = stage.birds_available;
        gameState.birds_used = 0;
        gameState.birds_queue = [];
        gameState.blocks = stage.blocks.map(b => ({
            id: b.id,
            type: b.type,
            x: b.x,
            y: b.y,
            width: b.width,
            height: b.height,
            health: this.getBlockMaxHealth(b.type),
            max_health: this.getBlockMaxHealth(b.type),
            restitution: this.getBlockRestitution(b.type),
            destroying: false,
            destroy_progress: 0
        }));
        gameState.pigs = stage.pigs.map(p => ({
            id: p.id,
            x: p.x,
            y: p.y,
            width: 30,
            height: 30,
            health: 1
        }));
        gameState.score = 0;
        gameState.in_flight_count = 0;

        this.emit({
            type: 'stage_loaded',
            stage: stageNum,
            total_stages: STAGES.length
        });

        return true;
    }

    nextStage(gameState: GameState): void {
        const nextStageNum = gameState.current_stage + 1;
        if (nextStageNum <= STAGES.length) {
            this.loadStage(gameState, nextStageNum);
            this.emit({
                type: 'stage_progression',
                stage: nextStageNum,
                total_stages: STAGES.length
            });
        }
    }

    retryStage(gameState: GameState): void {
        const currentStageNum = gameState.current_stage;
        this.loadStage(gameState, currentStageNum);
    }

    private getBlockMaxHealth(type: string): number {
        switch (type) {
            case 'wood': return 1;
            case 'glass': return 2;
            case 'concrete': return 3;
            default: return 1;
        }
    }

    private getBlockRestitution(type: string): number {
        switch (type) {
            case 'wood': return 0.3;
            case 'glass': return 0.5;
            case 'concrete': return 0.2;
            default: return 0.3;
        }
    }

    subscribe(callback: ProgressionCallback): void {
        this.callbacks.push(callback);
    }

    private emit(event: ProgressionEvent): void {
        this.callbacks.forEach(cb => cb(event));
    }

    isLastStage(gameState: GameState): boolean {
        return gameState.current_stage === STAGES.length;
    }

    getTotalStages(): number {
        return STAGES.length;
    }
}
