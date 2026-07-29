// UI management
class UIManager {
  constructor() {
    this.menuOverlay = document.getElementById('menuOverlay');
    this.pauseOverlay = document.getElementById('pauseOverlay');
    this.resultOverlay = document.getElementById('resultOverlay');
    this.pauseBtn = document.getElementById('pauseBtn');
    this.restartBtn = document.getElementById('restartBtn');
    this.pauseMenuBtn = document.getElementById('pauseMenuBtn');
    this.nextStageBtn = document.getElementById('nextStageBtn');
    this.resultMenuBtn = document.getElementById('resultMenuBtn');
    this.stagesGrid = document.getElementById('stagesGrid');
    this.resultTitle = document.getElementById('resultTitle');
    this.resultScore = document.getElementById('resultScore');

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.pauseBtn.addEventListener('click', () => {
      if (stateManager.isInGame()) {
        stateManager.setState(GameState.PAUSED);
        physicsEngine.pauseSimulation();
        this.showPauseOverlay();
      }
    });

    this.restartBtn.addEventListener('click', () => {
      this.hidePauseOverlay();
      this.restartStage();
    });

    this.pauseMenuBtn.addEventListener('click', () => {
      this.hidePauseOverlay();
      this.goToMenu();
    });

    this.nextStageBtn.addEventListener('click', () => {
      this.hideResultOverlay();
      this.nextStage();
    });

    this.resultMenuBtn.addEventListener('click', () => {
      this.hideResultOverlay();
      this.goToMenu();
    });
  }

  showMenuOverlay() {
    this.menuOverlay.style.display = 'flex';
    this.updateStagesGrid();
  }

  hideMenuOverlay() {
    this.menuOverlay.style.display = 'none';
  }

  showPauseOverlay() {
    this.pauseOverlay.style.display = 'block';
  }

  hidePauseOverlay() {
    this.pauseOverlay.style.display = 'none';
  }

  showResultOverlay(isCleared) {
    this.resultTitle.textContent = isCleared ? 'Stage Clear!' : 'Game Over!';
    this.resultScore.textContent = `Score: ${gameState.score}`;
    this.resultOverlay.style.display = 'block';

    if (!isCleared || !stageManager.hasNextStage()) {
      this.nextStageBtn.style.display = 'none';
    } else {
      this.nextStageBtn.style.display = 'block';
    }
  }

  hideResultOverlay() {
    this.resultOverlay.style.display = 'none';
  }

  updateStagesGrid() {
    this.stagesGrid.innerHTML = '';
    for (let i = 0; i < stageManager.getTotalStages(); i++) {
      const btn = document.createElement('button');
      btn.className = 'stage-btn';
      btn.textContent = i + 1;
      btn.addEventListener('click', () => {
        stageManager.setStage(i);
        this.startStage();
      });
      this.stagesGrid.appendChild(btn);
    }
  }

  startStage() {
    this.hideMenuOverlay();
    gameState.reset();
    const stageData = stageManager.getCurrentStage();
    stageManager.loadStageIntoWorld(stageData);
    stateManager.setState(GameState.AIMING);
  }

  restartStage() {
    physicsEngine.resumeSimulation();
    gameState.reset();
    const stageData = stageManager.getCurrentStage();
    stageManager.loadStageIntoWorld(stageData);
    stateManager.setState(GameState.AIMING);
  }

  nextStage() {
    if (stageManager.hasNextStage()) {
      stageManager.nextStage();
      this.startStage();
    } else {
      this.goToMenu();
    }
  }

  goToMenu() {
    physicsEngine.resumeSimulation();
    stateManager.setState(GameState.MENU);
    this.showMenuOverlay();
  }
}

const uiManager = new UIManager();
