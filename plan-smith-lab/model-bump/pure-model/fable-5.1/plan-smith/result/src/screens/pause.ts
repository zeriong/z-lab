// C2: 일시정지 오버레이 — 계속하기 / 다시하기 / 메인으로.
import { button, el } from './dom';

export interface PauseCallbacks {
  onResume(): void;
  onRetry(): void;
  onMain(): void;
}

export interface PauseOverlay {
  root: HTMLElement;
  show(): void;
  hide(): void;
}

export function createPauseOverlay(parent: HTMLElement, cb: PauseCallbacks): PauseOverlay {
  const root = el('div', { id: 'pause-overlay', class: 'screen overlay', hidden: '' }, [
    el('div', { class: 'panel' }, [
      el('h2', { text: '일시정지' }),
      button('btn-resume', '계속하기', 'btn primary', cb.onResume),
      button('btn-retry', '다시하기', 'btn', cb.onRetry),
      button('btn-main', '메인으로', 'btn ghost', cb.onMain),
    ]),
  ]);
  parent.append(root);
  return {
    root,
    show: () => root.removeAttribute('hidden'),
    hide: () => root.setAttribute('hidden', ''),
  };
}
