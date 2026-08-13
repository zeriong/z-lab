// UI and screen management
const UI = {
  bind: (game) => {
    // Main screen
    document.getElementById('btn-start').addEventListener('click', () => {
      GAME.loadStage(game, game.save.unlocked);
      UI.setScreen('game');
    });

    document.getElementById('btn-stages').addEventListener('click', () => {
      UI.buildStageGrid(game);
      UI.setScreen('stages');
    });

    // Stages screen
    document.getElementById('btn-stages-back').addEventListener('click', () => {
      UI.setScreen('main');
    });

    // Pause screen
    document.getElementById('btn-pause').addEventListener('click', () => {
      GAME.pause(game);
      UI.setScreen('pause');
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
      GAME.resume(game);
      UI.setScreen('game');
    });

    document.getElementById('btn-retry').addEventListener('click', () => {
      GAME.retry(game);
      UI.setScreen('game');
    });

    document.getElementById('btn-menu').addEventListener('click', () => {
      GAME.toMenu(game);
      UI.setScreen('main');
    });

    // Clear screen
    document.getElementById('btn-next').addEventListener('click', () => {
      if (game.stageId < 10) {
        GAME.loadStage(game, game.stageId + 1);
        UI.setScreen('game');
      }
    });

    document.getElementById('btn-clear-retry').addEventListener('click', () => {
      GAME.retry(game);
      UI.setScreen('game');
    });

    document.getElementById('btn-clear-menu').addEventListener('click', () => {
      GAME.toMenu(game);
      UI.setScreen('main');
    });

    // Fail screen
    document.getElementById('btn-fail-retry').addEventListener('click', () => {
      GAME.retry(game);
      UI.setScreen('game');
    });

    document.getElementById('btn-fail-menu').addEventListener('click', () => {
      GAME.toMenu(game);
      UI.setScreen('main');
    });

    // Visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && game.state === 'PLAYING') {
        GAME.pause(game);
        UI.setScreen('pause');
      }
    });

    // Audio init
    document.addEventListener('pointerdown', () => {
      try {
        SFX.initAudio();
      } catch (e) {}
    }, { once: true });
  },

  setScreen: (name) => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const hudElement = document.getElementById('hud');
    if (name === 'game') {
      document.getElementById('game-canvas').style.display = 'block';
      hudElement.classList.add('active');
    } else {
      document.getElementById('game-canvas').style.display = 'block';
      hudElement.classList.remove('active');
      const screenMap = {
        main: 'screen-main',
        stages: 'screen-stages',
        pause: 'screen-pause',
        clear: 'screen-clear',
        fail: 'screen-fail'
      };
      if (screenMap[name]) {
        document.getElementById(screenMap[name]).classList.add('active');
      }
    }
  },

  updateHud: (game) => {
    document.getElementById('hud-stage').textContent = `스테이지 ${game.stageId}`;
    document.getElementById('hud-score').textContent = `점수 ${U.fmt(game.score)}`;

    const birdsContainer = document.getElementById('hud-birds');
    birdsContainer.innerHTML = '';
    const birds = game.birdQueue;
    for (let bird of birds) {
      const icon = document.createElement('div');
      icon.className = 'bird-icon';
      icon.style.backgroundColor = BIRD[bird].color;
      birdsContainer.appendChild(icon);
    }
  },

  buildStageGrid: (game) => {
    const grid = document.getElementById('stage-grid');
    grid.innerHTML = '';
    for (let i = 1; i <= 10; i++) {
      const btn = document.createElement('button');
      const stage = STAGES[i - 1];
      const stars = game.save.stars[i] || 0;
      btn.textContent = `${i}\n${'★'.repeat(stars)}`;
      btn.disabled = i > game.save.unlocked;
      if (!btn.disabled) {
        btn.addEventListener('click', () => {
          GAME.loadStage(game, i);
          UI.setScreen('game');
        });
      }
      grid.appendChild(btn);
    }
  },

  showClear: (game) => {
    const stars = game.save.stars[game.stageId] || 0;
    document.getElementById('clear-stars').textContent = '★'.repeat(stars);
    document.getElementById('clear-score').textContent = `점수: ${U.fmt(game.score)} / ${U.fmt(game.maxScore)}`;
    if (game.stageId === 10) {
      document.getElementById('btn-next').style.display = 'none';
    } else {
      document.getElementById('btn-next').style.display = 'block';
    }
    UI.setScreen('clear');
  },

  showFail: (game) => {
    UI.setScreen('fail');
  }
};
