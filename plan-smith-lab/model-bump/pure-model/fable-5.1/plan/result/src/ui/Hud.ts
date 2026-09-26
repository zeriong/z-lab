/**
 * 인게임 HUD (§8.1).
 * 좌상단: 스테이지 번호·점수. 좌하단: 남은 새 아이콘 열.
 * 우상단: 일시정지 버튼 48×48 ("❚❚"), 게임 컨테이너 기준 top:12px; right:12px.
 */
import type { BirdKind } from '../levels/types';
import { button, el, hide, show } from './dom';

export interface HudActions {
  onPause: () => void;
}

export class Hud {
  readonly el: HTMLElement;
  private readonly stageEl: HTMLElement;
  private readonly scoreEl: HTMLElement;
  private readonly popEl: HTMLElement;
  private readonly birdsEl: HTMLElement;
  private readonly pauseBtn: HTMLButtonElement;
  private popTimer = 0;

  constructor(root: HTMLElement, actions: HudActions) {
    this.el = el('div', 'hud hidden');

    const topLeft = el('div', 'hud-topleft');
    this.stageEl = el('div', 'stage', '스테이지 1');
    this.scoreEl = el('div', 'score', '0');
    topLeft.appendChild(this.stageEl);
    topLeft.appendChild(this.scoreEl);
    this.el.appendChild(topLeft);

    this.popEl = el('div', 'hud-pop', '');
    this.el.appendChild(this.popEl);

    this.pauseBtn = button('❚❚', 'pause-btn', actions.onPause);
    this.pauseBtn.setAttribute('aria-label', '일시정지');
    this.pauseBtn.title = '일시정지 (Esc)';
    this.el.appendChild(this.pauseBtn);

    this.birdsEl = el('div', 'hud-birds');
    this.el.appendChild(this.birdsEl);

    root.appendChild(this.el);
  }

  show(): void {
    show(this.el);
  }

  hide(): void {
    hide(this.el);
  }

  setStage(id: number, name: string): void {
    this.stageEl.textContent = `스테이지 ${id} · ${name}`;
  }

  setScore(score: number): void {
    this.scoreEl.textContent = score.toLocaleString('ko-KR');
  }

  /** "+5000" 팝업 */
  popScore(delta: number): void {
    if (delta <= 0) return;
    this.popEl.textContent = `+${delta.toLocaleString('ko-KR')}`;
    this.popEl.classList.remove('show');
    // 리플로우로 애니메이션 재시작
    void this.popEl.offsetWidth;
    this.popEl.classList.add('show');
    window.clearTimeout(this.popTimer);
    this.popTimer = window.setTimeout(() => this.popEl.classList.remove('show'), 950);
  }

  /** 남은 새 (새총 위 새 포함) 아이콘 */
  setBirds(kinds: readonly BirdKind[]): void {
    this.birdsEl.replaceChildren(...kinds.map((k) => el('div', `bird-dot ${k}`)));
  }

  setPauseVisible(visible: boolean): void {
    if (visible) show(this.pauseBtn);
    else hide(this.pauseBtn);
  }
}
