/** 스테이지 선택: 5×2 버튼(번호 + 별 0~3), [뒤로] (§8.1). 잠금 없음. */
import type { Progress } from '../core/Storage';
import type { LevelDef } from '../levels/types';
import { button, el, hide, show } from './dom';

export interface StageSelectActions {
  onSelect: (id: number) => void;
  onBack: () => void;
}

export class StageSelect {
  readonly el: HTMLElement;
  private readonly starLabels = new Map<number, HTMLElement>();

  constructor(root: HTMLElement, levels: readonly LevelDef[], actions: StageSelectActions) {
    this.el = el('div', 'screen stage-select hidden');
    this.el.appendChild(el('h1', 'title', '스테이지 선택'));

    const grid = el('div', 'stage-grid');
    for (const lv of levels) {
      const b = button(String(lv.id), 'stage-btn', () => actions.onSelect(lv.id));
      b.title = lv.name;
      b.setAttribute('aria-label', `스테이지 ${lv.id} ${lv.name}`);
      const stars = el('small', '', '☆☆☆');
      b.appendChild(stars);
      this.starLabels.set(lv.id, stars);
      grid.appendChild(b);
    }
    this.el.appendChild(grid);
    this.el.appendChild(button('뒤로', 'ghost', actions.onBack));
    root.appendChild(this.el);
  }

  show(progress: Progress): void {
    for (const [id, label] of this.starLabels) {
      const n = progress.stars[id] ?? 0;
      label.textContent = '★'.repeat(n) + '☆'.repeat(3 - n);
    }
    show(this.el);
  }

  hide(): void {
    hide(this.el);
  }
}
