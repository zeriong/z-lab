export class GameState {
    constructor(totalStages = 10) {
        this.currentStage = 1;
        this.totalStages = totalStages;
        this.gamePhase = 'menu'; // menu, playing, paused, levelComplete, gameOver
        this.score = 0;
        this.movesUsed = 0;
        this.maxMoves = 3;

        // Slingshot state
        this.isAiming = false;
        this.dragStart = null;
        this.dragCurrent = null;
        this.trajectoryPoints = [];

        // Game objects (references to Matter bodies)
        this.bodies = {
            bird: null,
            pigs: [],
            blocks: [],
            ground: null,
            walls: []
        };

        // Tracking
        this.birdsLeft = 3;
        this.pigsDestroyedInRound = 0;
        this.blocksDestroyedInRound = 0;
        this.birdInFlight = false;
        this.birdAtRestTime = 0;
        this.birdAtRestThreshold = 2000; // 2 seconds in milliseconds
    }

    reset(maxMoves = 3) {
        this.movesUsed = 0;
        this.maxMoves = maxMoves;
        this.isAiming = false;
        this.dragStart = null;
        this.dragCurrent = null;
        this.trajectoryPoints = [];
        this.pigsDestroyedInRound = 0;
        this.blocksDestroyedInRound = 0;
        this.birdInFlight = false;
        this.birdAtRestTime = 0;
    }

    setPhase(phase) {
        this.gamePhase = phase;
    }

    setStage(stage) {
        this.currentStage = stage;
    }

    addScore(points) {
        this.score += points;
    }

    startAim(x, y) {
        this.isAiming = true;
        this.dragStart = { x, y };
        this.dragCurrent = { x, y };
    }

    updateAim(x, y) {
        if (!this.isAiming) return;
        this.dragCurrent = { x, y };
    }

    endAim() {
        this.isAiming = false;
        if (this.dragStart) {
            this.movesUsed++;
            this.birdInFlight = true;
            this.birdAtRestTime = 0;
        }
    }

    calculateLaunchVelocity(dragStartX, dragStartY, dragEndX, dragEndY) {
        const dx = dragStartX - dragEndX;
        const dy = dragStartY - dragEndY;
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        const velocityScalar = 0.01; // Tuning parameter
        return {
            x: dx * velocityScalar,
            y: dy * velocityScalar
        };
    }

    updateBirdState(velocity, isAtRest, dt) {
        if (this.birdInFlight && isAtRest) {
            this.birdAtRestTime += dt;
            if (this.birdAtRestTime > this.birdAtRestThreshold) {
                this.birdInFlight = false;
                this.dragStart = null;
                this.dragCurrent = null;
                this.trajectoryPoints = [];
            }
        } else if (!isAtRest) {
            this.birdAtRestTime = 0;
        }
    }

    canWinLevel() {
        return this.bodies.pigs.length === 0 && !this.birdInFlight;
    }

    canLoseLevel() {
        return this.movesUsed >= this.maxMoves && this.bodies.pigs.length > 0 && !this.birdInFlight;
    }

    isLastStage() {
        return this.currentStage >= this.totalStages;
    }

    nextStage() {
        this.currentStage++;
        if (this.currentStage > this.totalStages) {
            this.currentStage = this.totalStages;
        }
    }

    goToMenu() {
        this.gamePhase = 'menu';
        this.currentStage = 1;
        this.score = 0;
        this.reset();
    }
}
