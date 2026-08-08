/**
 * §9.3 클리어/실패 오버레이. 일시정지 패널과 동일 컴포넌트 구조, 버튼 구성만 다르다.
 *  - CLEAR: 별 3개 애니메이션, 점수, [다음 스테이지] [다시하기] [메인으로]
 *  - FAIL : [다시하기] [메인으로]
 */

import { formatScore } from '../game/score';
import type { StarCount } from '../core/storage';

export interface ResultCallbacks {
  onNext(): void;
  onRetry(): void;
  onMain(): void;
}

export interface ResultModel {
  cleared: boolean;
  score: number;
  best: number;
  stars: StarCount;
  /** 마지막 스테이지면 [다음] 대신 [스테이지 선택]으로 */
  isLast: boolean;
}

export class ResultOverlay {
  private root: HTMLDivElement;
  private panel: HTMLDivElement;
  private open = false;

  constructor(parent: HTMLElement, private cb: ResultCallbacks) {
    this.root = document.createElement('div');
    this.root.className = 'overlay';
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-labelledby', 'result-title');
    this.root.innerHTML = `
      <div class="panel">
        <h2 id="result-title">스테이지 클리어</h2>
        <div class="stars" data-el="stars" aria-hidden="true">
          <span class="star">★</span><span class="star">★</span><span class="star">★</span>
        </div>
        <div class="score-row" data-el="score"></div>
        <div class="score-row" data-el="best"></div>
        <button data-act="next" class="btn-primary">다음 스테이지</button>
        <button data-act="retry">다시하기</button>
        <button data-act="main">메인으로</button>
      </div>
    `;
    parent.appendChild(this.root);

    const panel = this.root.querySelector<HTMLDivElement>('.panel');
    if (!panel) throw new Error('result panel 누락');
    this.panel = panel;

    this.act('next').addEventListener('click', () => this.cb.onNext());
    this.act('retry').addEventListener('click', () => this.cb.onRetry());
    this.act('main').addEventListener('click', () => this.cb.onMain());
    this.root.addEventListener('keydown', this.onKeyDown);
  }

  private act(name: string): HTMLButtonElement {
    const el = this.root.querySelector<HTMLButtonElement>(`[data-act="${name}"]`);
    if (!el) throw new Error(`result 버튼 누락: ${name}`);
    return el;
  }

  private el(name: string): HTMLElement {
    const el = this.root.querySelector<HTMLElement>(`[data-el="${name}"]`);
    if (!el) throw new Error(`result 요소 누락: ${name}`);
    return el;
  }

  isOpen(): boolean {
    return this.open;
  }

  show(m: ResultModel): void {
    const title = this.root.querySelector('#result-title');
    if (title) title.textContent = m.cleared ? '스테이지 클리어!' : '실패';

    this.el('score').textContent = `점수 ${formatScore(m.score)}`;
    this.el('best').textContent = m.best > 0 ? `최고 ${formatScore(m.best)}` : '';

    const starsEl = this.el('stars');
    starsEl.hidden = !m.cleared;
    const stars = Array.from(starsEl.querySelectorAll<HTMLElement>('.star'));
    stars.forEach((s) => {
      s.classList.remove('on', 'pop');
    });
    if (m.cleared) {
      stars.forEach((s, i) => {
        window.setTimeout(() => {
          s.classList.add('pop');
          if (i < m.stars) s.classList.add('on');
        }, 180 * i + 120);
      });
    }

    const next = this.act('next');
    next.hidden = !m.cleared;
    next.textContent = m.isLast ? '스테이지 선택' : '다음 스테이지';

    this.root.hidden = false;
    this.open = true;
    requestAnimationFrame(() => this.root.classList.add('show'));
    (m.cleared ? next : this.act('retry')).focus();
  }

  hide(): void {
    this.root.classList.remove('show');
    this.root.hidden = true;
    this.open = false;
  }

  destroy(): void {
    this.root.removeEventListener('keydown', this.onKeyDown);
    this.root.remove();
  }

  /** 포커스 트랩 (일시정지와 동일 규약) */
  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.open || e.key !== 'Tab') return;
    const items = Array.from(this.panel.querySelectorAll<HTMLButtonElement>('button')).filter(
      (b) => !b.hidden,
    );
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };
}
