(function() {
  window.AB = window.AB || {};

  let handlers = null;

  function init(h) {
    handlers = h;

    document.getElementById('btn-start').addEventListener('click', () => handlers.onStart());
    document.getElementById('btn-stages').addEventListener('click', () => handlers.onOpenStages());
    document.getElementById('btn-stages-back').addEventListener('click', () => handlers.onBack());
    document.getElementById('pause-btn').addEventListener('click', () => handlers.onPause());
    document.getElementById('btn-resume').addEventListener('click', () => handlers.onResume());
    document.getElementById('btn-pause-retry').addEventListener('click', () => handlers.onRetry());
    document.getElementById('btn-pause-main').addEventListener('click', () => handlers.onMain());
    document.getElementById('btn-clear-retry').addEventListener('click', () => handlers.onRetry());
    document.getElementById('btn-clear-main').addEventListener('click', () => handlers.onMain());
    document.getElementById('btn-next').addEventListener('click', () => handlers.onNext());
    document.getElementById('btn-fail-retry').addEventListener('click', () => handlers.onRetry());
    document.getElementById('btn-fail-main').addEventListener('click', () => handlers.onMain());
  }

  function showScreen(state) {
    const overlays = [
      'screen-main',
      'screen-stages',
      'screen-pause',
      'screen-clear',
      'screen-fail'
    ];

    for (const id of overlays) {
      document.getElementById(id).classList.add('hidden');
    }

    const pauseBtn = document.getElementById('pause-btn');
    if (state === 'PLAYING') {
      pauseBtn.classList.remove('hidden');
    } else {
      pauseBtn.classList.add('hidden');
    }

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
  }

  function renderStageGrid() {
    const grid = document.getElementById('stage-grid');
    grid.innerHTML = '';

    for (let i = 0; i < 10; i++) {
      const button = document.createElement('button');
      button.className = 'stage-btn';
      button.type = 'button';

      const numSpan = document.createElement('span');
      numSpan.textContent = String(i + 1);
      button.appendChild(numSpan);

      const starsSpan = document.createElement('span');
      button.appendChild(starsSpan);

      const unlocked = window.AB.Storage.isUnlocked(i);
      const record = window.AB.Storage.getRecord(i);

      if (unlocked) {
        if (record) {
          const stars = '★'.repeat(record.stars) + '☆'.repeat(3 - record.stars);
          starsSpan.textContent = stars;
        } else {
          starsSpan.textContent = '☆☆☆';
        }

        button.addEventListener('click', () => {
          handlers.onSelectStage(i);
        });
      } else {
        button.disabled = true;
        button.classList.add('locked');
        starsSpan.textContent = '잠김';
      }

      grid.appendChild(button);
    }
  }

  function setClearInfo(info) {
    const title = document.getElementById('clear-title');
    if (info.isLast) {
      title.textContent = '모든 스테이지 클리어!';
    } else {
      title.textContent = '스테이지 ' + info.stageNumber + ' 클리어!';
    }

    const stars = '★'.repeat(info.stars) + '☆'.repeat(3 - info.stars);
    document.getElementById('clear-stars').textContent = stars;

    const fmt = (n) => n.toLocaleString('ko-KR');
    document.getElementById('clear-score').textContent = '점수 ' + fmt(info.score);
    document.getElementById('clear-bonus').textContent = '남은 새 보너스 +' + fmt(info.bonus);
    document.getElementById('clear-best').textContent = '최고 점수 ' + fmt(info.best);

    const nextBtn = document.getElementById('btn-next');
    if (info.isLast) {
      nextBtn.classList.add('hidden');
    } else {
      nextBtn.classList.remove('hidden');
    }
  }

  function setFailInfo(info) {
    const text = '스테이지 ' + info.stageNumber + ' — 남은 돼지 ' + info.pigsLeft + '마리';
    document.getElementById('fail-text').textContent = text;
  }

  window.AB.UI = {
    init,
    showScreen,
    renderStageGrid,
    setClearInfo,
    setFailInfo
  };
})();
