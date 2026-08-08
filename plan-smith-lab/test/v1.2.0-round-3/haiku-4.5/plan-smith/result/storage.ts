import { GameState } from './types';

const STORAGE_KEY = 'angry_birds_progress';
const MAX_SAVED_STAGES = 50;

export class StorageManager {
    saveProgress(gameState: GameState): void {
        try {
            const data = {
                cleared_stages: gameState.cleared_stages,
                current_stage: gameState.current_stage,
                stage_scores: gameState.stage_scores,
                timestamp: Date.now()
            };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            this.pruneOldData();
        } catch (e) {
            if (e instanceof Error && e.message.includes('QuotaExceededError')) {
                this.pruneOldData();
                try {
                    const data = {
                        cleared_stages: gameState.cleared_stages,
                        current_stage: gameState.current_stage,
                        stage_scores: gameState.stage_scores,
                        timestamp: Date.now()
                    };
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                } catch (retryError) {
                    console.error('Failed to save progress after pruning:', retryError);
                }
            } else {
                console.error('Failed to save progress:', e);
            }
        }
    }

    loadProgress(): Partial<GameState> | null {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('Failed to load progress:', e);
        }
        return null;
    }

    clearProgress(): void {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.error('Failed to clear progress:', e);
        }
    }

    private pruneOldData(): void {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                const parsed = JSON.parse(data);

                // Keep only last 50 stages
                if (parsed.cleared_stages && parsed.cleared_stages.length > MAX_SAVED_STAGES) {
                    parsed.cleared_stages = parsed.cleared_stages.slice(-MAX_SAVED_STAGES);
                }

                localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
            }
        } catch (e) {
            console.error('Failed to prune data:', e);
        }
    }

    hasProgress(): boolean {
        return localStorage.getItem(STORAGE_KEY) !== null;
    }

    getHighScore(stageNum: number): { stars: number; score: number } | null {
        const progress = this.loadProgress();
        if (progress && progress.stage_scores && progress.stage_scores[stageNum]) {
            return progress.stage_scores[stageNum];
        }
        return null;
    }

    getAllScores(): { [key: number]: { stars: number; score: number } } {
        const progress = this.loadProgress();
        return progress?.stage_scores || {};
    }
}
