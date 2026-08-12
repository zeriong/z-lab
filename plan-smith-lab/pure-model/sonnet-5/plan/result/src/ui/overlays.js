import { TOTAL_STAGES } from '../config.js';

/**
 * 계획서 §3: 오버레이(메인/일시정지/클리어/실패)는 모두 DOM으로 canvas 위에 배치한다.
 * 이 모듈은 DOM 조작만 담당하고, 상태 전이 판단은 main.js(상태 머신)에 위임한다.
 *
 * @param {{
 *   onStart: () => void,
 *   onSelectStage: (stageId: number) => void,
 *   onPause: () => void,
 *   onResume: () => void,
 *   onPauseRestart: () => void,
 *   onPauseMain: () => void,
 *   onNextStage: () => void,
 *   onClearMain: () => void,
 *   onFailedRestart: () => void,
 *   onFailedMain: () => void,
 * }} callbacks
 */
export function initOverlays(callbacks) {
  const el = {
    mainMenu: document.getElementById('overlay-main-menu'),
    paused: document.getElementById('overlay-paused'),
    clear: document.getElementById('overlay-clear'),
    failed: document.getElementById('overlay-failed'),
    hud: document.getElementById('hud'),
    stageGrid: document.getElementById('stage-grid'),
    btnStart: document.getElementById('btn-start'),
    btnResume: document.getElementById('btn-resume'),
    btnPauseRestart: document.getElementById('btn-pause-restart'),
    btnPauseMain: document.getElementById('btn-pause-main'),
    btnNextStage: document.getElementById('btn-next-stage'),
    btnClearMain: document.getElementById('btn-clear-main'),
    btnFailedRestart: document.getElementById('btn-failed-restart'),
    btnFailedMain: document.getElementById('btn-failed-main'),
    pauseButton: document.getElementById('pause-button'),
    clearTitle: document.getElementById('clear-title'),
    clearStars: document.getElementById('clear-stars'),
    clearScore: document.getElementById('clear-score'),
  };

  el.btnStart.addEventListener('click', () => callbacks.onStart());
  el.btnResume.addEventListener('click', () => callbacks.onResume());
  el.btnPauseRestart.addEventListener('click', () => callbacks.onPauseRestart());
  el.btnPauseMain.addEventListener('click', () => callbacks.onPauseMain());
  el.btnNextStage.addEventListener('click', () => callbacks.onNextStage());
  el.btnClearMain.addEventListener('click', () => callbacks.onClearMain());
  el.btnFailedRestart.addEventListener('click', () => callbacks.onFailedRestart());
  el.btnFailedMain.addEventListener('click', () => callbacks.onFailedMain());
  el.pauseButton.addEventListener('click', () => callbacks.onPause());

  const allOverlays = [el.mainMenu, el.paused, el.clear, el.failed];

  function hideAllOverlays() {
    for (const o of allOverlays) o.classList.add('hidden');
  }

  /** @param {import('../core/save-data.js').SaveData} save */
  function renderStageGrid(save) {
    el.stageGrid.innerHTML = '';
    for (let stageId = 1; stageId <= TOTAL_STAGES; stageId += 1) {
      const btn = document.createElement('button');
      const locked = stageId > save.unlockedStage;
      btn.type = 'button';
      btn.textContent = String(stageId);
      if (locked) {
        btn.classList.add('locked');
        btn.disabled = true;
      } else {
        const stars = save.stars[stageId] ?? 0;
        const starsEl = document.createElement('span');
        starsEl.className = 'stage-stars';
        starsEl.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        btn.appendChild(document.createElement('br'));
        btn.appendChild(starsEl);
        btn.addEventListener('click', () => callbacks.onSelectStage(stageId));
      }
      el.stageGrid.appendChild(btn);
    }
  }

  /** @param {import('../core/save-data.js').SaveData} save */
  function showMainMenu(save) {
    hideAllOverlays();
    el.hud.classList.add('hidden');
    renderStageGrid(save);
    el.mainMenu.classList.remove('hidden');
  }

  function showPlaying() {
    hideAllOverlays();
    el.hud.classList.remove('hidden');
  }

  function showPaused() {
    el.paused.classList.remove('hidden');
  }

  function hidePaused() {
    el.paused.classList.add('hidden');
  }

  /** @param {{score:number, stars:number, isLast:boolean}} result */
  function showClear({ score, stars, isLast }) {
    el.clearTitle.textContent = isLast ? '축하합니다! 모든 스테이지 클리어!' : '스테이지 클리어!';
    el.btnNextStage.classList.toggle('hidden', isLast);
    el.clearStars.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    el.clearScore.textContent = `SCORE ${score}`;
    el.hud.classList.add('hidden');
    el.clear.classList.remove('hidden');
  }

  function showFailed() {
    el.hud.classList.add('hidden');
    el.failed.classList.remove('hidden');
  }

  return {
    hideAllOverlays,
    showMainMenu,
    showPlaying,
    showPaused,
    hidePaused,
    showClear,
    showFailed,
  };
}
