/**
 * §9.1 HUD — 남은 새, 점수, 우측 상단 일시정지 버튼.
 * canvas에 버튼을 그리면 히트테스트·포커스·키보드 접근성·호버 커서를 전부 직접 만들어야 한다.
 * 그래서 DOM으로 canvas 위에 얹는다(§1.3).
 */

import type { BirdType } from '../stages/schema';
import { formatScore } from '../game/score';

export interface HudCallbacks {
  onPause(): void;
  onToggleMute(): void;
}

export interface HudModel {
  stageName: string;
  stageId: number;
  score: number;
  /** 남은 새 타입들(장전된 새 포함) */
  remaining: BirdType[];
  /** 스테이지 전체 새 */
  total: BirdType[];
  pigsAlive: number;
  hint?: string;
  muted: boolean;
}

export class Hud {
  readonly root: HTMLDivElement;
  private scoreEl: HTMLDivElement;
  private stageEl: HTMLDivElement;
  private birdsEl: HTMLDivElement;
  private hintEl: HTMLDivElement;
  private muteBtn: HTMLButtonElement;
  readonly pauseBtn: HTMLButtonElement;

  constructor(parent: HTMLElement, cb: HudCallbacks) {
    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.innerHTML = `
      <div class="hud-left">
        <div class="hud-badge" data-el="stage"></div>
        <div class="hud-badge" data-el="score"></div>
        <div class="hud-birds" data-el="birds" aria-label="남은 새"></div>
      </div>
      <div class="hud-right">
        <button class="icon-btn" data-el="mute" aria-label="음소거 전환">♪</button>
        <button class="icon-btn" data-el="pause" aria-label="일시정지" title="일시정지 (Esc)">‖</button>
      </div>
      <div class="hud-hint" data-el="hint" hidden></div>
    `;
    parent.appendChild(this.root);

    this.stageEl = this.q('stage');
    this.scoreEl = this.q('score');
    this.birdsEl = this.q('birds');
    this.hintEl = this.q('hint');
    this.pauseBtn = this.q('pause') as unknown as HTMLButtonElement;
    this.muteBtn = this.q('mute') as unknown as HTMLButtonElement;

    this.pauseBtn.addEventListener('click', () => cb.onPause());
    this.muteBtn.addEventListener('click', () => cb.onToggleMute());
  }

  private q(name: string): HTMLDivElement {
    const el = this.root.querySelector<HTMLDivElement>(`[data-el="${name}"]`);
    if (!el) throw new Error(`HUD 요소 누락: ${name}`);
    return el;
  }

  update(m: HudModel): void {
    this.stageEl.textContent = `${m.stageId}. ${m.stageName}   🐷 ${m.pigsAlive}`;
    this.scoreEl.textContent = `점수 ${formatScore(m.score)}`;
    this.muteBtn.textContent = m.muted ? '🔇' : '♪';

    const used = m.total.length - m.remaining.length;
    const dots = m.total
      .map((t, i) => `<span class="bird-dot ${t} ${i < used ? 'used' : ''}"></span>`)
      .join('');
    this.birdsEl.innerHTML = dots;

    if (m.hint) {
      this.hintEl.textContent = m.hint;
      this.hintEl.hidden = false;
    } else {
      this.hintEl.hidden = true;
    }
  }

  show(): void {
    this.root.style.display = '';
  }

  hide(): void {
    this.root.style.display = 'none';
  }

  destroy(): void {
    this.root.remove();
  }
}
