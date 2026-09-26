window.AB = window.AB || {};

(function() {
  'use strict';

  let handlers = null;

  function init(h) {
    handlers = h;

    document.getElementById('btn-start').addEventListener('click', () => {
      handlers.onStart();
    });

    document.getElementById('btn-stages').addEventListener('click', () => {
      handlers.onOpenStages();
    });

    document.getElementById('btn-stages-back').addEventListener('click', () => {
      handlers.onBack();
    });

    document.getElementById('pause-btn').addEventListener('click', () => {
      handlers.onPause();
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
      handlers.onResume();
    });

    document.getElementById('btn-pause-retry').addEventListener('click', () => {
      handlers.onRetry();
    });

    document.getElementById('btn-pause-main').addEventListener('click', () => {
      handlers.onMain();
    });

    document.getElementById('btn-clear-retry').addEventListener('click', () => {
      handlers.onRetry();
    });

    document.getElementById('btn-clear-main').addEventListener('click', () => {
      handlers.onMain();
    });

    document.getElementById('btn-fail-retry').addEventListener('click', () => {
      handlers.onRetry();
    });

    document.getElementById('btn-fail-main').addEventListener('click', () => {
      handlers.onMain();
    });

    document.getElementById('btn-next').addEventListener('click', () => {
      handlers.onNext();
    });
  }

  function showScreen(state) {
    document.getElementById('screen-main').classList.add('hidden');
    document.getElementById('screen-stages').classList.add('hidden');
    document.getElementById('screen-pause').classList.add('hidden');
    document.getElementById('screen-clear').classList.add('hidden');
    document.getElementById('screen-fail').classList.add('hidden');

    if (state === 'MAIN') {
      document.getElementById('screen-main').classList.remove('hidden');
    } else if (state === 'STAGE_SELECT') {
      document.getElementById('screen-stages').classList.remove('hidden');
    } else if (state === 'PAUSED') {
      document.getElementById('screen-pause').classList.remove('hidden');
    } else if (state === 'CLEARED') {
      document.getElementById('screen-clear').classList.remove('hidden');
    } else if (state === 'FAILED') {
      document.getElementById('screen-fail').classList.remove('hidden');
    }

    const pauseBtn = document.getElementById('pause-btn');
    if (state === 'PLAYING') {
      pauseBtn.classList.remove('hidden');
    } else {
      pauseBtn.classList.add('hidden');
    }
  }

  function renderStageGrid() {
    const grid = document.getElementById('stage-grid');
    grid.innerHTML = '';

    for (let i = 0; i < 10; i++) {
      const btn = document.createElement('button');
      btn.className = 'stage-btn';
      btn.type = 'button';

      const numSpan = document.createElement('span');
      numSpan.textContent = String(i + 1);
      btn.appendChild(numSpan);

      const starsSpan = document.createElement('span');
      const unlocked = AB.Storage.isUnlocked(i);

      if (unlocked) {
        const record = AB.Storage.getRecord(i);
        if (record) {
          const stars = '★'.repeat(record.stars) + '☆'.repeat(3 - record.stars);
          starsSpan.textContent = stars;
        } else {
          starsSpan.textContent = '☆☆☆';
        }
      } else {
        btn.disabled = true;
        btn.classList.add('locked');
        starsSpan.textContent = '잠김';
      }

      btn.appendChild(starsSpan);

      if (unlocked) {
        btn.addEventListener('click', () => {
          handlers.onSelectStage(i);
        });
      }

      grid.appendChild(btn);
    }
  }

  function setClearInfo(info) {
    const titleEl = document.getElementById('clear-title');
    if (info.isLast) {
      titleEl.textContent = '모든 스테이지 클리어!';
    } else {
      titleEl.textContent = '스테이지 ' + info.stageNumber + ' 클리어!';
    }

    const starsEl = document.getElementById('clear-stars');
    starsEl.textContent = '★'.repeat(info.stars) + '☆'.repeat(3 - info.stars);

    const scoreEl = document.getElementById('clear-score');
    scoreEl.textContent = '점수 ' + info.score.toLocaleString('ko-KR');

    const bonusEl = document.getElementById('clear-bonus');
    bonusEl.textContent = '남은 새 보너스 +' + info.bonus.toLocaleString('ko-KR');

    const bestEl = document.getElementById('clear-best');
    bestEl.textContent = '최고 점수 ' + info.best.toLocaleString('ko-KR');

    const nextBtn = document.getElementById('btn-next');
    if (info.isLast) {
      nextBtn.classList.add('hidden');
    } else {
      nextBtn.classList.remove('hidden');
    }
  }

  function setFailInfo(info) {
    const failText = document.getElementById('fail-text');
    failText.textContent = '스테이지 ' + info.stageNumber + ' — 남은 돼지 ' + info.pigsLeft + '마리';
  }

  AB.UI = {
    init,
    showScreen,
    renderStageGrid,
    setClearInfo,
    setFailInfo
  };
})();
