class GameState {
    constructor() {
        this.phase = 'menu'; // menu | playing | paused | levelComplete | gameOver
        this.currentStage = 0;
        this.score = 0;
        this.movesUsed = 0;

        // 슬링샷 상태
        this.isAiming = false;
        this.dragStart = null;
        this.dragCurrent = null;
        this.trajectoryPoints = [];

        // 게임 객체
        this.bodies = {
            bird: null,
            pigs: [],
            blocks: [],
            obstacles: []
        };

        // 게임 메타
        this.birdFired = false;
        this.birdSettleTime = 0;
        this.stageData = null;
    }

    setPhase(newPhase) {
        this.phase = newPhase;
    }

    addScore(points) {
        this.score += points;
    }

    usedMove() {
        this.movesUsed++;
    }

    getRemainingMoves() {
        if (!this.stageData) return 0;
        return this.stageData.maxMoves - this.movesUsed;
    }

    canShoot() {
        return this.getRemainingMoves() > 0 && this.birdFired === false;
    }

    resetStage() {
        this.movesUsed = 0;
        this.isAiming = false;
        this.dragStart = null;
        this.dragCurrent = null;
        this.trajectoryPoints = [];
        this.birdFired = false;
        this.birdSettleTime = 0;
        this.bodies = {
            bird: null,
            pigs: [],
            blocks: [],
            obstacles: []
        };
    }

    nextStage() {
        this.currentStage++;
        this.resetStage();
    }

    toMenu() {
        this.phase = 'menu';
        this.currentStage = 0;
        this.score = 0;
        this.resetStage();
    }

    getAllPigsDestroyed() {
        return this.bodies.pigs.length === 0;
    }

    isBirdSettled() {
        if (!this.bodies.bird || !this.birdFired) return false;
        // 새가 2초 이상 정지 상태면 settled
        return this.birdSettleTime > 2000; // 2초 (ms)
    }
}
