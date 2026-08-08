/**
 * §15.1 요구 1 — 10개가 보이고, 1번부터 순차 해금되며, 잠금 스테이지는 선택되지 않는다.
 */

import { STAGES } from '../stages';
import type { Progress } from '../core/storage';
import { isUnlocked } from '../core/storage';

export interface StageSelectCallbacks {
  onSelect(id: number): void;
  onBack(): void;
}

export class StageSelect {
  private root: HTMLDivElement;
  private grid: HTMLDivElement;

  constructor(parent: HTMLElement, private cb: StageSelectCallbacks) {
    this.root = document.createElement('div');
    this.root.className = 'screen';
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="topbar"><button data-act="back">← 메인</button></div>
      <h1 style="font-size:44px">스테이지 선택</h1>
      <div class="stage-grid" data-el="grid"></div>
    `;
    parent.appendChild(this.root);

    const grid = this.root.querySelector<HTMLDivElement>('[data-el="grid"]');
    if (!grid) throw new Error('stage grid 누락');
    this.grid = grid;

    const back = this.root.querySelector<HTMLButtonElement>('[data-act="back"]');
    back?.addEventListener('click', () => this.cb.onBack());
  }

  render(progress: Progress): void {
    this.grid.innerHTML = '';
    for (const stage of STAGES) {
      const unlocked = isUnlocked(progress, stage.id);
      const stars = progress.stars[stage.id] ?? 0;

      const btn = document.createElement('button');
      btn.className = `stage-card${unlocked ? '' : ' locked'}`;
      btn.disabled = !unlocked;
      btn.setAttribute(
        'aria-label',
        `${stage.id}단계 ${stage.name}${unlocked ? `, 별 ${stars}개` : ', 잠김'}`,
      );
      btn.innerHTML = `
        <span class="no">${unlocked ? stage.id : '🔒'}</span>
        <span class="nm">${stage.name}</span>
        <span class="st">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>
      `;
      if (unlocked) {
        btn.addEventListener('click', () => this.cb.onSelect(stage.id));
      }
      this.grid.appendChild(btn);
    }
  }

  show(progress: Progress): void {
    this.render(progress);
    this.root.hidden = false;
    const first = this.grid.querySelector<HTMLButtonElement>('button:not([disabled])');
    first?.focus();
  }

  hide(): void {
    this.root.hidden = true;
  }

  destroy(): void {
    this.root.remove();
  }
}
