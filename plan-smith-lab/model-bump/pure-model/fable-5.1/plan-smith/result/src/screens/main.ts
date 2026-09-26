// D2: 메인 화면 — 제목·시작·이어하기·음소거.
import { button, el } from './dom';

export interface MainScreenCallbacks {
  onStart(): void;
  onContinue(): void;
  onToggleMute(): void;
}

export interface MainScreen {
  root: HTMLElement;
  show(): void;
  hide(): void;
  setMuted(muted: boolean): void;
  /** 이어할 스테이지(해제된 최고 단계). 1이면 "이어하기"를 숨긴다. */
  setContinue(stageId: number): void;
}

export function createMainScreen(parent: HTMLElement, cb: MainScreenCallbacks): MainScreen {
  const muteBtn = button('btn-mute', '🔊', 'btn icon ghost', cb.onToggleMute);
  muteBtn.setAttribute('aria-label', '음소거');
  const continueBtn = button('btn-continue', '이어하기', 'btn', cb.onContinue);

  const root = el('div', { id: 'main-screen', class: 'screen' }, [
    el('h1', { class: 'title', text: 'Slingshot Birds' }),
    el('p', { class: 'subtitle', text: '새를 당겨서 돼지를 모두 없애자' }),
    el('div', { class: 'row' }, [button('btn-start', '시작', 'btn primary', cb.onStart), continueBtn]),
    el('div', { class: 'mute-row' }, [muteBtn]),
  ]);
  parent.append(root);

  return {
    root,
    show: () => root.removeAttribute('hidden'),
    hide: () => root.setAttribute('hidden', ''),
    setMuted: (muted) => {
      muteBtn.textContent = muted ? '🔇' : '🔊';
      muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    },
    setContinue: (stageId) => {
      continueBtn.textContent = `이어하기 (${stageId}단계)`;
      continueBtn.toggleAttribute('hidden', stageId <= 1);
    },
  };
}
