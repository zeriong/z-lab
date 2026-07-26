// HTML/CSS overlay layer on top of the canvas: main menu, in-game HUD (with the
// right-side pause button), and the pause / clear / fail panels. The renderer
// owns the canvas; this module owns every DOM control and wires clicks to the
// callbacks the Game passes in.

import { STAGES } from './stages';

export interface UICallbacks {
  onSelectStage: (index: number) => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
  onNext: () => void;
}

export interface StageResult {
  stageIndex: number;
  score: number;
  stars: number;
  isLast: boolean;
}

export interface Progress {
  cleared: boolean[];
  stars: number[];
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { class?: string } = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  const { class: cls, ...rest } = props as any;
  if (cls) node.className = cls;
  Object.assign(node, rest);
  for (const c of children) node.append(c);
  return node;
}

function stars(n: number): string {
  return '★★★☆☆☆'.slice(3 - n, 6 - n);
}

export class UI {
  readonly canvas: HTMLCanvasElement;
  private menu: HTMLElement;
  private stageGrid: HTMLElement;
  private hud: HTMLElement;
  private hudStage: HTMLElement;
  private hudBirds: HTMLElement;
  private hudScore: HTMLElement;
  private pauseOverlay: HTMLElement;
  private clearOverlay: HTMLElement;
  private failOverlay: HTMLElement;
  private clearTitle: HTMLElement;
  private clearStars: HTMLElement;
  private clearScore: HTMLElement;
  private nextBtn: HTMLButtonElement;

  constructor(root: HTMLElement, private cb: UICallbacks) {
    this.canvas = el('canvas', { class: 'game-canvas' });

    // ---- HUD ----
    this.hudStage = el('div', { class: 'hud-stage' });
    this.hudBirds = el('div', { class: 'hud-birds' });
    this.hudScore = el('div', { class: 'hud-score' });
    const pauseBtn = el('button', { class: 'pause-btn', title: '일시정지', ariaLabel: '일시정지' }, ['❚❚']);
    pauseBtn.addEventListener('click', () => this.cb.onPause());
    this.hud = el('div', { class: 'hud' }, [
      el('div', { class: 'hud-left' }, [this.hudStage]),
      el('div', { class: 'hud-center' }, [this.hudBirds, this.hudScore]),
      el('div', { class: 'hud-right' }, [pauseBtn]),
    ]);

    // ---- Pause overlay ----
    this.pauseOverlay = this.panel('일시정지', [
      this.button('이어하기', 'ghost', () => this.cb.onResume()),
      this.button('다시하기', 'primary', () => this.cb.onRestart()),
      this.button('메인으로', 'ghost', () => this.cb.onMenu()),
    ]);

    // ---- Clear overlay ----
    this.clearTitle = el('h2', {}, ['스테이지 클리어!']);
    this.clearStars = el('div', { class: 'stars' });
    this.clearScore = el('div', { class: 'result-score' });
    this.nextBtn = this.button('다음 스테이지', 'primary', () => this.cb.onNext());
    this.clearOverlay = el('div', { class: 'overlay hidden' }, [
      el('div', { class: 'panel' }, [
        this.clearTitle,
        this.clearStars,
        this.clearScore,
        el('div', { class: 'panel-btns' }, [
          this.nextBtn,
          this.button('다시하기', 'ghost', () => this.cb.onRestart()),
          this.button('메인으로', 'ghost', () => this.cb.onMenu()),
        ]),
      ]),
    ]);

    // ---- Fail overlay ----
    this.failOverlay = this.panel('실패...', [
      this.button('다시하기', 'primary', () => this.cb.onRestart()),
      this.button('메인으로', 'ghost', () => this.cb.onMenu()),
    ], '돼지가 아직 남아있어요!');

    // ---- Menu ----
    this.stageGrid = el('div', { class: 'stage-grid' });
    this.menu = el('div', { class: 'menu' }, [
      el('div', { class: 'menu-card' }, [
        el('h1', { class: 'menu-title' }, ['ANGRY BIRDS']),
        el('p', { class: 'menu-sub' }, ['스테이지를 선택하세요']),
        this.stageGrid,
      ]),
    ]);

    const viewport = el('div', { class: 'viewport' }, [
      this.canvas,
      this.hud,
      this.pauseOverlay,
      this.clearOverlay,
      this.failOverlay,
      this.menu,
    ]);
    root.append(viewport);
  }

  private button(label: string, kind: 'primary' | 'ghost', on: () => void): HTMLButtonElement {
    const b = el('button', { class: `btn btn-${kind}` }, [label]);
    b.addEventListener('click', on);
    return b;
  }

  private panel(title: string, buttons: HTMLButtonElement[], sub?: string): HTMLElement {
    const kids: (Node | string)[] = [el('h2', {}, [title])];
    if (sub) kids.push(el('p', { class: 'panel-sub' }, [sub]));
    kids.push(el('div', { class: 'panel-btns' }, buttons));
    return el('div', { class: 'overlay hidden' }, [el('div', { class: 'panel' }, kids)]);
  }

  buildMenu(progress: Progress): void {
    this.stageGrid.replaceChildren();
    STAGES.forEach((stage, i) => {
      const cleared = progress.cleared[i];
      const cell = el('button', { class: 'stage-cell' + (cleared ? ' cleared' : '') }, [
        el('div', { class: 'stage-num' }, [String(stage.id)]),
        el('div', { class: 'stage-name' }, [stage.name]),
        el('div', { class: 'stage-stars' }, [cleared ? stars(progress.stars[i]) : '☆☆☆']),
      ]);
      cell.addEventListener('click', () => this.cb.onSelectStage(i));
      this.stageGrid.append(cell);
    });
  }

  updateHud(stageName: string, stageId: number, birds: number, score: number): void {
    this.hudStage.textContent = `STAGE ${stageId} · ${stageName}`;
    this.hudBirds.textContent = '🐦'.repeat(Math.max(0, birds)) || '—';
    this.hudScore.textContent = `${score.toLocaleString()}점`;
  }

  private hideAllOverlays(): void {
    this.pauseOverlay.classList.add('hidden');
    this.clearOverlay.classList.add('hidden');
    this.failOverlay.classList.add('hidden');
  }

  showMenu(progress: Progress): void {
    this.buildMenu(progress);
    this.hideAllOverlays();
    this.menu.classList.remove('hidden');
    this.hud.classList.add('hidden');
  }

  showPlaying(): void {
    this.hideAllOverlays();
    this.menu.classList.add('hidden');
    this.hud.classList.remove('hidden');
  }

  showPaused(): void {
    this.pauseOverlay.classList.remove('hidden');
  }

  showClear(result: StageResult): void {
    this.clearStars.textContent = stars(result.stars);
    this.clearScore.textContent = `${result.score.toLocaleString()}점`;
    this.nextBtn.style.display = result.isLast ? 'none' : '';
    this.clearTitle.textContent = result.isLast ? '모든 스테이지 클리어!' : '스테이지 클리어!';
    this.clearOverlay.classList.remove('hidden');
  }

  showFail(): void {
    this.failOverlay.classList.remove('hidden');
  }
}
