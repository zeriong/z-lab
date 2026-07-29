// DOM layer: main menu, HUD, pause overlay, result modal. Subscribes to the
// controller via plain callback params (bindControls) and never touches the
// state machine or Matter world directly -- it only asks main.js to do so.

const STORAGE_KEY = 'slingshot-birds-progress';

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { unlocked: 1, bestScores: {} };
    const parsed = JSON.parse(raw);
    return {
      unlocked: parsed.unlocked || 1,
      bestScores: parsed.bestScores || {},
    };
  } catch (e) {
    return { unlocked: 1, bestScores: {} };
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    // storage unavailable (private mode, quota, etc.) -- progress just won't persist
  }
}

export class UI {
  constructor(totalStages) {
    this.totalStages = totalStages;
    this.progress = loadProgress();

    this.mainMenu = document.getElementById('main-menu');
    this.gameScreen = document.getElementById('game-screen');
    this.stageSelect = document.getElementById('stage-select');

    this.hudScore = document.getElementById('hud-score');
    this.hudBirds = document.getElementById('hud-birds');
    this.hudStage = document.getElementById('hud-stage');

    this.pauseBtn = document.getElementById('pause-btn');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.restartBtn = document.getElementById('restart-btn');
    this.mainMenuBtn = document.getElementById('mainmenu-btn');

    this.resultModal = document.getElementById('result-modal');
    this.resultTitle = document.getElementById('result-title');
    this.resultScore = document.getElementById('result-score');
    this.nextStageBtn = document.getElementById('next-stage-btn');
    this.retryBtn = document.getElementById('retry-btn');
    this.mainMenuBtn2 = document.getElementById('mainmenu-btn-2');
  }

  renderStageSelect(onSelect) {
    this.stageSelect.innerHTML = '';
    for (let i = 1; i <= this.totalStages; i++) {
      const btn = document.createElement('button');
      btn.className = 'stage-btn';
      btn.textContent = String(i);

      const locked = i > this.progress.unlocked;
      btn.disabled = locked;
      if (locked) btn.classList.add('locked');

      const best = this.progress.bestScores[i];
      if (best) {
        const badge = document.createElement('span');
        badge.className = 'stage-best';
        badge.textContent = best;
        btn.appendChild(badge);
      }

      btn.addEventListener('click', () => onSelect(i));
      this.stageSelect.appendChild(btn);
    }
  }

  showMain() {
    this.mainMenu.classList.add('active');
    this.gameScreen.classList.remove('active');
    this.pauseOverlay.classList.add('hidden');
    this.resultModal.classList.add('hidden');
  }

  showGame() {
    this.mainMenu.classList.remove('active');
    this.gameScreen.classList.add('active');
  }

  showPauseOverlay() {
    this.pauseOverlay.classList.remove('hidden');
  }

  hidePauseOverlay() {
    this.pauseOverlay.classList.add('hidden');
  }

  showResult(kind, score, stageId, hasNext) {
    this.resultModal.classList.remove('hidden');
    this.resultTitle.textContent = kind === 'CLEARED' ? '스테이지 클리어!' : '실패...';
    this.resultScore.textContent = `점수: ${score}`;
    this.nextStageBtn.style.display = kind === 'CLEARED' && hasNext ? 'inline-block' : 'none';

    if (kind === 'CLEARED') {
      this.progress.unlocked = Math.max(this.progress.unlocked, Math.min(stageId + 1, this.totalStages));
      const prevBest = this.progress.bestScores[stageId] || 0;
      this.progress.bestScores[stageId] = Math.max(prevBest, score);
      saveProgress(this.progress);
    }
  }

  hideResult() {
    this.resultModal.classList.add('hidden');
  }

  updateHUD({ score, birdsLeft, stageId }) {
    this.hudScore.textContent = `점수: ${score}`;
    this.hudBirds.textContent = `남은 새: ${birdsLeft}`;
    this.hudStage.textContent = `스테이지 ${stageId}`;
  }

  bindControls(handlers) {
    this.pauseBtn.addEventListener('click', handlers.onPause);
    this.restartBtn.addEventListener('click', handlers.onRestart);
    this.mainMenuBtn.addEventListener('click', handlers.onMain);
    this.nextStageBtn.addEventListener('click', handlers.onNext);
    this.retryBtn.addEventListener('click', handlers.onRestart);
    this.mainMenuBtn2.addEventListener('click', handlers.onMain);
  }
}
