import { Storage, LevelProgress } from '../core/Storage';
import { LEVEL_CONFIGS } from '../data/levels';

export interface ScreenCallbacks {
  onPlayLevel: (levelId: number) => void;
  onContinue: () => void;
  onRetry: () => void;
  onMainMenu: () => void;
  onNextLevel: () => void;
  onToggleSound: () => void;
}

export class Screens {
  private container: HTMLDivElement;
  private storage: Storage;
  private callbacks: ScreenCallbacks;

  constructor(container: HTMLDivElement, callbacks: ScreenCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.storage = new Storage();
  }

  showMainMenu() {
    this.hideAllScreens();

    const html = `
      <div class="screen main-menu-screen active">
        <div class="menu-screen">
          <h1 class="menu-title">Angry Birds</h1>
          <div class="menu-buttons">
            <button class="btn" id="btn-start">게임 시작</button>
            <button class="btn" id="btn-levels">스테이지 선택</button>
            <button class="btn" id="btn-settings">설정</button>
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;

    document.getElementById('btn-start')?.addEventListener('click', () => {
      const lastLevel = this.storage.getLastPlayedLevel();
      this.callbacks.onPlayLevel(lastLevel);
    });

    document.getElementById('btn-levels')?.addEventListener('click', () => {
      this.showLevelSelect();
    });

    document.getElementById('btn-settings')?.addEventListener('click', () => {
      alert('설정: 사운드 온/오프');
      this.callbacks.onToggleSound();
    });
  }

  private showLevelSelect() {
    this.hideAllScreens();

    let levelCardsHtml = '';
    const unlockedLevel = this.storage.getUnlockedLevel();

    LEVEL_CONFIGS.forEach((_, idx) => {
      const levelId = idx + 1;
      const progress = this.storage.getLevelProgress(levelId);
      const isLocked = levelId > unlockedLevel;

      const stars = '★'.repeat(progress.stars) + '☆'.repeat(3 - progress.stars);

      levelCardsHtml += `
        <div class="level-card ${isLocked ? 'locked' : ''}" data-level="${levelId}">
          <div class="level-number">${levelId}</div>
          <div class="level-stars">${stars}</div>
          <div style="font-size: 0.7rem; color: #999;">${progress.score}</div>
        </div>
      `;
    });

    const html = `
      <div class="screen level-select-screen active">
        <h2 style="color: #fff; margin-bottom: 1.5rem;">스테이지 선택</h2>
        <div class="level-grid">
          ${levelCardsHtml}
        </div>
        <button class="btn" id="btn-back" style="margin-top: 2rem;">← 돌아가기</button>
      </div>
    `;

    this.container.innerHTML = html;

    // Add event listeners to level cards
    document.querySelectorAll('.level-card:not(.locked)').forEach((card) => {
      card.addEventListener('click', (e) => {
        const levelId = parseInt((e.currentTarget as HTMLElement).getAttribute('data-level') || '1', 10);
        this.callbacks.onPlayLevel(levelId);
      });
    });

    document.getElementById('btn-back')?.addEventListener('click', () => {
      this.showMainMenu();
    });
  }

  showPauseOverlay() {
    const html = `
      <div class="pause-overlay active" id="pauseOverlay">
        <div class="pause-panel">
          <h2 class="pause-title">일시정지됨</h2>
          <div class="pause-buttons">
            <button class="btn" id="btn-continue">계속하기</button>
            <button class="btn" id="btn-retry">다시하기</button>
            <button class="btn" id="btn-menu">메인으로</button>
          </div>
        </div>
      </div>
    `;

    this.container.insertAdjacentHTML('beforeend', html);

    document.getElementById('btn-continue')?.addEventListener('click', () => {
      this.callbacks.onContinue();
    });

    document.getElementById('btn-retry')?.addEventListener('click', () => {
      this.callbacks.onRetry();
    });

    document.getElementById('btn-menu')?.addEventListener('click', () => {
      this.callbacks.onMainMenu();
    });

    // Focus trap & keyboard handling
    const overlay = document.getElementById('pauseOverlay');
    if (overlay) {
      overlay.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          this.callbacks.onContinue();
        }
      });
      overlay.focus();
    }
  }

  hidePauseOverlay() {
    const overlay = document.getElementById('pauseOverlay');
    if (overlay) {
      overlay.remove();
    }
  }

  showResultScreen(cleared: boolean, progress: LevelProgress) {
    this.hideAllScreens();

    let starsHtml = '★'.repeat(progress.stars) + '☆'.repeat(3 - progress.stars);
    const title = cleared ? 'Stage Clear!' : 'Stage Failed';
    const titleColor = cleared ? '#ffc107' : '#ff5252';

    const html = `
      <div class="screen result-screen active">
        <h1 class="result-title" style="color: ${titleColor};">${title}</h1>
        ${
          cleared
            ? `
          <div class="result-stars">${starsHtml}</div>
          <div class="result-score">Score: ${progress.score}</div>
        `
            : ''
        }
        <div class="result-buttons">
          ${cleared ? '<button class="btn" id="btn-next">다음 스테이지</button>' : ''}
          <button class="btn" id="btn-retry-result">다시하기</button>
          <button class="btn" id="btn-menu-result">메인으로</button>
        </div>
      </div>
    `;

    this.container.innerHTML = html;

    if (cleared) {
      document.getElementById('btn-next')?.addEventListener('click', () => {
        this.callbacks.onNextLevel();
      });
    }

    document.getElementById('btn-retry-result')?.addEventListener('click', () => {
      this.callbacks.onRetry();
    });

    document.getElementById('btn-menu-result')?.addEventListener('click', () => {
      this.callbacks.onMainMenu();
    });
  }

  hideAllScreens() {
    this.container.innerHTML = '';
  }
}
