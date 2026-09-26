import type { ProgressStore } from '../../storage/progress';
import { button, el, formatScore, setVisible, starText } from '../dom';

/** 스테이지 선택: 5×2 그리드. 번호, 잠금 여부, 별 0~3, 최고 점수 (§7.1) */
export interface StageSelectActions {
  select(stage: number): void;
  back(): void;
}

export class StageSelect {
  readonly root: HTMLElement;
  private readonly grid: HTMLElement;

  constructor(
    private readonly total: number,
    private readonly names: readonly string[],
    private readonly progress: ProgressStore,
    private readonly actions: StageSelectActions,
  ) {
    this.grid = el('div', { class: 'stage-grid', role: 'list' });
    const back = button('← 메인', 'btn-back', () => actions.back(), 'btn-ghost');
    this.root = el('section', { class: 'screen screen-select is-hidden', testid: 'screen-select', 'aria-label': '스테이지 선택' }, [
      el('header', { class: 'select-header' }, [back, el('h2', { text: '스테이지 선택' })]),
      this.grid,
    ]);
  }

  refresh(): void {
    this.grid.replaceChildren();
    for (let n = 1; n <= this.total; n++) {
      const unlocked = this.progress.isUnlocked(n);
      const rec = this.progress.record(n);
      const cell = el(
        'button',
        {
          type: 'button',
          class: `stage-cell ${unlocked ? 'is-unlocked' : 'is-locked'}`,
          testid: `stage-${n}`,
          'data-locked': unlocked ? 'false' : 'true',
          'aria-label': unlocked ? `스테이지 ${n} ${this.names[n - 1] ?? ''}` : `스테이지 ${n} 잠김`,
          role: 'listitem',
          disabled: !unlocked,
        },
        [
          el('span', { class: 'stage-num', text: String(n) }),
          el('span', { class: 'stage-name', text: unlocked ? (this.names[n - 1] ?? '') : '🔒' }),
          el('span', { class: 'stage-stars', text: starText(rec?.stars ?? 0) }),
          el('span', { class: 'stage-best', text: rec ? formatScore(rec.bestScore) : '' }),
        ],
      );
      if (unlocked) {
        cell.addEventListener('click', () => {
          if (!cell.disabled) this.actions.select(n);
        });
      }
      this.grid.append(cell);
    }
  }

  show(visible: boolean): void {
    if (visible) this.refresh();
    setVisible(this.root, visible);
    if (visible) this.grid.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus({ preventScroll: true });
  }

  /** 전환 중 중복 클릭 방지 */
  lock(): void {
    this.grid.querySelectorAll('button').forEach((b) => ((b as HTMLButtonElement).disabled = true));
  }
}
