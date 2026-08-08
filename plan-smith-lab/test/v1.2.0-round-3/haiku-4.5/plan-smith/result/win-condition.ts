import { GameState } from './types';

export interface WinConditionResult {
    cleared: boolean;
    failed: boolean;
}

export class WinConditionChecker {
    checkConditions(gameState: GameState): WinConditionResult {
        const result: WinConditionResult = {
            cleared: false,
            failed: false
        };

        // Count birds in flight (birds that were launched but haven't collided yet)
        const birdBodies = gameState.birds_queue.filter(b => b.in_flight);
        const in_flight = birdBodies.length;

        // Check clear condition: all pigs removed AND no birds in flight
        if (gameState.pigs.length === 0 && in_flight === 0) {
            result.cleared = true;
            this.calculateScore(gameState);
        }

        // Check fail condition: all birds used AND no birds in flight AND pigs still exist
        if (gameState.birds_used >= gameState.birds_available &&
            in_flight === 0 &&
            gameState.pigs.length > 0) {
            result.failed = true;
        }

        return result;
    }

    private calculateScore(gameState: GameState): void {
        const stage_num = gameState.current_stage;
        const birds_available = gameState.birds_available;
        const birds_used = gameState.birds_used;

        let stars = 1;
        if (birds_used <= Math.ceil(birds_available * 0.4)) {
            stars = 3;
        } else if (birds_used <= Math.ceil(birds_available * 0.75)) {
            stars = 2;
        }

        const score = stars * 100;
        gameState.score = score;
        gameState.stage_scores[stage_num] = {
            stars,
            score
        };

        // Mark stage as cleared
        if (!gameState.cleared_stages.includes(stage_num)) {
            gameState.cleared_stages.push(stage_num);
        }
    }

    getStarCount(gameState: GameState): number {
        const stage_score = gameState.stage_scores[gameState.current_stage];
        return stage_score?.stars || 0;
    }
}
