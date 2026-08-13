(function() {
  'use strict';

  const C = window.AB.C;

  window.AB.UI = {
    init(handlers) {
      document.getElementById('btn-start').addEventListener('click', () => {
        if (handlers.onStart) handlers.onStart();
      });
      document.getElementById('btn-select').addEventListener('click', () => {
        if (handlers.onSelect) handlers.onSelect();
      });
      document.getElementById('btn-select-back').addEventListener('click', () => {
        if (handlers.onBack) handlers.onBack();
      });
      document.getElementById('btn-resume').addEventListener('click', () => {
        if (handlers.onResume) handlers.onResume();
      });
      document.getElementById('btn-restart').addEventListener('click', () => {
        if (handlers.onRestart) handlers.onRestart();
      });
      document.getElementById('btn-main').addEventListener('click', () => {
        if (handlers.onMain) handlers.onMain();
      });
      document.getElementById('pause-btn').addEventListener('click', () => {
        if (handlers.onResume) handlers.onResume();
      });
      document.getElementById('btn-next').addEventListener('click', () => {
        if (handlers.onNext) handlers.onNext();
      });
      document.getElementById('btn-clear-retry').addEventListener('click', () => {
        if (handlers.onRestart) handlers.onRestart();
      });
      document.getElementById('btn-clear-main').addEventListener('click', () => {
        if (handlers.onMain) handlers.onMain();
      });
      document.getElementById('btn-fail-retry').addEventListener('click', () => {
        if (handlers.onRestart) handlers.onRestart();
      });
      document.getElementById('btn-fail-main').addEventListener('click', () => {
        if (handlers.onMain) handlers.onMain();
      });
    },

    show(state) {
      const overlay = document.getElementById('overlay');
      const hud = document.getElementById('hud');
      const pauseBtn = document.getElementById('pause-btn');
      const panelMain = document.getElementById('panel-main');
      const panelSelect = document.getElementById('panel-select');
      const panelPause = document.getElementById('panel-pause');
      const panelClear = document.getElementById('panel-clear');
      const panelFail = document.getElementById('panel-fail');
      const panelError = document.getElementById('panel-error');

      [panelMain, panelSelect, panelPause, panelClear, panelFail, panelError]
        .forEach(p => p.hidden = true);

      if (state === 'MENU') {
        overlay.classList.add('active');
        hud.hidden = true;
        pauseBtn.hidden = true;
        panelMain.hidden = false;
      } else if (state === 'SELECT') {
        overlay.classList.add('active');
        hud.hidden = true;
        pauseBtn.hidden = true;
        panelSelect.hidden = false;
      } else if (state === 'PLAYING') {
        overlay.classList.remove('active');
        hud.hidden = false;
        pauseBtn.hidden = false;
      } else if (state === 'PAUSED') {
        overlay.classList.add('active');
        hud.hidden = false;
        pauseBtn.hidden = true;
        panelPause.hidden = false;
      } else if (state === 'CLEAR') {
        overlay.classList.add('active');
        hud.hidden = false;
        pauseBtn.hidden = true;
        panelClear.hidden = false;
      } else if (state === 'FAIL') {
        overlay.classList.add('active');
        hud.hidden = false;
        pauseBtn.hidden = true;
        panelFail.hidden = false;
      }
    },

    setHUD({ stage, score, birdsLeft }) {
      document.getElementById('hud-stage').textContent = 'STAGE ' + stage;
      document.getElementById('hud-score').textContent = score.toString();
      const birdsContainer = document.getElementById('hud-birds');
      birdsContainer.innerHTML = '';
      birdsLeft.forEach(type => {
        const span = document.createElement('span');
        span.className = 'bird-icon';
        span.style.backgroundColor = C.BIRDS[type].color;
        birdsContainer.appendChild(span);
      });
    },

    renderStageGrid(progress) {
      const grid = document.getElementById('stage-grid');
      grid.innerHTML = '';
      for (let i = 0; i < C.LEVEL_COUNT; i++) {
        const btn = document.createElement('button');
        btn.className = 'stage-btn';
        const numDiv = document.createElement('div');
        numDiv.className = 'stage-num';
        numDiv.textContent = (i + 1).toString();
        btn.appendChild(numDiv);

        const starsDiv = document.createElement('div');
        starsDiv.className = 'stage-stars';
        const stars = progress.stars[i + 1] || 0;
        starsDiv.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        btn.appendChild(starsDiv);

        if (i < progress.unlocked) {
          btn.disabled = false;
          btn.addEventListener('click', () => {
            if (window.AB.Game && window.AB.Game.selectStage) {
              window.AB.Game.selectStage(i);
            }
          });
        } else {
          btn.disabled = true;
          const lockDiv = document.createElement('div');
          lockDiv.className = 'stage-lock';
          lockDiv.textContent = '🔒';
          btn.appendChild(lockDiv);
        }
        grid.appendChild(btn);
      }
    },

    setClear({ score, stars, hasNext }) {
      document.getElementById('clear-score').textContent = 'Score: ' + score;
      document.getElementById('clear-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
      const nextBtn = document.getElementById('btn-next');
      nextBtn.hidden = !hasNext;
    },

    showError(msg) {
      document.getElementById('error-msg').textContent = msg;
      this.show('ERROR');
    }
  };
})();
