window.AB = window.AB || {};

(function() {
  'use strict';

  let handlers = null;

  function init(h) {
    handlers = h;

    document.getElementById('btn-start').addEventListener('click', function() {
      handlers.onStart();
    });

    document.getElementById('btn-stages').addEventListener('click', function() {
      handlers.onOpenStages();
    });

    document.getElementById('btn-stages-back').addEventListener('click', function() {
      handlers.onBack();
    });

    document.getElementById('pause-btn').addEventListener('click', function() {
      handlers.onPause();
    });

    document.getElementById('btn-resume').addEventListener('click', function() {
      handlers.onResume();
    });

    document.getElementById('btn-pause-retry').addEventListener('click', function() {
      handlers.onRetry();
    });

    document.getElementById('btn-pause-main').addEventListener('click', function() {
      handlers.onMain();
    });

    document.getElementById('btn-clear-retry').addEventListener('click', function() {
      handlers.onRetry();
    });

    document.getElementById('btn-clear-main').addEventListener('click', function() {
      handlers.onMain();
    });

    document.getElementById('btn-fail-retry').addEventListener('click', function() {
      handlers.onRetry();
    });

    document.getElementById('btn-fail-main').addEventListener('click', function() {
      handlers.onMain();
    });

    document.getElementById('btn-next').addEventListener('click', function() {
      handlers.onNext();
    });
  }

  function showScreen(state) {
    document.getElementById('screen-main').classList.add('hidden');
    document.getElementById('screen-stages').classList.add('hidden');
    document.getElementById('screen-pause').classList.add('hidden');
    document.getElementById('screen-clear').classList.add('hidden');
    document.getElementById('screen-fail').classList.add('hidden');
    document.getElementById('pause-btn').classList.add('hidden');

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
    } else if (state === 'PLAYING') {
      document.getElementById('pause-btn').classList.remove('hidden');
    }
  }

  function renderStageGrid() {
    const grid = document.getElementById('stage-grid');
    grid.innerHTML = '';

    for (let i = 0; i < 10; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'stage-btn';

      const numSpan = document.createElement('span');
      numSpan.textContent = String(i + 1);

      const starsSpan = document.createElement('span');

      if (!AB.Storage.isUnlocked(i)) {
        btn.disabled = true;
        btn.classList.add('locked');
        starsSpan.textContent = '잠김';
      } else {
        const record = AB.Storage.getRecord(i);
        if (record) {
          const stars = record.stars;
          starsSpan.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        } else {
          starsSpan.textContent = '☆☆☆';
        }

        btn.addEventListener('click', function() {
          handlers.onSelectStage(i);
        });
      }

      btn.appendChild(numSpan);
      btn.appendChild(starsSpan);
      grid.appendChild(btn);
    }
  }

  function setClearInfo(info) {
    const title = document.getElementById('clear-title');
    const stars = document.getElementById('clear-stars');
    const score = document.getElementById('clear-score');
    const bonus = document.getElementById('clear-bonus');
    const best = document.getElementById('clear-best');
    const nextBtn = document.getElementById('btn-next');

    if (info.isLast) {
      title.textContent = '모든 스테이지 클리어!';
    } else {
      title.textContent = '스테이지 ' + info.stageNumber + ' 클리어!';
    }

    stars.textContent = '★'.repeat(info.stars) + '☆'.repeat(3 - info.stars);
    score.textContent = '점수 ' + info.score.toLocaleString('ko-KR');
    bonus.textContent = '남은 새 보너스 +' + info.bonus.toLocaleString('ko-KR');
    best.textContent = '최고 점수 ' + info.best.toLocaleString('ko-KR');

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
    init: init,
    showScreen: showScreen,
    renderStageGrid: renderStageGrid,
    setClearInfo: setClearInfo,
    setFailInfo: setFailInfo
  };
})();
