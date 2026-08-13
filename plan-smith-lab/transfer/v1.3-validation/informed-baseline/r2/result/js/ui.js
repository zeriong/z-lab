(function() {
  const C = window.AB.C;

  const UI = {
    init(handlers) {
      document.getElementById('btn-start').addEventListener('click', () => handlers.onStart());
      document.getElementById('btn-select').addEventListener('click', () => handlers.onSelect());
      document.getElementById('btn-select-back').addEventListener('click', () => handlers.onBack());
      document.getElementById('btn-resume').addEventListener('click', () => handlers.onResume());
      document.getElementById('btn-restart').addEventListener('click', () => handlers.onRestart());
      document.getElementById('btn-main').addEventListener('click', () => handlers.onMain());
      document.getElementById('btn-clear-retry').addEventListener('click', () => handlers.onRestart());
      document.getElementById('btn-clear-main').addEventListener('click', () => handlers.onMain());
      document.getElementById('btn-next').addEventListener('click', () => handlers.onNext());
      document.getElementById('btn-fail-retry').addEventListener('click', () => handlers.onRestart());
      document.getElementById('btn-fail-main').addEventListener('click', () => handlers.onMain());
      document.getElementById('pause-btn').addEventListener('click', () => handlers.togglePause());
    },

    show(state) {
      const panels = {
        MENU: 'panel-main',
        SELECT: 'panel-select',
        PLAYING: null,
        PAUSED: 'panel-pause',
        CLEAR: 'panel-clear',
        FAIL: 'panel-fail'
      };

      // Hide all panels
      document.querySelectorAll('section').forEach(s => s.hidden = true);

      // Show relevant panel
      const panel = panels[state];
      if (panel) {
        document.getElementById(panel).hidden = false;
      }

      // Control overlay
      const overlay = document.getElementById('overlay');
      overlay.setAttribute('data-empty', panel ? 'false' : 'true');

      // Show/hide HUD
      const hud = document.getElementById('hud');
      hud.style.display = state === 'PLAYING' || state === 'PAUSED' || state === 'CLEAR' || state === 'FAIL' ? 'flex' : 'none';

      // Show/hide pause button
      const pauseBtn = document.getElementById('pause-btn');
      pauseBtn.style.display = state === 'PLAYING' ? 'block' : 'none';
    },

    setHUD(data) {
      document.getElementById('hud-stage').textContent = `STAGE ${data.stage}`;
      document.getElementById('hud-score').textContent = data.score;

      const birdsDiv = document.getElementById('hud-birds');
      birdsDiv.innerHTML = '';
      for (const birdType of data.birdsLeft) {
        const span = document.createElement('span');
        const color = C.BIRDS[birdType].color;
        span.style.backgroundColor = color;
        birdsDiv.appendChild(span);
      }
    },

    renderStageGrid(progress) {
      const grid = document.getElementById('stage-grid');
      grid.innerHTML = '';

      for (let i = 0; i < C.LEVEL_COUNT; i++) {
        const btn = document.createElement('button');
        btn.className = 'stage-btn';
        btn.textContent = i + 1;

        const stars = progress.stars[i + 1] || 0;
        if (stars > 0) {
          const starsDiv = document.createElement('div');
          starsDiv.className = 'stage-stars';
          starsDiv.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
          btn.appendChild(starsDiv);
        }

        if (i >= progress.unlocked) {
          btn.disabled = true;
          const lock = document.createElement('div');
          lock.className = 'stage-lock';
          lock.textContent = '🔒';
          btn.appendChild(lock);
        } else {
          btn.addEventListener('click', () => window.AB.Game.startLevel(i));
        }

        grid.appendChild(btn);
      }
    },

    setClear(data) {
      const starsDiv = document.getElementById('clear-stars');
      const filled = '★'.repeat(data.stars);
      const empty = '☆'.repeat(3 - data.stars);
      starsDiv.textContent = filled + empty;

      document.getElementById('clear-score').textContent = `점수: ${data.score}`;

      const nextBtn = document.getElementById('btn-next');
      nextBtn.style.display = data.hasNext ? 'block' : 'none';
    },

    showError(msg) {
      document.getElementById('error-message').textContent = msg;
      document.getElementById('panel-error').hidden = false;
      document.getElementById('overlay').setAttribute('data-empty', 'false');
    }
  };

  window.AB.UI = UI;
})();
