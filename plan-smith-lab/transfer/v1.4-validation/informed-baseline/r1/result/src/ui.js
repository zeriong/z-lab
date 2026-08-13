// UI management
const UI = {
  bind(game) {
    const btn = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', () => fn());
    };

    // Menu
    btn('btn-start', () => {
      const startStage = game.save.unlocked || 1;
      GAME.loadStage(game, startStage);
      UI.setScreen('playing');
    });

    btn('btn-stages', () => {
      UI.buildStageGrid();
      UI.setScreen('stages');
    });

    btn('btn-stages-back', () => {
      UI.setScreen('main');
    });

    // Pause
    btn('btn-pause', () => {
      GAME.pause(game);
    });

    btn('btn-resume', () => {
      GAME.resume(game);
    });

    btn('btn-retry', () => {
      GAME.retry(game);
      UI.setScreen('playing');
    });

    btn('btn-menu', () => {
      GAME.toMenu(game);
    });

    // Clear
    btn('btn-next', () => {
      if (game.stageId < 10) {
        GAME.loadStage(game, game.stageId + 1);
        UI.setScreen('playing');
      }
    });

    btn('btn-clear-retry', () => {
      GAME.retry(game);
      UI.setScreen('playing');
    });

    btn('btn-clear-menu', () => {
      GAME.toMenu(game);
    });

    // Fail
    btn('btn-fail-retry', () => {
      GAME.retry(game);
      UI.setScreen('playing');
    });

    btn('btn-fail-menu', () => {
      GAME.toMenu(game);
    });

    // Stage grid
    document.addEventListener('click', e => {
      if (e.target.classList.contains('stage-button') && !e.target.disabled) {
        const stageId = parseInt(e.target.dataset.stageId);
        GAME.loadStage(game, stageId);
        UI.setScreen('playing');
      }
    });
  },

  setScreen(name) {
    const screens = document.querySelectorAll('.screen');
    for (let screen of screens) {
      screen.classList.remove('active');
    }

    if (name === 'playing') {
      const hud = document.getElementById('hud');
      if (hud) hud.classList.add('active');
    } else {
      const hud = document.getElementById('hud');
      if (hud) hud.classList.remove('active');

      const screenId = `screen-${name}`;
      const screen = document.getElementById(screenId);
      if (screen) screen.classList.add('active');
    }
  },

  updateHud(game) {
    const stageEl = document.getElementById('hud-stage');
    if (stageEl) stageEl.textContent = `스테이지 ${game.stageId}`;

    const scoreEl = document.getElementById('hud-score');
    if (scoreEl) scoreEl.textContent = `점수 ${Math.floor(game.score)}`;

    const birdsEl = document.getElementById('hud-birds');
    if (birdsEl) {
      birdsEl.innerHTML = '';
      const remaining = game.birds.length - game.currentBirdIdx - 1;
      for (let i = 0; i < remaining; i++) {
        const birdType = game.birds[game.currentBirdIdx + 1 + i].birdType;
        const spec = BIRD[birdType];
        const icon = document.createElement('div');
        icon.className = 'bird-icon';
        icon.style.backgroundColor = spec.color;
        birdsEl.appendChild(icon);
      }
    }
  },

  showClear(game) {
    const stars = game.score >= game.maxScore * 0.75 ? 3 : game.score >= game.maxScore * 0.5 ? 2 : 1;

    const starsEl = document.getElementById('clear-stars');
    if (starsEl) starsEl.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);

    const scoreEl = document.getElementById('clear-score');
    if (scoreEl) scoreEl.textContent = `점수: ${Math.floor(game.score)} / ${game.maxScore}`;

    const nextBtn = document.getElementById('btn-next');
    if (nextBtn) {
      if (game.stageId >= 10) {
        nextBtn.style.display = 'none';
      } else {
        nextBtn.style.display = 'inline-block';
      }
    }

    UI.setScreen('clear');
  },

  showFail(game) {
    UI.setScreen('fail');
  },

  buildStageGrid() {
    const grid = document.getElementById('stage-grid');
    if (!grid) return;

    grid.innerHTML = '';
    for (let stage of STAGES) {
      const btn = document.createElement('button');
      btn.className = 'stage-button';
      btn.dataset.stageId = stage.id;

      const save = GAME._loadSave();
      const isUnlocked = save.unlocked >= stage.id;

      if (!isUnlocked) btn.disabled = true;

      const stars = save.stars[stage.id] || 0;
      btn.innerHTML = `
        <div>${stage.id}. ${stage.name}</div>
        <div class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      `;
      grid.appendChild(btn);
    }
  }
};
