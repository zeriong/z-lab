/**
 * HUD — 남은 새 / 점수 / 우측 상단 일시정지 버튼 (R20, R21, R22).
 *
 * 스펙 명시 요구(요구 3)의 절반이 이 파일에 있다. 일시정지 버튼은
 *  - 화면 **우측** 상단
 *  - 최소 44×44 (CSS에서 48px)
 *  - 새총 드래그 영역(좌측 하단)과 겹치지 않음
 * 세 조건을 동시에 만족해야 하고, 셋 다 CSS와 이 파일의 배치가 함께 만든다.
 */

import type { BirdKind } from '../game/materials';

/** 점수 롤업 시간 (R21: 0.3초) */
const ROLLUP_MS = 300;

export interface HudDeps {
  onPause(): void;
}

export class Hud {
  private root: HTMLElement;
  private birdsEl!: HTMLDivElement;
  private scoreEl!: HTMLDivElement;
  private stageNameEl!: HTMLDivElement;
  private pauseBtn!: HTMLButtonElement;
  private container!: HTMLDivElement;

  private displayedScore = 0;
  private targetScore = 0;
  private rollFrom = 0;
  private rollMs = 0;

  constructor(root: HTMLElement, private readonly deps: HudDeps) {
    this.root = root;
    this.build();
  }

  private build(): void {
    const el = document.createElement('div');
    el.className = 'hud';
    el.innerHTML = `
      <div class="hud-left">
        <div class="hud-birds" data-role="birds"></div>
        <div class="hud-stage-name" data-role="stage-name"></div>
      </div>
      <div class="hud-score" data-role="score">0</div>
      <div class="hud-right">
        <button class="pause-button" type="button" data-role="pause" aria-label="일시정지">❚❚</button>
      </div>
    `;
    this.root.appendChild(el);

    this.container = el;
    this.birdsEl = el.querySelector('[data-role="birds"]') as HTMLDivElement;
    this.scoreEl = el.querySelector('[data-role="score"]') as HTMLDivElement;
    this.stageNameEl = el.querySelector('[data-role="stage-name"]') as HTMLDivElement;
    this.pauseBtn = el.querySelector('[data-role="pause"]') as HTMLButtonElement;

    this.pauseBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.deps.onPause();
    });
    // 캔버스로 새어 나가 드래그 시작으로 오인되는 것을 막는다.
    this.pauseBtn.addEventListener('pointerdown', (ev) => ev.stopPropagation());
  }

  setVisible(visible: boolean): void {
    this.container.classList.toggle('is-visible', visible);
  }

  setStageName(name: string, id: number): void {
    this.stageNameEl.textContent = `STAGE ${String(id).padStart(2, '0')} · ${name}`;
  }

  /** 발사할 때마다 하나씩 회색으로 바뀐다 (R20) */
  setBirds(plan: readonly BirdKind[], used: number): void {
    const pips = this.birdsEl.children;
    if (pips.length !== plan.length) {
      this.birdsEl.innerHTML = plan
        .map((kind) => `<span class="bird-pip" data-kind="${kind}"></span>`)
        .join('');
    }
    Array.from(this.birdsEl.children).forEach((node, i) => {
      node.classList.toggle('is-spent', i < used);
    });
  }

  /** 목표값까지 0.3초 롤업 (R21) */
  setScore(score: number): void {
    if (score === this.targetScore) return;
    this.rollFrom = this.displayedScore;
    this.targetScore = score;
    this.rollMs = 0;
  }

  resetScore(): void {
    this.displayedScore = 0;
    this.targetScore = 0;
    this.rollFrom = 0;
    this.rollMs = 0;
    this.scoreEl.textContent = '0';
  }

  update(dtMs: number): void {
    if (this.displayedScore === this.targetScore) return;
    this.rollMs = Math.min(ROLLUP_MS, this.rollMs + dtMs);
    const t = this.rollMs / ROLLUP_MS;
    const eased = 1 - (1 - t) * (1 - t);
    const value = Math.round(this.rollFrom + (this.targetScore - this.rollFrom) * eased);
    this.displayedScore = t >= 1 ? this.targetScore : value;
    this.scoreEl.textContent = this.displayedScore.toLocaleString('en-US');
  }

  destroy(): void {
    this.container.remove();
  }
}
