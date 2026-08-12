export interface PauseOverlayCallbacks {
  onRestart: () => void;
  onMainMenu: () => void;
}

/**
 * 스텝 7 — 일시정지 오버레이.
 * quality floor: 정확히 "다시하기"/"메인으로" 두 버튼만 존재한다(가정: 재개(RESUME) 버튼 없음).
 * Paused 전이의 Runner 정지 부수효과는 App.ts에서 처리한다(리스크 참조).
 */
export class PauseOverlay {
  readonly el: HTMLElement;

  constructor(container: HTMLElement, callbacks: PauseOverlayCallbacks) {
    this.el = document.createElement('div');
    this.el.className = 'pause-overlay';
    this.el.setAttribute('data-testid', 'pause-overlay');

    const restartBtn = document.createElement('button');
    restartBtn.textContent = '다시하기';
    restartBtn.setAttribute('data-testid', 'pause-restart');
    restartBtn.addEventListener('click', callbacks.onRestart);

    const mainMenuBtn = document.createElement('button');
    mainMenuBtn.textContent = '메인으로';
    mainMenuBtn.setAttribute('data-testid', 'pause-main-menu');
    mainMenuBtn.addEventListener('click', callbacks.onMainMenu);

    this.el.appendChild(restartBtn);
    this.el.appendChild(mainMenuBtn);
    container.appendChild(this.el);
  }

  destroy(): void {
    this.el.remove();
  }
}

export function createPauseButton(container: HTMLElement, onPause: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = '일시정지';
  btn.className = 'pause-button pause-button--right';
  btn.setAttribute('data-testid', 'pause-button');
  btn.addEventListener('click', onPause);
  container.appendChild(btn);
  return btn;
}
