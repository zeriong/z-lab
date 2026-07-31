import { sfx } from './audio';
import { STAGES } from './stages';
import { Progress } from './storage';
import type { StageDef } from './types';

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`DOM 요소를 찾을 수 없습니다: #${id}`);
  return node as T;
}

export interface UICallbacks {
  onStageSelect(index: number): void;
  onPause(): void;
  onResume(): void;
  onRestart(): void;
  onToMenu(): void;
  onNextStage(): void;
}

export function starsFor(stage: StageDef, score: number): number {
  const [a, b, c] = stage.starThresholds;
  if (score >= c) return 3;
  if (score >= b) return 2;
  if (score >= a) return 1;
  return 0;
}

export class UI {
  private menu = el<HTMLElement>('menu-screen');
  private hud = el<HTMLElement>('hud');
  private pauseBtn = el<HTMLButtonElement>('pause-btn');
  private pauseOverlay = el<HTMLElement>('pause-overlay');
  private resultOverlay = el<HTMLElement>('result-overlay');
  private resultTitle = el<HTMLElement>('result-title');
  private resultStars = el<HTMLElement>('result-stars');
  private resultScore = el<HTMLElement>('result-score');
  private btnNext = el<HTMLButtonElement>('btn-next');
  private hudStage = el<HTMLElement>('hud-stage');
  private hudScore = el<HTMLElement>('hud-score');
  private hudBirds = el<HTMLElement>('hud-birds');
  private stageGrid = el<HTMLElement>('stage-grid');
  private fpsBox = el<HTMLElement>('fps');

  constructor(private cb: UICallbacks) {
    const click = (node: HTMLElement, fn: () => void) => {
      node.addEventListener('click', () => {
        sfx.click();
        fn();
      });
    };

    click(this.pauseBtn, () => this.cb.onPause());
    click(el<HTMLElement>('btn-resume'), () => this.cb.onResume());
    click(el<HTMLElement>('btn-restart'), () => this.cb.onRestart());
    click(el<HTMLElement>('btn-to-menu'), () => this.cb.onToMenu());
    click(el<HTMLElement>('btn-next'), () => this.cb.onNextStage());
    click(el<HTMLElement>('btn-retry'), () => this.cb.onRestart());
    click(el<HTMLElement>('btn-result-menu'), () => this.cb.onToMenu());
    click(el<HTMLElement>('reset-progress'), () => {
      Progress.reset();
      this.renderStageGrid();
    });

    // 키보드 접근성: ESC로 일시정지/해제
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!this.pauseOverlay.classList.contains('hidden')) this.cb.onResume();
      else if (!this.pauseBtn.classList.contains('hidden')) this.cb.onPause();
    });

    this.renderStageGrid();
  }

  renderStageGrid(): void {
    this.stageGrid.innerHTML = '';
    STAGES.forEach((stage, index) => {
      const unlocked = Progress.isUnlocked(stage.id);
      const best = Progress.best(stage.id);
      const stars = best > 0 ? starsFor(stage, best) : 0;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'stage-btn';
      btn.disabled = !unlocked;
      btn.innerHTML = `
        <span>${stage.id}</span>
        <span class="stage-stars">${unlocked ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : ''}</span>
        ${unlocked ? '' : '<span class="lock">잠김</span>'}
      `;
      btn.title = unlocked ? `${stage.name}${best ? ` · 최고 ${best}` : ''}` : '이전 스테이지를 클리어하세요';
      btn.addEventListener('click', () => {
        sfx.unlock();
        sfx.click();
        this.cb.onStageSelect(index);
      });
      this.stageGrid.appendChild(btn);
    });
  }

  showMenu(): void {
    this.renderStageGrid();
    this.menu.classList.remove('hidden');
    this.hud.classList.add('hidden');
    this.pauseBtn.classList.add('hidden');
    this.pauseOverlay.classList.add('hidden');
    this.resultOverlay.classList.add('hidden');
  }

  showPlaying(): void {
    this.menu.classList.add('hidden');
    this.hud.classList.remove('hidden');
    this.pauseBtn.classList.remove('hidden');
    this.pauseOverlay.classList.add('hidden');
    this.resultOverlay.classList.add('hidden');
  }

  showPaused(): void {
    this.pauseOverlay.classList.remove('hidden');
    this.pauseBtn.classList.add('hidden');
    this.resultOverlay.classList.add('hidden');
  }

  showResult(kind: 'CLEAR' | 'FAIL', stage: StageDef, score: number, hasNext: boolean): void {
    this.pauseOverlay.classList.add('hidden');
    this.pauseBtn.classList.add('hidden');
    this.resultOverlay.classList.remove('hidden');

    if (kind === 'CLEAR') {
      const stars = starsFor(stage, score);
      this.resultTitle.textContent = hasNext ? 'STAGE CLEAR!' : 'ALL STAGES CLEAR!';
      this.resultStars.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
      this.btnNext.classList.toggle('hidden', !hasNext);
      this.btnNext.textContent = '다음 스테이지';
    } else {
      this.resultTitle.textContent = 'STAGE FAILED';
      this.resultStars.textContent = '';
      this.btnNext.classList.add('hidden');
    }
    this.resultScore.textContent = `SCORE ${score.toLocaleString()}`;
  }

  updateHud(stage: StageDef, score: number, birdsTotal: number, birdsLeft: number): void {
    this.hudStage.textContent = `STAGE ${stage.id} · ${stage.name}`;
    this.hudScore.textContent = score.toLocaleString();
    if (this.hudBirds.childElementCount !== birdsTotal) {
      this.hudBirds.innerHTML = '';
      for (let i = 0; i < birdsTotal; i++) {
        const dot = document.createElement('span');
        dot.className = 'bird-dot';
        this.hudBirds.appendChild(dot);
      }
    }
    Array.from(this.hudBirds.children).forEach((node, i) => {
      node.classList.toggle('used', i >= birdsLeft);
    });
  }

  setFps(fps: number): void {
    this.fpsBox.textContent = `${fps.toFixed(0)} fps`;
  }
}
