// src/ui.js
// UI, 화면 전환, HUD 갱신 (§13.2)
// 의존성: GAME, C

const UI = {
  bind(game) {
    // 메인 화면
    document.getElementById('btn-start').addEventListener('click', () => {
      game.loadStage(game.unlockedStage);
      UI.setScreen('playing');
    });

    document.getElementById('btn-stages').addEventListener('click', () => {
      UI.setScreen('stages');
      UI.buildStageGrid(game);
    });

    // 스테이지 선택
    document.getElementById('btn-stages-back').addEventListener('click', () => {
      UI.setScreen('main');
    });

    // 일시정지 화면
    document.getElementById('btn-pause').addEventListener('click', () => {
      if (game.state === 'PLAYING') {
        game.pause();
        UI.setScreen('pause');
      }
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
      game.resume();
      UI.setScreen('playing');
    });

    document.getElementById('btn-retry').addEventListener('click', () => {
      game.retry();
      UI.setScreen('playing');
    });

    document.getElementById('btn-menu').addEventListener('click', () => {
      game.toMenu();
      UI.setScreen('main');
    });

    // 클리어 화면
    document.getElementById('btn-next').addEventListener('click', () => {
      if (game.stageId < 10) {
        game.loadStage(game.stageId + 1);
        UI.setScreen('playing');
      }
    });

    document.getElementById('btn-clear-retry').addEventListener('click', () => {
      game.retry();
      UI.setScreen('playing');
    });

    document.getElementById('btn-clear-menu').addEventListener('click', () => {
      game.toMenu();
      UI.setScreen('main');
    });

    // 실패 화면
    document.getElementById('btn-fail-retry').addEventListener('click', () => {
      game.retry();
      UI.setScreen('playing');
    });

    document.getElementById('btn-fail-menu').addEventListener('click', () => {
      game.toMenu();
      UI.setScreen('main');
    });
  },

  setScreen(name) {
    const screens = document.querySelectorAll('.screen');

    if (name === 'playing') {
      // 게임 플레이 화면: 모든 오버레이 숨김, HUD만 표시
      screens.forEach(s => s.classList.remove('active'));
      document.getElementById('hud').style.display = 'flex';
    } else if (name === 'main') {
      screens.forEach(s => s.classList.remove('active'));
      document.getElementById('screen-main').classList.add('active');
      document.getElementById('hud').style.display = 'none';
    } else if (name === 'stages') {
      screens.forEach(s => s.classList.remove('active'));
      document.getElementById('screen-stages').classList.add('active');
      document.getElementById('hud').style.display = 'none';
    } else if (name === 'pause') {
      screens.forEach(s => s.classList.remove('active'));
      document.getElementById('screen-pause').classList.add('active');
      document.getElementById('hud').style.display = 'flex';
    } else if (name === 'clear') {
      screens.forEach(s => s.classList.remove('active'));
      document.getElementById('screen-clear').classList.add('active');
      document.getElementById('hud').style.display = 'flex';
    } else if (name === 'fail') {
      screens.forEach(s => s.classList.remove('active'));
      document.getElementById('screen-fail').classList.add('active');
      document.getElementById('hud').style.display = 'flex';
    }
  },

  updateHud(game) {
    const stageEl = document.getElementById('hud-stage');
    const scoreEl = document.getElementById('hud-score');
    const birdsEl = document.getElementById('hud-birds');

    stageEl.textContent = `스테이지 ${game.stageId}`;
    scoreEl.textContent = `점수 ${U.fmt(game.score)}`;

    // 남은 새 아이콘
    birdsEl.innerHTML = '';
    const remaining = game.birds.length - game.birdIndex;
    for (let i = 0; i < remaining; i++) {
      const birdType = game.birds[game.birdIndex + i];
      const birdInfo = BIRD[birdType];
      const icon = document.createElement('div');
      icon.style.width = '24px';
      icon.style.height = '24px';
      icon.style.borderRadius = '50%';
      icon.style.backgroundColor = birdInfo.color;
      icon.style.border = '2px solid black';
      icon.title = birdType;
      birdsEl.appendChild(icon);
    }
  },

  buildStageGrid(game) {
    const grid = document.getElementById('stage-grid');
    grid.innerHTML = '';

    try {
      const saved = JSON.parse(localStorage[C.SAVE_KEY] || '{}');
      const unlockedLevel = saved.unlocked || 1;
      const stars = saved.stars || {};

      for (let i = 1; i <= 10; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;

        if (i <= unlockedLevel) {
          btn.disabled = false;
          const starCount = stars[i] || 0;
          if (starCount > 0) {
            btn.textContent = i + '\n' + '★'.repeat(starCount);
          }
        } else {
          btn.disabled = true;
          btn.textContent = '🔒';
        }

        btn.addEventListener('click', () => {
          if (!btn.disabled) {
            game.loadStage(i);
            UI.setScreen('playing');
          }
        });

        grid.appendChild(btn);
      }
    } catch (e) {
      // 저장 로드 실패 시 1~10 모두 해금
      for (let i = 1; i <= 10; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.addEventListener('click', () => {
          game.loadStage(i);
          UI.setScreen('playing');
        });
        grid.appendChild(btn);
      }
    }
  },

  showClear(game, stars) {
    const starEl = document.getElementById('clear-stars');
    const scoreEl = document.getElementById('clear-score');

    starEl.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    scoreEl.textContent = `점수: ${U.fmt(game.score)}`;

    UI.setScreen('clear');
  },

  showFail(game) {
    UI.setScreen('fail');
  }
};
