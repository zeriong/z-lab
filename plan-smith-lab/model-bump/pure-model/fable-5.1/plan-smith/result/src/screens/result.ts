// B7 UI: 클리어(별·점수·다음/다시/메인) / 실패(다시/메인) 오버레이.
import { button, el } from './dom';

export interface ResultData {
  cleared: boolean;
  stageId: number;
  stars: number;
  base: number;
  bonus: number;
  total: number;
  hasNext: boolean;
}

export interface ResultCallbacks {
  onNext(): void;
  onRetry(): void;
  onMain(): void;
}

export interface ResultOverlay {
  root: HTMLElement;
  show(data: ResultData): void;
  hide(): void;
}

export function createResultOverlay(parent: HTMLElement, cb: ResultCallbacks): ResultOverlay {
  const title = el('h2', { id: 'result-title', text: '' });
  const stars = el('div', { id: 'result-stars', class: 'stars-big' });
  const score = el('div', { id: 'result-score', class: 'score-line', text: '0' });
  const sub = el('div', { id: 'result-sub', class: 'score-sub', text: '' });
  const nextBtn = button('btn-next', '다음', 'btn primary', cb.onNext);

  const root = el('div', { id: 'result-overlay', class: 'screen overlay', hidden: '' }, [
    el('div', { class: 'panel' }, [
      title,
      stars,
      score,
      sub,
      el('div', { class: 'row' }, [
        nextBtn,
        button('btn-result-retry', '다시하기', 'btn', cb.onRetry),
        button('btn-result-main', '메인으로', 'btn ghost', cb.onMain),
      ]),
    ]),
  ]);
  parent.append(root);

  return {
    root,
    show: (d) => {
      root.dataset.result = d.cleared ? 'cleared' : 'failed';
      root.dataset.stage = String(d.stageId);
      title.textContent = d.cleared ? `${d.stageId}단계 클리어!` : `${d.stageId}단계 실패`;
      stars.replaceChildren();
      for (let i = 0; i < 3; i++) {
        stars.append(el('span', { class: i < d.stars ? 'on' : 'off', text: '★' }));
      }
      stars.toggleAttribute('hidden', !d.cleared);
      score.textContent = `${d.total.toLocaleString()} 점`;
      sub.textContent = d.cleared
        ? `파괴 ${d.base.toLocaleString()} + 남은 새 보너스 ${d.bonus.toLocaleString()}`
        : '새를 모두 썼지만 돼지가 남았어요';
      nextBtn.toggleAttribute('hidden', !(d.cleared && d.hasNext));
      root.removeAttribute('hidden');
    },
    hide: () => root.setAttribute('hidden', ''),
  };
}
