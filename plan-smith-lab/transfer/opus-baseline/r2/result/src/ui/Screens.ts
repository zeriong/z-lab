import { Storage } from '../core/Storage';

export class Screens {
  private currentScreen: string = 'mainMenu';

  onStartGame: (() => void) | null = null;
  onSelectLevel: ((levelId: number) => void) | null = null;
  onPause: (() => void) | null = null;
  onContinue: (() => void) | null = null;
  onRetry: (() => void) | null = null;
  onNextLevel: (() => void) | null = null;
  onMainMenu: (() => void) | null = null;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Main menu buttons
    const startBtn = document.getElementById('startBtn');
    const selectLevelBtn = document.getElementById('selectLevelBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const backBtn = document.getElementById('backBtn');

    startBtn?.addEventListener('click', () => {
      this.onStartGame?.();
    });

    selectLevelBtn?.addEventListener('click', () => {
      this.showLevelSelect();
    });

    settingsBtn?.addEventListener('click', () => {
      // TODO: Settings screen
    });

    backBtn?.addEventListener('click', () => {
      this.showMainMenu();
    });

    // Pause overlay buttons
    const pauseBtn = document.getElementById('pauseBtn');
    const continueBtn = document.getElementById('continueBtn');
    const retryBtn = document.getElementById('retryBtn');
    const menuBtn = document.getElementById('menuBtn');

    pauseBtn?.addEventListener('click', () => {
      this.onPause?.();
    });

    continueBtn?.addEventListener('click', () => {
      this.onContinue?.();
      this.hidePauseOverlay();
    });

    retryBtn?.addEventListener('click', () => {
      this.onRetry?.();
      this.hidePauseOverlay();
    });

    menuBtn?.addEventListener('click', () => {
      this.onMainMenu?.();
      this.hidePauseOverlay();
    });

    // Result screen buttons
    const nextLevelBtn = document.getElementById('nextLevelBtn');
    const resultRetryBtn = document.getElementById('resultRetryBtn');
    const resultMenuBtn = document.getElementById('resultMenuBtn');

    nextLevelBtn?.addEventListener('click', () => {
      this.onNextLevel?.();
    });

    resultRetryBtn?.addEventListener('click', () => {
      this.onRetry?.();
    });

    resultMenuBtn?.addEventListener('click', () => {
      this.onMainMenu?.();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (this.currentScreen === 'playing') {
          this.onPause?.();
        } else if (this.currentScreen === 'paused') {
          this.onContinue?.();
          this.hidePauseOverlay();
        }
      }
    });
  }

  showMainMenu(): void {
    this.hideAll();
    document.getElementById('mainMenuScreen')?.classList.add('active');
    this.currentScreen = 'mainMenu';
  }

  showLevelSelect(): void {
    this.hideAll();
    const screen = document.getElementById('levelSelectScreen');
    screen?.classList.add('active');
    this.currentScreen = 'levelSelect';

    // Populate level grid
    this.populateLevelGrid();
  }

  private populateLevelGrid(): void {
    const grid = document.getElementById('levelGrid');
    if (!grid) return;

    grid.innerHTML = '';

    for (let i = 1; i <= 10; i++) {
      const isUnlocked = Storage.isLevelUnlocked(i);
      const progress = Storage.getLevelProgress(i);

      const card = document.createElement('div');
      card.className = `level-card ${!isUnlocked ? 'locked' : ''}`;

      if (isUnlocked) {
        card.addEventListener('click', () => {
          this.onSelectLevel?.(i);
        });
      }

      let starsHtml = '';
      for (let j = 0; j < progress.stars; j++) {
        starsHtml += '★';
      }

      card.innerHTML = `
        <div class="level-number">${i}</div>
        ${isUnlocked ? `
          <div class="level-stars">${starsHtml || '☆☆☆'}</div>
          <div class="level-score">${progress.highScore}</div>
        ` : `
          <div class="level-lock">🔒</div>
        `}
      `;

      grid.appendChild(card);
    }
  }

  showPauseOverlay(): void {
    const overlay = document.getElementById('pauseOverlay');
    overlay?.classList.add('active');
    this.currentScreen = 'paused';
  }

  hidePauseOverlay(): void {
    const overlay = document.getElementById('pauseOverlay');
    overlay?.classList.remove('active');
    this.currentScreen = 'playing';
  }

  showResultScreen(isCleared: boolean, score: number): void {
    this.hideAll();
    const screen = document.getElementById('resultScreen');
    const title = document.getElementById('resultTitle');
    const stars = document.getElementById('resultStars');
    const scoreDisplay = document.getElementById('resultScore');

    if (!screen || !title || !stars || !scoreDisplay) return;

    screen.classList.add('active');

    if (isCleared) {
      title.textContent = 'LEVEL CLEAR!';
      title.style.color = '#00DD00';

      // Calculate and display stars
      let starsHtml = '';
      const progress = Storage.getLevelProgress(1); // Get actual level from game
      for (let i = 0; i < progress.stars; i++) {
        starsHtml += '⭐';
      }
      stars.innerHTML = starsHtml || '☆☆☆';
    } else {
      title.textContent = 'LEVEL FAILED';
      title.style.color = '#FF0000';
      stars.innerHTML = '';
    }

    scoreDisplay.textContent = `Score: ${score}`;
    this.currentScreen = 'result';
  }

  hideAll(): void {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.remove('active'));
    this.hidePauseOverlay();
  }

  updateHUD(score: number, birdsRemaining: number): void {
    const scoreValue = document.getElementById('scoreValue');
    const birdsRemaining_ = document.getElementById('birdsRemaining');

    if (scoreValue) {
      scoreValue.textContent = score.toString();
    }

    if (birdsRemaining_) {
      let birdsHtml = '';
      for (let i = 0; i < birdsRemaining; i++) {
        birdsHtml += '🐦 ';
      }
      birdsRemaining_.innerHTML = birdsHtml || 'No birds left';
    }
  }
}
