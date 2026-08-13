// UI management
window.UI = (() => {
  let currentGame = null;

  function bind(game) {
    currentGame = game;

    // Main menu
    document.getElementById('btn-start').addEventListener('click', () => {
      const save = GAME.loadSave();
      const stageId = save.unlocked || 1;
      GAME.loadStage(game, stageId);
      setScreen('game');
    });

    document.getElementById('btn-stages').addEventListener('click', () => {
      setScreen('stages');
      buildStageGrid(game);
    });

    document.getElementById('btn-stages-back').addEventListener('click', () => {
      setScreen('main');
    });

    // Pause
    document.getElementById('btn-pause').addEventListener('click', () => {
      GAME.pause(game);
      setScreen('pause');
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
      GAME.resume(game);
      setScreen('game');
    });

    document.getElementById('btn-retry').addEventListener('click', () => {
      GAME.retry(game);
      setScreen('game');
    });

    document.getElementById('btn-menu').addEventListener('click', () => {
      GAME.toMenu(game);
      setScreen('main');
    });

    // Clear
    document.getElementById('btn-next').addEventListener('click', () => {
      const nextId = game.currentStageId + 1;
      if (nextId <= 10) {
        GAME.loadStage(game, nextId);
        setScreen('game');
      }
    });

    document.getElementById('btn-clear-retry').addEventListener('click', () => {
      GAME.retry(game);
      setScreen('game');
    });

    document.getElementById('btn-clear-menu').addEventListener('click', () => {
      GAME.toMenu(game);
      setScreen('main');
    });

    // Fail
    document.getElementById('btn-fail-retry').addEventListener('click', () => {
      GAME.retry(game);
      setScreen('game');
    });

    document.getElementById('btn-fail-menu').addEventListener('click', () => {
      GAME.toMenu(game);
      setScreen('main');
    });
  }

  function setScreen(name) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.remove('active'));

    if (name === 'game') {
      document.getElementById('hud').style.display = 'flex';
    } else {
      document.getElementById('hud').style.display = 'none';
      const screenId = `screen-${name === 'stages' ? 'stages' : name === 'pause' ? 'pause' : name === 'clear' ? 'clear' : name === 'fail' ? 'fail' : 'main'}`;
      document.getElementById(screenId).classList.add('active');
    }
  }

  function updateHud(game) {
    const stageNum = game.currentStageId;
    document.getElementById('hud-stage').textContent = `스테이지 ${stageNum}`;
    document.getElementById('hud-score').textContent = `점수 ${Math.floor(game.score)}`;

    const birdsContainer = document.getElementById('hud-birds');
    birdsContainer.innerHTML = '';

    const remainingBirds = game.birds.length + (game.shot !== 'ARMED' ? 1 : 0);

    for (let i = 0; i < remainingBirds; i++) {
      const icon = document.createElement('div');
      icon.className = 'bird-icon';

      let birdType = 'red';
      if (game.shot !== 'ARMED') {
        birdType = game.bird.birdType;
      } else if (game.birds.length > 0) {
        birdType = game.birds[0];
      }

      const birdData = BIRD[birdType];
      icon.style.backgroundColor = birdData.color;

      birdsContainer.appendChild(icon);
    }
  }

  function showClear(game) {
    const result = GAME.calculateScore(game);
    const starsHtml = '★'.repeat(result.stars) + '☆'.repeat(3 - result.stars);
    document.getElementById('clear-stars').textContent = starsHtml;
    document.getElementById('clear-score').textContent = `점수: ${Math.floor(result.score)} / ${Math.floor(result.maxScore)}`;

    const nextBtn = document.getElementById('btn-next');
    if (game.currentStageId >= 10) {
      nextBtn.style.display = 'none';
    } else {
      nextBtn.style.display = 'block';
    }

    setScreen('clear');
  }

  function showFail(game) {
    setScreen('fail');
  }

  function buildStageGrid(game) {
    const save = GAME.loadSave();
    const grid = document.getElementById('stage-grid');
    grid.innerHTML = '';

    for (let i = 1; i <= 10; i++) {
      const btn = document.createElement('button');
      btn.className = 'stage-btn';

      const unlocked = i <= (save.unlocked || 1);
      if (!unlocked) {
        btn.classList.add('locked');
      }

      const stage = STAGES[i - 1];
      btn.textContent = i;

      const starsDiv = document.createElement('div');
      starsDiv.className = 'stage-stars';
      const stars = save.stars?.[i] || 0;
      starsDiv.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);

      btn.innerHTML = `<div>${i}</div><div class="stage-stars">${'★'.repeat(stars) + '☆'.repeat(3 - stars)}</div>`;

      if (unlocked) {
        btn.addEventListener('click', () => {
          GAME.loadStage(game, i);
          setScreen('game');
        });
      }

      grid.appendChild(btn);
    }
  }

  return {
    bind,
    setScreen,
    updateHud,
    showClear,
    showFail,
    buildStageGrid
  };
})();
