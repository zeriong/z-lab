// B6/C1: 인게임 HUD — 좌측 상단 점수·남은 새, 우측 상단 ⏸ 버튼(항상 보임).
import { button, el } from './dom';

export interface HudCallbacks {
  onPause(): void;
}

export interface Hud {
  root: HTMLElement;
  show(): void;
  hide(): void;
  setStage(id: number): void;
  setScore(score: number): void;
  setBirds(n: number): void;
}

export function createHud(parent: HTMLElement, cb: HudCallbacks): Hud {
  const stageEl = el('span', { id: 'hud-stage', text: '1단계' });
  const scoreEl = el('span', { id: 'hud-score', text: '0' });
  const birdsEl = el('span', { id: 'hud-birds', text: '🐦 ×0' });
  const pauseBtn = button('btn-pause', '⏸', '', cb.onPause);
  pauseBtn.setAttribute('aria-label', '일시정지');

  const root = el('div', { id: 'hud', hidden: '' }, [
    el('div', { id: 'hud-left', class: 'hud-box' }, [stageEl, scoreEl, birdsEl]),
    pauseBtn,
  ]);
  parent.append(root);

  return {
    root,
    show: () => root.removeAttribute('hidden'),
    hide: () => root.setAttribute('hidden', ''),
    setStage: (id) => {
      stageEl.textContent = `${id}단계`;
    },
    setScore: (score) => {
      scoreEl.textContent = String(score);
    },
    setBirds: (n) => {
      birdsEl.textContent = `🐦 ×${n}`;
    },
  };
}
