class Game {
  constructor() {
    this.state = new GameState();
    this.physics = new PhysicsEngine();
    this.renderer = new Renderer('gameCanvas');
    this.input = new Input('gameCanvas', this.state, this.physics);
    this.currentStageData = null;
    this.levelCompleteTime = null;
    this.lastFrameTime = Date.now();
    this.gameRunning = false;

    window.gameInstance = this;
  }

  startGame() {
    this.state.reset();
    this.state.setPhase('playing');
    this.state.setCurrentStage(0);
    this.state.score = 0;
    this.loadStage(0);
    this.renderer.hideAllModals();
    this.gameRunning = true;
    this.loop();
  }

  loadStage(stageIndex) {
    if (stageIndex >= STAGES.length) {
      this.endGame();
      return;
    }

    this.physics.clearWorld();
    this.state.reset();
    this.state.setCurrentStage(stageIndex);

    const stageData = STAGES[stageIndex];
    this.currentStageData = stageData;

    // Create ground
    this.physics.createStaticGround(512, 560, 1024, 40);

    // Set slingshot position
    this.input.setSlingshot(stageData.slingshot.x, stageData.slingshot.y);

    // Create bird
    const bird = this.physics.createBird(
      stageData.bird.x,
      stageData.bird.y,
      stageData.bird.type
    );
    this.state.bodies.bird = bird;

    // Create pigs
    for (const pigData of stageData.pigs) {
      const pig = this.physics.createPig(pigData.x, pigData.y);
      this.state.bodies.pigs.push(pig);
    }

    // Create blocks
    for (const blockData of stageData.blocks) {
      const block = this.physics.createBlock(
        blockData.x,
        blockData.y,
        blockData.w,
        blockData.h,
        blockData.material
      );
      this.state.bodies.blocks.push(block);
    }

    this.renderer.updateUI(this.state, stageData.maxMoves);
  }

  loop() {
    if (!this.gameRunning) return;

    const now = Date.now();
    const deltaTime = Math.min(16, now - this.lastFrameTime);
    this.lastFrameTime = now;

    if (this.state.gamePhase === 'playing') {
      this.handlePlayingPhase(deltaTime);
    }

    this.renderer.draw(this.state, this.physics);
    requestAnimationFrame(() => this.loop());
  }

  handlePlayingPhase(deltaTime) {
    this.physics.step(deltaTime / 1000);

    this.state.updateBirdStableTime();

    if (this.state.birdActive) {
      this.checkCollisions();
      this.checkBirdOutOfBounds();

      if (this.state.checkIfBirdStable()) {
        this.state.birdActive = false;
      }
    }

    this.checkWinCondition();
    this.checkFailCondition();
  }

  checkCollisions() {
    const bird = this.state.bodies.bird;
    if (!bird) return;

    const collisions = this.physics.checkCollisions(bird);

    for (const collision of collisions) {
      const body = collision.body;
      const damage = collision.force * 5;

      if (body.label === 'pig') {
        if (this.physics.applyDamage(body, damage)) {
          this.renderer.updateUI(this.state, this.currentStageData.maxMoves);
        }
      } else if (body.label === 'block') {
        if (this.physics.applyDamage(body, damage)) {
          this.renderer.updateUI(this.state, this.currentStageData.maxMoves);
        }
      }
    }
  }

  checkBirdOutOfBounds() {
    const bird = this.state.bodies.bird;
    if (!bird) return;

    if (bird.position.y > 700 || bird.position.x > 1100 || bird.position.x < -50) {
      this.state.birdActive = false;
    }
  }

  checkWinCondition() {
    if (!this.state.bodies.pigs || this.state.bodies.pigs.length === 0) return;

    const allPigsDefeated = this.state.bodies.pigs.every(pig => pig.hp <= 0);

    if (allPigsDefeated && !this.state.birdActive) {
      this.state.setPhase('levelComplete');
      this.calculateLevelScore();
      this.renderer.showLevelComplete(
        this.currentStageData.name,
        this.state.score
      );
      this.gameRunning = false;
    }
  }

  checkFailCondition() {
    if (this.state.movesUsed >= this.currentStageData.maxMoves && !this.state.birdActive) {
      const allPigsDefeated = this.state.bodies.pigs.every(pig => pig.hp <= 0);

      if (!allPigsDefeated) {
        this.state.setPhase('gameOver');
        this.renderer.showGameOver(`You failed Stage ${this.state.currentStage + 1}. Try again!`);
        this.gameRunning = false;
      }
    }
  }

  calculateLevelScore() {
    let stageScore = 0;

    // Points for defeating pigs
    const defeatedPigs = this.state.bodies.pigs.filter(pig => pig.hp <= 0).length;
    stageScore += defeatedPigs * 1000;

    // Penalty for remaining blocks
    const remainingBlocks = this.state.bodies.blocks.filter(block => block.hp > 0).length;
    stageScore -= remainingBlocks * 10;

    // Bonus for remaining moves
    const remainingMoves = this.currentStageData.maxMoves - this.state.movesUsed;
    stageScore += Math.max(0, remainingMoves) * 500;

    this.state.addScore(stageScore);
  }

  nextLevel() {
    const nextStageIndex = this.state.currentStage + 1;

    if (nextStageIndex >= STAGES.length) {
      this.endGame();
    } else {
      this.state.score = this.state.score; // Keep score
      this.loadStage(nextStageIndex);
      this.state.setPhase('playing');
      this.renderer.hideAllModals();
      this.gameRunning = true;
      this.lastFrameTime = Date.now();
      this.loop();
    }
  }

  restartLevel() {
    this.loadStage(this.state.currentStage);
    this.state.setPhase('playing');
    this.renderer.hideAllModals();
    this.gameRunning = true;
    this.lastFrameTime = Date.now();
    this.loop();
  }

  resumeGame() {
    this.state.setPhase('playing');
    this.renderer.hideAllModals();
    this.gameRunning = true;
    this.lastFrameTime = Date.now();
    this.loop();
  }

  pauseGame() {
    this.state.setPhase('paused');
    this.gameRunning = false;
    this.renderer.showPause();
  }

  goToMenu() {
    this.gameRunning = false;
    this.state = new GameState();
    this.physics.clearWorld();
    this.renderer.showMenu();
  }

  endGame() {
    this.gameRunning = false;
    this.renderer.showGameOver(`Congratulations! You completed all 10 stages!\nFinal Score: ${this.state.score}`);
  }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
});
