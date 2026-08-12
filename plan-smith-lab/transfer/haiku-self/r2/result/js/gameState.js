/**
 * GameState - FSM (Finite State Machine) for game flow
 * States: menu → playing → paused → levelComplete → gameOver → menu
 */
class GameState {
  constructor() {
    this.phase = 'menu'; // menu | playing | paused | levelComplete | gameOver
    this.currentStage = 0;
    this.score = 0;
    this.lives = 3;

    // Stage-specific
    this.maxMoves = 3;
    this.movesUsed = 0;
    this.stagePigsKilled = 0;

    // Slingshot state
    this.isAiming = false;
    this.dragStart = null;
    this.dragCurrent = null;
    this.trajectoryPoints = [];

    // Bird launch tracking
    this.currentBirdActive = false;
    this.birdRestTime = 0;

    // Game objects (bodies managed by physics engine)
    this.bodies = {
      bird: null,
      pigs: [],
      blocks: []
    };
  }

  // Transitions
  transitionToPlaying(stageIndex) {
    this.phase = 'playing';
    this.currentStage = stageIndex;
    this.movesUsed = 0;
    this.stagePigsKilled = 0;
    this.isAiming = false;
    this.dragStart = null;
    this.dragCurrent = null;
    this.trajectoryPoints = [];
    this.currentBirdActive = false;
    this.birdRestTime = 0;
  }

  transitionToPaused() {
    if (this.phase === 'playing') {
      this.phase = 'paused';
    }
  }

  transitionToResume() {
    if (this.phase === 'paused') {
      this.phase = 'playing';
    }
  }

  transitionToLevelComplete() {
    if (this.phase === 'playing') {
      this.phase = 'levelComplete';
    }
  }

  transitionToGameOver() {
    if (this.phase === 'playing') {
      this.phase = 'gameOver';
    }
  }

  transitionToMenu() {
    this.phase = 'menu';
    this.score = 0;
    this.lives = 3;
    this.bodies = { bird: null, pigs: [], blocks: [] };
  }

  // Score calculation
  calculateLevelScore() {
    const pigsKilledBonus = this.stagePigsKilled * 1000;
    const blocksLeftPenalty = this.bodies.blocks.length * 10;
    const movesBonus = Math.max(0, this.maxMoves - this.movesUsed) * 500;
    return pigsKilledBonus - blocksLeftPenalty + movesBonus;
  }

  addScore(points) {
    this.score += points;
  }

  // Win/Loss conditions
  checkWinCondition() {
    // All pigs eliminated
    return this.bodies.pigs.length === 0;
  }

  checkLossCondition() {
    // No birds left AND still have pigs
    return this.movesUsed >= this.maxMoves && this.bodies.pigs.length > 0;
  }

  // Bird management
  launchBird() {
    this.movesUsed++;
    this.currentBirdActive = true;
    this.birdRestTime = 0;
  }

  deactivateBird() {
    this.currentBirdActive = false;
  }
}
