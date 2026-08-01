// DOM 오버레이 UI — 메인·HUD·일시정지·결과 화면 (플랜 §전달 스택: 프레임워크 불사용)

import type { SaveData } from '../save/storage';

export interface ScreenHandlers {
  onStageSelect(stageId: number): void;
  onPauseToggle(): void;
  onPauseRestart(): void;
  onPauseMain(): void;
  onResultNext(): void;
  onResultRestart(): void;
  onResultMain(): void;
}

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing DOM element: #${id}`);
  return node as T;
}

export class Screens {
  private mainScreen = el<HTMLDivElement>('main-screen');
  private stageGrid = el<HTMLDivElement>('stage-grid');
  private hud = el<HTMLDivElement>('hud');
  private hudBirds = el<HTMLSpanElement>('hud-birds');
  private hudPigs = el<HTMLSpanElement>('hud-pigs');
  private hudScore = el<HTMLSpanElement>('hud-score');
  private pauseBtn = el<HTMLButtonElement>('pause-btn');
  private pauseOverlay = el<HTMLDivElement>('pause-overlay');
  private resultOverlay = el<HTMLDivElement>('result-overlay');
  private resultTitle = el<HTMLHeadingElement>('result-title');
  private resultStars = el<HTMLDivElement>('result-stars');
  private resultScore = el<HTMLDivElement>('result-score');
  private resultNextBtn = el<HTMLButtonElement>('result-next');

  constructor(
    private totalStages: number,
    handlers: ScreenHandlers,
  ) {
    this.pauseBtn.addEventListener('click', handlers.onPauseToggle);
    el<HTMLButtonElement>('pause-restart').addEventListener('click', handlers.onPauseRestart);
    el<HTMLButtonElement>('pause-main').addEventListener('click', handlers.onPauseMain);
    this.resultNextBtn.addEventListener('click', handlers.onResultNext);
    el<HTMLButtonElement>('result-restart').addEventListener('click', handlers.onResultRestart);
    el<HTMLButtonElement>('result-main').addEventListener('click', handlers.onResultMain);
    this.stageGrid.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('.stage-cell') as HTMLButtonElement | null;
      if (!target || target.disabled) return;
      handlers.onStageSelect(Number(target.dataset.stage));
    });
  }

  /** 메인 화면 — 잠금/해제·별 표시 (R1-d), 해제된 것만 진입 가능 */
  showMain(save: SaveData): void {
    this.stageGrid.innerHTML = '';
    for (let id = 1; id <= this.totalStages; id++) {
      const unlocked = id <= save.unlocked;
      const btn = document.createElement('button');
      btn.className = 'stage-cell' + (unlocked ? '' : ' locked');
      btn.dataset.stage = String(id);
      btn.disabled = !unlocked;
      const stars = save.stars[id] ?? 0;
      btn.innerHTML = unlocked
        ? `<span>${id}</span><span class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>`
        : `<span>&#128274;</span>`;
      this.stageGrid.appendChild(btn);
    }
    this.mainScreen.classList.remove('hidden');
    this.hud.classList.add('hidden');
    this.pauseOverlay.classList.add('hidden');
    this.resultOverlay.classList.add('hidden');
  }

  showIngame(): void {
    this.mainScreen.classList.add('hidden');
    this.pauseOverlay.classList.add('hidden');
    this.resultOverlay.classList.add('hidden');
    this.hud.classList.remove('hidden');
  }

  showPause(): void {
    this.pauseOverlay.classList.remove('hidden');
  }

  hidePause(): void {
    this.pauseOverlay.classList.add('hidden');
  }

  showCleared(stars: number, score: number, hasNext: boolean): void {
    this.resultTitle.textContent = '스테이지 클리어!';
    this.resultStars.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    this.resultScore.textContent = `점수: ${score.toLocaleString()}`;
    this.resultNextBtn.classList.toggle('hidden', !hasNext);
    this.resultOverlay.classList.remove('hidden');
  }

  showFailed(): void {
    this.resultTitle.textContent = '실패...';
    this.resultStars.textContent = '';
    this.resultScore.textContent = '새를 모두 소진했습니다';
    this.resultNextBtn.classList.add('hidden');
    this.resultOverlay.classList.remove('hidden');
  }

  /** HUD: 남은 새·남은 돼지·점수 — 플레이를 멈추지 않고 읽힌다 (품질 바닥) */
  updateHud(birds: number, pigs: number, score: number): void {
    this.hudBirds.textContent = `새 ${birds}`;
    this.hudPigs.textContent = `돼지 ${pigs}`;
    this.hudScore.textContent = `점수 ${score.toLocaleString()}`;
  }
}
