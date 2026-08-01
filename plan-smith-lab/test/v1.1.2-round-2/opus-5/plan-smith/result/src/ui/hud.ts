/** 인게임 HUD (R4): 스테이지 번호 · 현재 점수 · 남은 새. 우측 일시정지 버튼과 겹치지 않는 좌측 배치. */

import type { HudData } from '../types';
import { q, setText } from './dom';

export class Hud {
  private root = q<HTMLElement>('#hud');
  private stageEl = q<HTMLElement>('#hud-stage');
  private scoreEl = q<HTMLElement>('#hud-score');
  private birdsEl = q<HTMLElement>('#hud-birds');
  private shown = 0;

  setVisible(visible: boolean): void {
    this.root.classList.toggle('hidden', !visible);
    if (visible) this.root.removeAttribute('aria-hidden');
    else this.root.setAttribute('aria-hidden', 'true');
  }

  update(data: HudData): void {
    setText(this.stageEl, String(data.stageId));
    // 점수는 목표값으로 부드럽게 따라간다(가독성: 급변 방지)
    if (data.score < this.shown) this.shown = data.score;
    this.shown = data.score - (data.score - this.shown) * 0.72;
    if (Math.abs(data.score - this.shown) < 1) this.shown = data.score;
    setText(this.scoreEl, String(Math.round(this.shown)));
    setText(this.birdsEl, data.birdsLeft > 0 ? '●'.repeat(data.birdsLeft) : '—');
  }

  resetScoreAnim(): void {
    this.shown = 0;
  }
}
