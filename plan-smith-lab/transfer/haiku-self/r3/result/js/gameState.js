class GameState {
  constructor() {
    this.gamePhase = 'menu'; // menu | playing | paused | levelComplete | gameOver
    this.currentStage = 0;
    this.score = 0;
    this.movesUsed = 0;
    this.isAiming = false;
    this.dragStart = null;
    this.dragCurrent = null;
    this.trajectoryPoints = [];
    this.bodies = {
      bird: null,
      pigs: [],
      blocks: []
    };
    this.lastBirdStableTime = Date.now();
    this.birdActive = false;
    this.allPigsDefeated = false;
  }

  reset() {
    this.movesUsed = 0;
    this.isAiming = false;
    this.dragStart = null;
    this.dragCurrent = null;
    this.trajectoryPoints = [];
    this.bodies = {
      bird: null,
      pigs: [],
      blocks: []
    };
    this.lastBirdStableTime = Date.now();
    this.birdActive = false;
    this.allPigsDefeated = false;
  }

  setPhase(phase) {
    this.gamePhase = phase;
  }

  setCurrentStage(stageIndex) {
    this.currentStage = stageIndex;
  }

  addScore(points) {
    this.score += points;
  }

  incrementMoves() {
    this.movesUsed++;
  }

  setDragStart(x, y) {
    this.dragStart = { x, y };
  }

  setDragCurrent(x, y) {
    this.dragCurrent = { x, y };
  }

  clearDrag() {
    this.dragStart = null;
    this.dragCurrent = null;
    this.trajectoryPoints = [];
  }

  setTrajectoryPoints(points) {
    this.trajectoryPoints = points;
  }

  setBirdActive(active) {
    this.birdActive = active;
    if (active) {
      this.lastBirdStableTime = Date.now();
    }
  }

  checkIfBirdStable() {
    const now = Date.now();
    return (now - this.lastBirdStableTime) > 2000;
  }

  updateBirdStableTime() {
    if (this.birdActive && this.bodies.bird) {
      const speed = Math.sqrt(
        this.bodies.bird.velocity.x ** 2 +
        this.bodies.bird.velocity.y ** 2
      );
      if (speed < 1) {
        this.lastBirdStableTime = Date.now();
      }
    }
  }

  setAllPigsDefeated(defeated) {
    this.allPigsDefeated = defeated;
  }
}
