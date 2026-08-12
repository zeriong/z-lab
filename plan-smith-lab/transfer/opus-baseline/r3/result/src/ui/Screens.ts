import { Storage } from '../core/Storage';
import { Level } from '../game/Level';
import { GameResult, LevelData } from '../core/types';

type ScreenEvent =
  | 'start-game'
  | 'level-select'
  | 'select-level'
  | 'resume'
  | 'restart'
  | 'menu'
  | 'next-level';

export class Screens {
  private storage: Storage;
  private eventListeners: Map<ScreenEvent, Set<(data?: any) => void>> = new Map();

  constructor(storage: Storage) {
    this.storage = storage;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Main menu buttons
    document.getElementById('start-btn')?.addEventListener('click', () => {
      this.emit('start-game');
    });

    document.getElementById('level-select-btn')?.addEventListener('click', () => {
      this.emit('level-select');
    });

    // Level select
    document.getElementById('back-btn')?.addEventListener('click', () => {
      this.showMainMenu();
    });

    // Pause overlay
    document.getElementById('pause-btn')?.addEventListener('click', () => {
      this.showPauseOverlay();
    });

    document.getElementById('resume-btn')?.addEventListener('click', () => {
      this.emit('resume');
    });

    document.getElementById('restart-btn')?.addEventListener('click', () => {
      this.emit('restart');
    });

    document.getElementById('menu-btn')?.addEventListener('click', () => {
      this.emit('menu');
    });

    // Result overlay
    document.getElementById('next-btn')?.addEventListener('click', () => {
      this.emit('next-level');
    });

    document.getElementById('restart-result-btn')?.addEventListener('click', () => {
      this.emit('restart');
    });

    document.getElementById('menu-result-btn')?.addEventListener('click', () => {
      this.emit('menu');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && this.isPauseOverlayVisible()) {
        this.hidePauseOverlay();
      }
    });
  }

  on(event: ScreenEvent, callback: (data?: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  private emit(event: ScreenEvent, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((cb) => cb(data));
    }
  }

  showMainMenu(): void {
    const menu = document.getElementById('main-menu');
    const levelSelect = document.getElementById('level-select');
    if (menu) menu.classList.add('active');
    if (levelSelect) levelSelect.classList.remove('active');
  }

  showLevelSelect(levels: LevelData[]): void {
    const menu = document.getElementById('main-menu');
    const levelSelect = document.getElementById('level-select');
    if (menu) menu.classList.remove('active');
    if (levelSelect) levelSelect.classList.add('active');

    this.renderLevelGrid(levels);
  }

  private renderLevelGrid(levels: LevelData[]): void {
    const grid = document.getElementById('level-grid');
    if (!grid) return;

    grid.innerHTML = '';
    levels.forEach((level) => {
      const card = document.createElement('button');
      card.className = 'level-card';
      const progress = this.storage.getProgress(level.id);
      const isUnlocked = this.storage.isLevelUnlocked(level.id);

      card.innerHTML = `
        <div class="number">${level.id}</div>
        <div class="stars">${'⭐'.repeat(progress.stars)}</div>
      `;

      if (!isUnlocked) {
        card.disabled = true;
      } else {
        card.addEventListener('click', () => {
          this.emit('select-level', level.id);
        });
      }

      grid.appendChild(card);
    });
  }

  hideMenus(): void {
    const menu = document.getElementById('main-menu');
    const levelSelect = document.getElementById('level-select');
    if (menu) menu.classList.remove('active');
    if (levelSelect) levelSelect.classList.remove('active');
  }

  showHUD(): void {
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) pauseBtn.style.display = 'block';
  }

  showPauseOverlay(): void {
    const overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.classList.add('active');
  }

  hidePauseOverlay(): void {
    const overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  private isPauseOverlayVisible(): boolean {
    const overlay = document.getElementById('pause-overlay');
    return overlay?.classList.contains('active') || false;
  }

  showResultOverlay(result: GameResult, cleared: boolean, isLastLevel: boolean): void {
    const overlay = document.getElementById('result-overlay');
    const title = document.getElementById('result-title');
    const stars = document.getElementById('result-stars');
    const breakdown = document.getElementById('score-breakdown');
    const nextBtn = document.getElementById('next-btn');

    if (!overlay) return;

    title!.textContent = cleared ? 'Level Clear!' : 'Level Failed';
    stars!.textContent = '⭐'.repeat(result.stars);

    breakdown!.innerHTML = `
      <div>Blocks: <span>${result.blockPoints}</span></div>
      <div>Pigs: <span>${result.pigPoints}</span></div>
      <div>Birds: <span>${result.birdBonusPoints}</span></div>
      <div><strong>Total: <span>${result.score}</span></strong></div>
    `;

    if (nextBtn) {
      nextBtn.style.display = cleared && !isLastLevel ? 'block' : 'none';
    }

    overlay.classList.add('active');
  }

  updateHUD(level: Level): void {
    const scoreEl = document.getElementById('score-value');
    if (scoreEl) {
      scoreEl.textContent = level.getScore().getTotal().toString();
    }

    const birdsList = document.getElementById('birds-list');
    if (birdsList) {
      birdsList.innerHTML = '';
      // Show remaining birds from queue (this would need access to bird queue)
      // For now, leave empty - could be enhanced
    }
  }

  render(): void {
    // UI is rendered via DOM, no canvas rendering needed
  }
}
