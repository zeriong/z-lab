import type { ProgressStorage } from '../storage/progress';

export class OverlayLayer {
  private container: HTMLElement;
  private content: HTMLElement;

  constructor() {
    this.container = document.getElementById('overlayContainer')!;
    this.content = document.getElementById('overlayContent')!;
  }

  show(): void {
    this.container.classList.add('active');
  }

  hide(): void {
    this.container.classList.remove('active');
    this.content.innerHTML = '';
  }

  showMenu(onStart: () => void): void {
    this.show();
    this.content.innerHTML = `
      <div class="menu-screen">
        <h1>Angry Birds</h1>
        <p>A Physics-Based Puzzle Game</p>
        <button>Start Game</button>
      </div>
    `;
    this.content.querySelector('button')?.addEventListener('click', onStart);
  }

  showStageSelect(onSelect: (stage: number) => void, onBack: () => void, progress: ProgressStorage): void {
    this.show();
    const totalStars = progress.getTotalStars();
    const maxStars = 30; // 10 stages * 3 stars

    this.content.innerHTML = `
      <div class="stage-select">
        <h1>Select Stage</h1>
        <div class="progress-bar">★ ${totalStars} / ${maxStars}</div>
        <div class="stage-grid" id="stageGrid"></div>
        <button id="backBtn">Back</button>
      </div>
    `;

    const grid = document.getElementById('stageGrid')!;
    for (let i = 1; i <= 10; i++) {
      const isUnlocked = progress.isStageUnlocked(i);
      const stars = progress.getStars(i);
      const tile = document.createElement('div');
      tile.className = isUnlocked ? 'stage-tile unlocked' : 'stage-tile locked';
      tile.innerHTML = `
        <div>${i}</div>
        <div class="stars">${'★'.repeat(stars)}</div>
      `;
      if (isUnlocked) {
        tile.addEventListener('click', () => onSelect(i));
      }
      grid.appendChild(tile);
    }

    document.getElementById('backBtn')?.addEventListener('click', onBack);
  }

  showPause(onResume: () => void, onRetry: () => void, onMenu: () => void): void {
    this.show();
    this.content.innerHTML = `
      <div class="pause-screen">
        <h1>Paused</h1>
        <button id="resumeBtn">Resume</button>
        <button id="retryBtn">Retry</button>
        <button id="menuBtn">Menu</button>
      </div>
    `;
    document.getElementById('resumeBtn')?.addEventListener('click', onResume);
    document.getElementById('retryBtn')?.addEventListener('click', onRetry);
    document.getElementById('menuBtn')?.addEventListener('click', onMenu);
  }

  showClear(score: number, stars: number, onNext: () => void, onRetry: () => void, onMenu: () => void): void {
    this.show();
    const starsDisplay = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    this.content.innerHTML = `
      <div class="clear-screen">
        <h1>Stage Clear!</h1>
        <p>Score: ${score}</p>
        <p>${starsDisplay}</p>
        <button id="nextBtn">Next Stage</button>
        <button id="retryBtn">Retry</button>
        <button id="menuBtn">Menu</button>
      </div>
    `;
    document.getElementById('nextBtn')?.addEventListener('click', onNext);
    document.getElementById('retryBtn')?.addEventListener('click', onRetry);
    document.getElementById('menuBtn')?.addEventListener('click', onMenu);
  }

  showFail(onRetry: () => void, onMenu: () => void): void {
    this.show();
    this.content.innerHTML = `
      <div class="fail-screen">
        <h1>Out of Birds</h1>
        <p>Try Again</p>
        <button id="retryBtn">Retry</button>
        <button id="menuBtn">Menu</button>
      </div>
    `;
    document.getElementById('retryBtn')?.addEventListener('click', onRetry);
    document.getElementById('menuBtn')?.addEventListener('click', onMenu);
  }
}
