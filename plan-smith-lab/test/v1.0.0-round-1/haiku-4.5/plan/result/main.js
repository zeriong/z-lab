// Game state
const gameState = {
  score: 0,
  currentStage: 1,
  pigsOnStart: 0,
  reset() {
    this.score = 0;
  },
  addScore(points) {
    this.score += points;
  }
};

// Game loop
class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.lastPigCount = 0;
    this.stateChangeTimer = null;
    this.resultShowTimer = null;
    this.checkClearTimer = null;

    this.init();
  }

  async init() {
    // Initialize physics engine
    physicsEngine = new PhysicsEngine(this.canvas.width, this.canvas.height);

    // Initialize renderer
    renderer = new GameRenderer(this.canvas);

    // Initialize slingshot
    slingshot = new Slingshot(100, 500, this.canvas);

    // Load stages
    await stageManager.loadStages();

    // Setup state change listener
    stateManager.addListener((oldState, newState) => {
      this.onStateChange(oldState, newState);
    });

    // Show menu
    stateManager.setState(GameState.MENU);
    uiManager.showMenuOverlay();

    // Start game loop
    this.gameLoop();
  }

  onStateChange(oldState, newState) {
    gameState.currentStage = stageManager.getCurrentStageIndex() + 1;

    if (newState === GameState.FLYING) {
      // Clear check timer
      if (this.checkClearTimer) {
        clearTimeout(this.checkClearTimer);
      }
      // Check for clear/fail condition
      this.checkClearTimer = setTimeout(() => {
        this.checkGameStatus();
      }, 2000);
    }
  }

  checkGameStatus() {
    const alivePigs = physicsEngine.getAlivePigs();
    const aliveBirds = physicsEngine.getAliveBirds();
    const birds = physicsEngine.bodies.birds;

    // Check if all pigs are dead
    if (alivePigs === 0 && birds.length === 0) {
      this.stageClear();
    }
    // Check if all birds are used and pigs still alive
    else if (aliveBirds === 0 && birds.length === 0 && alivePigs > 0) {
      this.stageFail();
    }
  }

  stageClear() {
    const remainingBirds = stageManager.getCurrentStage().birds.length - physicsEngine.birdsLaunched;
    const clearBonus = remainingBirds * 10;
    gameState.addScore(50 + clearBonus);

    if (this.resultShowTimer) clearTimeout(this.resultShowTimer);
    this.resultShowTimer = setTimeout(() => {
      stateManager.setState(GameState.RESULT);
      uiManager.showResultOverlay(true);
    }, 1000);
  }

  stageFail() {
    if (this.resultShowTimer) clearTimeout(this.resultShowTimer);
    this.resultShowTimer = setTimeout(() => {
      stateManager.setState(GameState.RESULT);
      uiManager.showResultOverlay(false);
    }, 1000);
  }

  launchNextBird() {
    const stageData = stageManager.getCurrentStage();
    if (stageData && stageData.birds.length > physicsEngine.birdsLaunched) {
      const bird = physicsEngine.addBird(100, 500, 8);
      slingshot.setBird(bird);
      stateManager.setState(GameState.AIMING);
    } else if (physicsEngine.getAlivePigs() > 0) {
      this.stageFail();
    }
  }

  gameLoop() {
    const state = stateManager.getState();

    if (state !== GameState.MENU && state !== GameState.PAUSED && state !== GameState.RESULT) {
      // Update physics
      physicsEngine.update();

      // Check if bird has stopped moving
      if (state === GameState.FLYING) {
        const birds = physicsEngine.bodies.birds;
        if (birds.length > 0) {
          const bird = birds[0];
          const speed = Math.sqrt(bird.velocity.x ** 2 + bird.velocity.y ** 2);

          if (speed < 1 && bird.position.y < this.canvas.height - 50) {
            // Bird has settled or is slow
            physicsEngine.bodies.birds = [];
            this.launchNextBird();
          }
        }
      }
    }

    // Render
    renderer.render();

    requestAnimationFrame(() => this.gameLoop());
  }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new Game();
});
