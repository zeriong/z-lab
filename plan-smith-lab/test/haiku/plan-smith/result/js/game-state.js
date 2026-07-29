import { STATE, STAGE_CLEAR_STABILITY_TIME } from './constants.js';

class GameState {
    constructor() {
        this.state = STATE.MAIN_MENU;
        this.currentStageIndex = 0;
        this.completedStages = new Set();
        this.stageStartTime = 0;
        this.clearTime = 0;
        this.pauseState = null;
        this.stableTime = 0;
    }

    getCurrentState() {
        return this.state;
    }

    isState(stateName) {
        return this.state === stateName;
    }

    transitionTo(newState) {
        this.state = newState;
        return true;
    }

    getCurrentStageIndex() {
        return this.currentStageIndex;
    }

    setCurrentStage(index) {
        this.currentStageIndex = index;
        this.stageStartTime = Date.now();
        this.stableTime = 0;
        this.state = STATE.PLAYING;
    }

    markStageClear(stageIndex) {
        this.completedStages.add(stageIndex);
        this.clearTime = Date.now() - this.stageStartTime;
    }

    isStageCompleted(stageIndex) {
        return this.completedStages.has(stageIndex);
    }

    getCompletedCount() {
        return this.completedStages.size;
    }

    getTotalStages() {
        return 10;
    }

    pause() {
        if (this.state === STATE.PLAYING) {
            this.pauseState = {
                previousState: STATE.PLAYING
            };
            this.state = STATE.PAUSED;
            return true;
        }
        return false;
    }

    resume() {
        if (this.state === STATE.PAUSED) {
            this.state = this.pauseState.previousState;
            this.pauseState = null;
            return true;
        }
        return false;
    }

    restart() {
        if (this.state === STATE.PAUSED) {
            this.pauseState = null;
            this.state = STATE.PLAYING;
            this.stageStartTime = Date.now();
            this.stableTime = 0;
            return true;
        }
        return false;
    }

    goToMenu() {
        this.state = STATE.MAIN_MENU;
        this.pauseState = null;
        return true;
    }

    nextStage() {
        if (this.currentStageIndex < this.getTotalStages() - 1) {
            this.currentStageIndex++;
            this.stageStartTime = Date.now();
            this.stableTime = 0;
            this.state = STATE.PLAYING;
            return true;
        } else {
            // All stages completed
            this.state = STATE.MAIN_MENU;
            return false;
        }
    }

    startGame() {
        this.state = STATE.LOADING;
        this.currentStageIndex = 0;
        return true;
    }

    updateStability(isStable) {
        if (isStable) {
            this.stableTime += 16; // Assuming ~60 FPS
        } else {
            this.stableTime = 0;
        }

        return this.stableTime >= STAGE_CLEAR_STABILITY_TIME;
    }

    getElapsedTime() {
        if (this.state === STATE.PLAYING || this.state === STATE.PAUSED) {
            return Date.now() - this.stageStartTime;
        }
        return 0;
    }

    saveSnapshot() {
        return {
            state: this.state,
            currentStageIndex: this.currentStageIndex,
            completedStages: new Set(this.completedStages),
            stageStartTime: this.stageStartTime,
            stableTime: this.stableTime
        };
    }

    restoreSnapshot(snapshot) {
        this.state = snapshot.state;
        this.currentStageIndex = snapshot.currentStageIndex;
        this.completedStages = new Set(snapshot.completedStages);
        this.stageStartTime = snapshot.stageStartTime;
        this.stableTime = snapshot.stableTime;
    }
}

export default GameState;
