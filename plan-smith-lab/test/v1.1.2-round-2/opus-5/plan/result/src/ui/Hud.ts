import { button, el, fmt } from './dom';

/**
 * 인게임 HUD.
 * 요구사항 3: 일시정지 버튼은 인게임 "우측"에 둔다 (.pause-btn { right: … }).
 */
export class Hud {
  readonly root: HTMLDivElement;
  onPause: () => void = () => {};

  private stageName: HTMLDivElement;
  private scoreEl: HTMLDivElement;
  private birdsEl: HTMLDivElement;
  private hint: HTMLDivElement;
  readonly pauseBtn: HTMLButtonElement;

  constructor(parent: HTMLElement) {
    this.root = el('div', 'hud');
    this.root.hidden = true;

    const panel = el('div', 'panel');
    this.stageName = el('div', 'stage-name', '');
    this.scoreEl = el('div', 'score', '0');
    this.birdsEl = el('div', 'birds', '');
    panel.append(this.stageName, this.scoreEl, this.birdsEl);

    this.pauseBtn = button('II', 'btn pause-btn');
    this.pauseBtn.setAttribute('aria-label', '일시정지');
    this.pauseBtn.addEventListener('click', () => this.onPause());

    this.hint = el('div', 'hint', '새를 드래그해서 조준하세요');

    this.root.append(panel, this.pauseBtn, this.hint);
    parent.appendChild(this.root);
  }

  update(stageId: number, stageName: string, score: number, birdsLeft: number, pigsLeft: number): void {
    this.stageName.textContent = `STAGE ${stageId} · ${stageName}`;
    this.scoreEl.textContent = fmt(score);
    this.birdsEl.textContent = `${'●'.repeat(Math.max(0, birdsLeft))}${'○'.repeat(0)}  목표 ${pigsLeft}`;
  }

  setHint(text: string): void {
    this.hint.textContent = text;
    this.hint.hidden = text.length === 0;
  }

  show(): void {
    this.root.hidden = false;
  }

  hide(): void {
    this.root.hidden = true;
  }
}
