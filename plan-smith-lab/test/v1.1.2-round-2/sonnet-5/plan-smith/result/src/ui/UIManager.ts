import type { StageData, GameStateName } from '../types';
import type { SaveDataV1 } from '../save/SaveManager';
import { SaveManager } from '../save/SaveManager';

function req<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing element #${id}`);
  return el as T;
}

export interface UICallbacks {
  onStart: () => void;
  onSelectStage: (stageId: string) => void;
  onStageSelectBack: () => void;
  onPauseClick: () => void;
  onPauseRestart: () => void;
  onPauseMain: () => void;
  onClearNext: () => void;
  onClearStageSelect: () => void;
  onFailedRestart: () => void;
  onFailedMain: () => void;
}

/** Owns every DOM overlay/HUD element; Game never touches the DOM directly
 *  except for the canvas itself. */
export class UIManager {
  private overlays: Record<Exclude<GameStateName, 'PLAYING'>, HTMLElement>;
  private hud: HTMLElement;
  private hudBirds: HTMLElement;
  private hudScore: HTMLElement;
  private pauseBtn: HTMLButtonElement;
  private stageList: HTMLElement;
  private mainContinueInfo: HTMLElement;
  private clearedStars: HTMLElement;
  private clearedScore: HTMLElement;
  private clearedNextBtn: HTMLButtonElement;

  constructor(private callbacks: UICallbacks) {
    this.overlays = {
      MAIN: req('overlay-main'),
      STAGE_SELECT: req('overlay-stage-select'),
      PAUSED: req('overlay-pause'),
      CLEARED: req('overlay-cleared'),
      FAILED: req('overlay-failed'),
    };
    this.hud = req('hud');
    this.hudBirds = req('hud-birds');
    this.hudScore = req('hud-score');
    this.pauseBtn = req<HTMLButtonElement>('pause-btn');
    this.stageList = req('stage-list');
    this.mainContinueInfo = req('main-continue-info');
    this.clearedStars = req('cleared-stars');
    this.clearedScore = req('cleared-score');
    this.clearedNextBtn = req<HTMLButtonElement>('cleared-next-btn');

    req<HTMLButtonElement>('main-start-btn').addEventListener('click', () => callbacks.onStart());
    req<HTMLButtonElement>('stage-select-back-btn').addEventListener('click', () =>
      callbacks.onStageSelectBack(),
    );
    this.pauseBtn.addEventListener('click', () => callbacks.onPauseClick());
    req<HTMLButtonElement>('pause-restart-btn').addEventListener('click', () =>
      callbacks.onPauseRestart(),
    );
    req<HTMLButtonElement>('pause-main-btn').addEventListener('click', () => callbacks.onPauseMain());
    this.clearedNextBtn.addEventListener('click', () => callbacks.onClearNext());
    req<HTMLButtonElement>('cleared-stage-select-btn').addEventListener('click', () =>
      callbacks.onClearStageSelect(),
    );
    req<HTMLButtonElement>('failed-restart-btn').addEventListener('click', () =>
      callbacks.onFailedRestart(),
    );
    req<HTMLButtonElement>('failed-main-btn').addEventListener('click', () => callbacks.onFailedMain());
  }

  showScreen(state: GameStateName) {
    for (const key of Object.keys(this.overlays) as Array<keyof typeof this.overlays>) {
      this.overlays[key].style.display = key === state ? 'flex' : 'none';
    }
    const inGame = state === 'PLAYING' || state === 'PAUSED';
    this.hud.style.display = inGame ? 'flex' : 'none';
    // Hard requirement: pause control only appears during active play, and
    // must sit on the right side of the play area (see index.html/style.css).
    this.pauseBtn.style.display = state === 'PLAYING' ? 'block' : 'none';
  }

  renderMainMenu(save: SaveDataV1) {
    const clearedCount = Object.values(save.stageProgress).filter((p) => p.cleared).length;
    this.mainContinueInfo.textContent =
      clearedCount > 0 ? `진행 상황: ${clearedCount}/10 스테이지 클리어` : '';
  }

  renderStageSelect(stages: StageData[], save: SaveDataV1) {
    this.stageList.innerHTML = '';
    for (const stage of stages) {
      const unlocked = SaveManager.isUnlocked(stage.unlockCondition, save);
      const progress = save.stageProgress[stage.id];
      const btn = document.createElement('button');
      btn.className = 'stage-tile' + (unlocked ? '' : ' locked');
      btn.disabled = !unlocked;
      const stars = progress ? '★'.repeat(progress.stars) + '☆'.repeat(3 - progress.stars) : '☆☆☆';
      btn.innerHTML = `<span class="stage-order">${stage.order}</span><span class="stage-stars">${
        unlocked ? stars : '🔒'
      }</span>`;
      if (unlocked) {
        btn.addEventListener('click', () => this.callbacks.onSelectStage(stage.id));
      }
      this.stageList.appendChild(btn);
    }
  }

  updateHUD(birdsRemaining: number, score: number) {
    this.hudBirds.textContent = `남은 새: ${birdsRemaining}`;
    this.hudScore.textContent = `점수: ${score}`;
  }

  showClearOverlay(stars: number, score: number, isLastStage: boolean) {
    this.clearedStars.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    this.clearedScore.textContent = `점수: ${score}`;
    this.clearedNextBtn.style.display = isLastStage ? 'none' : 'inline-block';
  }
}
