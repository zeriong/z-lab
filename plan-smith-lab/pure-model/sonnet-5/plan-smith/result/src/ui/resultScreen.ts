export interface ResultScreenCallbacks {
  onNext?: () => void;
  onRetry: () => void;
  onMainMenu: () => void;
}

/**
 * 스텝 6 — 클리어 결과 화면.
 * quality floor: 클리어 시 다음 스테이지 해금 여부가 화면에 명시되어야 한다.
 */
export function renderClearScreen(
  container: HTMLElement,
  opts: { nextStageUnlocked: boolean },
  callbacks: ResultScreenCallbacks
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'result-screen result-screen--cleared';
  el.setAttribute('data-testid', 'result-cleared');

  const title = document.createElement('h2');
  title.textContent = '스테이지 클리어!';
  el.appendChild(title);

  const unlockMsg = document.createElement('p');
  unlockMsg.textContent = opts.nextStageUnlocked
    ? '다음 스테이지가 해금되었습니다.'
    : '이미 모든 스테이지를 해금했습니다.';
  unlockMsg.setAttribute('data-testid', 'result-unlock-message');
  el.appendChild(unlockMsg);

  if (opts.nextStageUnlocked && callbacks.onNext) {
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '다음 스테이지';
    nextBtn.addEventListener('click', callbacks.onNext);
    el.appendChild(nextBtn);
  }

  const mainMenuBtn = document.createElement('button');
  mainMenuBtn.textContent = '메인으로';
  mainMenuBtn.addEventListener('click', callbacks.onMainMenu);
  el.appendChild(mainMenuBtn);

  container.appendChild(el);
  return el;
}

/**
 * 스텝 6 — 실패 결과 화면.
 * quality floor: 실패 시 재도전 버튼은 즉시 현재 스테이지를 재로드해야 한다.
 */
export function renderFailScreen(container: HTMLElement, callbacks: ResultScreenCallbacks): HTMLElement {
  const el = document.createElement('div');
  el.className = 'result-screen result-screen--failed';
  el.setAttribute('data-testid', 'result-failed');

  const title = document.createElement('h2');
  title.textContent = '실패했습니다';
  el.appendChild(title);

  const retryBtn = document.createElement('button');
  retryBtn.textContent = '다시 도전';
  retryBtn.setAttribute('data-testid', 'result-retry');
  retryBtn.addEventListener('click', callbacks.onRetry);
  el.appendChild(retryBtn);

  const mainMenuBtn = document.createElement('button');
  mainMenuBtn.textContent = '메인으로';
  mainMenuBtn.addEventListener('click', callbacks.onMainMenu);
  el.appendChild(mainMenuBtn);

  container.appendChild(el);
  return el;
}
