/**
 * Game - Main game loop and orchestration
 */
class Game {
  constructor() {
    this.gameState = new GameState();
    this.physicsEngine = new PhysicsEngine();
    this.renderer = new Renderer('canvas');
    this.input = new Input(this.renderer.canvas, this.gameState, this.physicsEngine);

    // Timing
    this.lastFrameTime = Date.now();
    this.frameCount = 0;

    // UI elements
    this.scoreLabel = document.getElementById('score');
    this.stageLabel = document.getElementById('stageLabel');
    this.movesLabel = document.getElementById('movesLabel');
    this.pauseButton = document.getElementById('pauseButton');
    this.menuScreen = document.getElementById('menuScreen');
    this.overlay = document.getElementById('overlay');
    this.overlayTitle = document.getElementById('overlayTitle');
    this.overlayMessage = document.getElementById('overlayMessage');
    this.overlayBtn1 = document.getElementById('overlayBtn1');
    this.overlayBtn2 = document.getElementById('overlayBtn2');
    this.playButton = document.getElementById('playButton');

    // Bind events
    this.pauseButton.addEventListener('click', () => this.togglePause());
    this.playButton.addEventListener('click', () => this.startGame());
    this.overlayBtn1.addEventListener('click', () => this.onOverlayBtn1());
    this.overlayBtn2.addEventListener('click', () => this.onOverlayBtn2());

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());

    // Start game loop
    this.gameLoop();
  }

  /**
   * Start game from menu
   */
  startGame() {
    this.gameState.transitionToPlaying(0);
    this.menuScreen.classList.add('hidden');
    this.pauseButton.disabled = false;
    this.loadStage(0);
  }

  /**
   * Load a stage
   */
  loadStage(stageIndex) {
    if (stageIndex >= STAGES.length) {
      // Game complete
      this.showGameComplete();
      return;
    }

    // Clear previous stage
    this.physicsEngine.clear();

    const stage = STAGES[stageIndex];
    this.gameState.transitionToPlaying(stageIndex);
    this.gameState.maxMoves = stage.maxMoves;
    this.gameState.movesUsed = 0;

    // Create physics bodies
    // Ground/walls
    this.physicsEngine.createPlatform(500, 600, 1000, 40); // Ground
    this.physicsEngine.createPlatform(-50, 300, 50, 600); // Left wall
    this.physicsEngine.createPlatform(1050, 300, 50, 600); // Right wall

    // Create pig bodies
    this.gameState.bodies.pigs = [];
    for (let pig of stage.pigs) {
      const pigBody = this.physicsEngine.createPig(pig.x, pig.y);
      this.gameState.bodies.pigs.push(pigBody);
    }

    // Create block bodies
    this.gameState.bodies.blocks = [];
    for (let block of stage.blocks) {
      const blockBody = this.physicsEngine.createBlock(block.x, block.y, block.w, block.h, block.material);
      this.gameState.bodies.blocks.push(blockBody);
    }

    // Create first bird
    const bird = this.physicsEngine.createBird(stage.bird.x, stage.bird.y, stage.bird.type);
    this.gameState.bodies.bird = bird;
    this.gameState.currentBirdActive = false;
    this.gameState.birdRestTime = 0;

    // Update input
    this.input.updateSlingshotPosition(stage);

    // Update UI
    this.updateUI();
  }

  /**
   * Toggle pause state
   */
  togglePause() {
    if (this.gameState.phase === 'playing') {
      this.gameState.transitionToPaused();
      this.showPauseDialog();
    }
  }

  /**
   * Show pause dialog
   */
  showPauseDialog() {
    this.overlayTitle.textContent = 'Game Paused';
    this.overlayMessage.textContent = '';
    this.overlayBtn1.textContent = 'Resume';
    this.overlayBtn2.textContent = 'Main Menu';
    this.overlay.classList.add('active');
  }

  /**
   * Show level complete dialog
   */
  showLevelCompleteDialog() {
    const levelScore = this.gameState.calculateLevelScore();
    this.gameState.addScore(levelScore);

    this.overlayTitle.textContent = `Stage ${this.gameState.currentStage + 1} Clear!`;
    this.overlayMessage.textContent = `Score: ${levelScore}`;
    this.overlayBtn1.textContent = 'Next Stage';
    this.overlayBtn2.textContent = 'Main Menu';
    this.overlay.classList.add('active');
  }

  /**
   * Show game over dialog
   */
  showGameOverDialog() {
    this.overlayTitle.textContent = 'Game Over';
    this.overlayMessage.textContent = `Final Score: ${this.gameState.score}`;
    this.overlayBtn1.textContent = 'Restart Stage';
    this.overlayBtn2.textContent = 'Main Menu';
    this.overlay.classList.add('active');
  }

  /**
   * Show game complete dialog
   */
  showGameComplete() {
    this.overlayTitle.textContent = 'All Stages Cleared!';
    this.overlayMessage.textContent = `Final Score: ${this.gameState.score}`;
    this.overlayBtn1.textContent = 'Play Again';
    this.overlayBtn2.textContent = 'Main Menu';
    this.overlay.classList.add('active');
  }

  /**
   * Overlay button 1 click
   */
  onOverlayBtn1() {
    this.overlay.classList.remove('active');

    if (this.gameState.phase === 'paused') {
      this.gameState.transitionToResume();
    } else if (this.gameState.phase === 'levelComplete') {
      this.loadStage(this.gameState.currentStage + 1);
    } else if (this.gameState.phase === 'gameOver') {
      this.loadStage(this.gameState.currentStage);
    }
  }

  /**
   * Overlay button 2 click (Main menu)
   */
  onOverlayBtn2() {
    this.overlay.classList.remove('active');
    this.gameState.transitionToMenu();
    this.menuScreen.classList.remove('hidden');
    this.pauseButton.disabled = true;
  }

  /**
   * Update UI labels
   */
  updateUI() {
    this.scoreLabel.textContent = `Score: ${this.gameState.score}`;
    this.stageLabel.textContent = `Stage ${this.gameState.currentStage + 1}/10`;
    this.movesLabel.textContent = `Moves: ${this.gameState.movesUsed}/${this.gameState.maxMoves}`;
  }

  /**
   * Handle window resize
   */
  onWindowResize() {
    if (window.innerWidth < 1000) {
      this.renderer.canvas.width = window.innerWidth;
      this.renderer.width = window.innerWidth;
    }
  }

  /**
   * Main game loop
   */
  gameLoop() {
    requestAnimationFrame(() => this.gameLoop());

    const now = Date.now();
    const deltaTime = Math.min(now - this.lastFrameTime, 50); // Cap at 50ms
    this.lastFrameTime = now;

    // Update game logic
    if (this.gameState.phase === 'playing') {
      this.update(deltaTime);
      this.checkCollisions();
      this.checkWinCondition();
      this.checkLossCondition();
    }

    // Render
    this.renderer.render(this.gameState, this.physicsEngine);

    // Update UI
    this.updateUI();

    this.frameCount++;
  }

  /**
   * Update physics and game state
   */
  update(deltaTime) {
    this.physicsEngine.step(deltaTime);

    // Check if bird has stopped
    if (this.gameState.currentBirdActive) {
      const bird = this.gameState.bodies.bird;
      const vel = this.physicsEngine.getVelocityMagnitude(bird);

      if (vel < 0.5) {
        this.gameState.birdRestTime += deltaTime;

        if (this.gameState.birdRestTime > 2000) { // 2 seconds
          this.gameState.deactivateBird();
          this.gameState.birdRestTime = 0;

          // Spawn new bird for next shot if available
          if (this.gameState.movesUsed < this.gameState.maxMoves) {
            const stage = STAGES[this.gameState.currentStage];
            const newBird = this.physicsEngine.createBird(stage.bird.x, stage.bird.y, stage.bird.type);
            this.gameState.bodies.bird = newBird;
          }
        }
      } else {
        this.gameState.birdRestTime = 0;
      }
    }

    // Remove off-screen bodies
    this.removeOffscreenBodies();
  }

  /**
   * Remove bodies that left the screen
   */
  removeOffscreenBodies() {
    const birds = this.physicsEngine.getBodiesByType('bird');
    for (let bird of birds) {
      if (bird.position.y > 650 || bird.position.x < -100 || bird.position.x > 1100) {
        this.physicsEngine.destroyBody(bird);
      }
    }
  }

  /**
   * Check collisions and apply damage
   */
  checkCollisions() {
    const collisions = this.physicsEngine.collisions;

    for (let collision of collisions) {
      const { bodyA, bodyB, metaA, metaB } = collision;

      // Bird collides with pig
      if ((metaA.type === 'bird' && metaB.type === 'pig') ||
          (metaA.type === 'pig' && metaB.type === 'bird')) {
        const pigBody = metaA.type === 'pig' ? bodyA : bodyB;
        const pigMeta = metaA.type === 'pig' ? metaA : metaB;
        const damageSource = metaA.type === 'bird' ? bodyA : bodyB;

        const damage = Math.max(10, this.physicsEngine.getVelocityMagnitude(damageSource) * 5);
        pigMeta.hp -= damage;

        if (pigMeta.hp <= 0) {
          this.physicsEngine.destroyBody(pigBody);
          this.gameState.bodies.pigs = this.gameState.bodies.pigs.filter(p => p !== pigBody);
          this.gameState.stagePigsKilled++;
        }
      }

      // Collision with blocks
      if ((metaA.type === 'bird' && metaB.type === 'block') ||
          (metaA.type === 'block' && metaB.type === 'bird')) {
        const blockBody = metaA.type === 'block' ? bodyA : bodyB;
        const blockMeta = metaA.type === 'block' ? metaA : metaB;
        const damageSource = metaA.type === 'bird' ? bodyA : bodyB;

        const damage = Math.max(5, this.physicsEngine.getVelocityMagnitude(damageSource) * 3);
        blockMeta.hp -= damage;

        if (blockMeta.hp <= 0) {
          this.physicsEngine.destroyBody(blockBody);
          this.gameState.bodies.blocks = this.gameState.bodies.blocks.filter(b => b !== blockBody);
        }
      }

      // Block hits pig
      if ((metaA.type === 'block' && metaB.type === 'pig') ||
          (metaA.type === 'pig' && metaB.type === 'block')) {
        const pigBody = metaA.type === 'pig' ? bodyA : bodyB;
        const pigMeta = metaA.type === 'pig' ? metaA : metaB;
        const blockBody = metaA.type === 'block' ? bodyA : bodyB;

        const damage = Math.max(5, this.physicsEngine.getVelocityMagnitude(blockBody) * 2);
        pigMeta.hp -= damage;

        if (pigMeta.hp <= 0) {
          this.physicsEngine.destroyBody(pigBody);
          this.gameState.bodies.pigs = this.gameState.bodies.pigs.filter(p => p !== pigBody);
          this.gameState.stagePigsKilled++;
        }
      }
    }
  }

  /**
   * Check if player won the stage
   */
  checkWinCondition() {
    if (this.gameState.bodies.pigs.length === 0 && !this.gameState.currentBirdActive) {
      this.gameState.transitionToLevelComplete();
      this.showLevelCompleteDialog();
    }
  }

  /**
   * Check if player lost
   */
  checkLossCondition() {
    if (this.gameState.checkLossCondition()) {
      this.gameState.transitionToGameOver();
      this.showGameOverDialog();
    }
  }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
});
