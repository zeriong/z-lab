(function() {
  'use strict';

  const C = window.AB.C;

  const UI = {
    init(handlers) {
      // 메인 화면
      const btnStart = document.getElementById('btn-start');
      if (btnStart) {
        btnStart.addEventListener('click', () => {
          if (handlers.onStart) handlers.onStart();
        });
      }

      const btnSelect = document.getElementById('btn-select');
      if (btnSelect) {
        btnSelect.addEventListener('click', () => {
          if (handlers.onSelect) handlers.onSelect();
        });
      }

      // 스테이지 선택
      const btnSelectBack = document.getElementById('btn-select-back');
      if (btnSelectBack) {
        btnSelectBack.addEventListener('click', () => {
          if (handlers.onBack) handlers.onBack();
        });
      }

      // 정지 화면
      const btnResume = document.getElementById('btn-resume');
      if (btnResume) {
        btnResume.addEventListener('click', () => {
          if (handlers.onResume) handlers.onResume();
        });
      }

      const btnRestart = document.getElementById('btn-restart');
      if (btnRestart) {
        btnRestart.addEventListener('click', () => {
          if (handlers.onRestart) handlers.onRestart();
        });
      }

      const btnMain = document.getElementById('btn-main');
      if (btnMain) {
        btnMain.addEventListener('click', () => {
          if (handlers.onMain) handlers.onMain();
        });
      }

      // 클리어 화면
      const btnNext = document.getElementById('btn-next');
      if (btnNext) {
        btnNext.addEventListener('click', () => {
          if (handlers.onNext) handlers.onNext();
        });
      }

      const btnClearRetry = document.getElementById('btn-clear-retry');
      if (btnClearRetry) {
        btnClearRetry.addEventListener('click', () => {
          if (handlers.onRestart) handlers.onRestart();
        });
      }

      const btnClearMain = document.getElementById('btn-clear-main');
      if (btnClearMain) {
        btnClearMain.addEventListener('click', () => {
          if (handlers.onMain) handlers.onMain();
        });
      }

      // 실패 화면
      const btnFailRetry = document.getElementById('btn-fail-retry');
      if (btnFailRetry) {
        btnFailRetry.addEventListener('click', () => {
          if (handlers.onRestart) handlers.onRestart();
        });
      }

      const btnFailMain = document.getElementById('btn-fail-main');
      if (btnFailMain) {
        btnFailMain.addEventListener('click', () => {
          if (handlers.onMain) handlers.onMain();
        });
      }

      // 일시정지 버튼 (DOM)
      const pauseBtn = document.getElementById('pause-btn');
      if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
          if (window.AB.Game) {
            window.AB.Game.togglePause();
          }
        });
      }
    },

    show(state) {
      const hud = document.getElementById('hud');
      const pauseBtn = document.getElementById('pause-btn');
      const overlay = document.getElementById('overlay');
      const panelMain = document.getElementById('panel-main');
      const panelSelect = document.getElementById('panel-select');
      const panelPlaying = null;
      const panelPause = document.getElementById('panel-pause');
      const panelClear = document.getElementById('panel-clear');
      const panelFail = document.getElementById('panel-fail');
      const panelError = document.getElementById('panel-error');

      // HUD 표시
      if (hud) hud.hidden = (state !== 'PLAYING' && state !== 'PAUSED' && state !== 'CLEAR' && state !== 'FAIL');

      // 일시정지 버튼
      if (pauseBtn) pauseBtn.hidden = (state !== 'PLAYING');

      // 패널 표시
      if (panelMain) panelMain.hidden = (state !== 'MENU');
      if (panelSelect) panelSelect.hidden = (state !== 'SELECT');
      if (panelPause) panelPause.hidden = (state !== 'PAUSED');
      if (panelClear) panelClear.hidden = (state !== 'CLEAR');
      if (panelFail) panelFail.hidden = (state !== 'FAIL');
      if (panelError) panelError.hidden = (state !== 'ERROR');

      // 오버레이 배경
      if (overlay) {
        if (state === 'PLAYING') {
          overlay.setAttribute('data-no-panel', '');
        } else {
          overlay.removeAttribute('data-no-panel');
        }
      }
    },

    setHUD(data) {
      const stageEl = document.getElementById('hud-stage');
      if (stageEl) stageEl.textContent = `STAGE ${data.stage}`;

      const scoreEl = document.getElementById('hud-score');
      if (scoreEl) scoreEl.textContent = Math.floor(data.score).toString();

      const birdsEl = document.getElementById('hud-birds');
      if (birdsEl && data.birdsLeft) {
        birdsEl.innerHTML = '';
        data.birdsLeft.forEach(type => {
          const span = document.createElement('span');
          span.className = 'bird-icon';
          const birdConfig = C.BIRDS[type];
          if (birdConfig) {
            span.style.backgroundColor = birdConfig.color;
          }
          birdsEl.appendChild(span);
        });
      }
    },

    renderStageGrid(progress) {
      const grid = document.getElementById('stage-grid');
      if (!grid) return;

      grid.innerHTML = '';
      for (let i = 0; i < C.LEVEL_COUNT; i++) {
        const btn = document.createElement('button');
        btn.className = 'stage-btn';
        btn.textContent = `${i + 1}`;
        btn.dataset.stage = i;

        const starsDiv = document.createElement('div');
        starsDiv.className = 'stage-stars';

        if (i < progress.unlocked) {
          btn.disabled = false;
          btn.addEventListener('click', () => {
            if (window.AB.Game) {
              window.AB.Game.startLevelByIndex(i);
            }
          });

          const stars = progress.stars && progress.stars[i + 1] ? progress.stars[i + 1] : 0;
          for (let s = 0; s < 3; s++) {
            starsDiv.textContent += (s < stars ? '★' : '☆');
          }
        } else {
          btn.disabled = true;
          starsDiv.textContent = '🔒';
        }

        btn.appendChild(starsDiv);
        grid.appendChild(btn);
      }
    },

    setClear(data) {
      const starsEl = document.getElementById('clear-stars');
      if (starsEl) {
        let starStr = '';
        for (let i = 0; i < 3; i++) {
          starStr += i < data.stars ? '★' : '☆';
        }
        starsEl.textContent = starStr;
      }

      const scoreEl = document.getElementById('clear-score');
      if (scoreEl) scoreEl.textContent = `${Math.floor(data.score)} 점`;

      const btnNext = document.getElementById('btn-next');
      if (btnNext) btnNext.hidden = !data.hasNext;
    },

    showError(msg) {
      const errorMsg = document.getElementById('error-message');
      if (errorMsg) errorMsg.textContent = msg;
    }
  };

  window.AB = window.AB || {};
  window.AB.UI = UI;
})();
