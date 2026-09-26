import { trapFocus } from '../../input/keyboard';
import { button, el, formatScore, setVisible } from '../dom';

/**
 * 결과 오버레이 (§7.1): 클리어 / 실패 / 올클리어.
 * 일시정지 오버레이와 testid가 겹치지 않도록 btn-result-* 를 쓴다.
 */
export type ResultAction = 'retry' | 'next' | 'toMain';

export interface ClearedInfo {
  stage: number;
  totalStages: number;
  score: number;
  best: number;
  newBest: boolean;
  stars: number;
  totalStars: number;
}

export interface FailedInfo {
  stage: number;
  pigsLeft: number;
}

export class ResultOverlay {
  readonly root: HTMLElement;
  private readonly title: HTMLElement;
  private readonly stars: HTMLElement;
  private readonly body: HTMLElement;
  private readonly allClear: HTMLElement;
  private readonly retryBtn: HTMLButtonElement;
  private readonly nextBtn: HTMLButtonElement;
  private readonly mainBtn: HTMLButtonElement;

  constructor(onAction: (a: ResultAction) => void) {
    const act = (a: ResultAction) => () => {
      this.lock();
      onAction(a);
    };
    this.retryBtn = button('다시하기', 'btn-result-retry', act('retry'));
    this.nextBtn = button('다음 스테이지 ▶', 'btn-next', act('next'), 'btn-primary');
    this.mainBtn = button('메인으로', 'btn-result-main', act('toMain'));
    this.title = el('h2', { id: 'result-title', class: 'panel-title', testid: 'result-title' });
    this.stars = el('div', { class: 'result-stars', testid: 'result-stars', 'aria-label': '별' });
    this.body = el('div', { class: 'result-body', testid: 'result-body' });
    this.allClear = el('div', { class: 'result-allclear is-hidden', testid: 'result-allclear' });
    const panel = el('div', { class: 'panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'result-title' }, [
      this.title,
      this.stars,
      this.body,
      this.allClear,
      el('div', { class: 'panel-buttons' }, [this.nextBtn, this.retryBtn, this.mainBtn]),
    ]);
    this.root = el('div', { class: 'overlay overlay-result is-hidden', testid: 'overlay-result' }, [panel]);
    this.root.addEventListener('pointerdown', (e) => e.stopPropagation());
    trapFocus(this.root);
  }

  showCleared(info: ClearedInfo): void {
    this.root.dataset.result = 'cleared';
    this.title.textContent = `스테이지 ${info.stage} 클리어!`;
    this.stars.replaceChildren(
      ...[1, 2, 3].map((i) =>
        el('span', {
          class: `star ${i <= info.stars ? 'is-on' : ''}`,
          style: `animation-delay:${(i - 1) * 0.25}s`,
          text: i <= info.stars ? '★' : '☆',
        }),
      ),
    );
    this.stars.dataset.stars = String(info.stars);
    setVisible(this.stars, true);
    this.body.replaceChildren(
      el('p', { class: 'result-score', testid: 'result-score', text: `점수 ${formatScore(info.score)}` }),
      el('p', { class: 'result-best', text: `${info.newBest ? '새 최고 기록! ' : ''}최고 점수 ${formatScore(info.best)}` }),
    );
    const last = info.stage >= info.totalStages;
    setVisible(this.nextBtn, !last);
    this.nextBtn.disabled = last;
    setVisible(this.allClear, last);
    this.allClear.textContent = last ? `모든 스테이지 클리어! 총 별 ${info.totalStars}개` : '';
    this.open(last ? this.retryBtn : this.nextBtn);
  }

  showFailed(info: FailedInfo): void {
    this.root.dataset.result = 'failed';
    this.title.textContent = '실패';
    this.stars.replaceChildren();
    setVisible(this.stars, false);
    this.body.replaceChildren(
      el('p', { class: 'result-pigs', testid: 'result-pigs', text: `남은 돼지 ${info.pigsLeft}마리` }),
    );
    setVisible(this.nextBtn, false);
    this.nextBtn.disabled = true;
    setVisible(this.allClear, false);
    this.open(this.retryBtn);
  }

  private open(focus: HTMLButtonElement): void {
    setVisible(this.root, true);
    this.retryBtn.disabled = false;
    this.mainBtn.disabled = false;
    if (this.root.dataset.result === 'cleared' && !this.nextBtn.classList.contains('is-hidden')) this.nextBtn.disabled = false;
    focus.focus({ preventScroll: true });
  }

  hide(): void {
    setVisible(this.root, false);
  }

  lock(): void {
    this.retryBtn.disabled = true;
    this.nextBtn.disabled = true;
    this.mainBtn.disabled = true;
  }
}
