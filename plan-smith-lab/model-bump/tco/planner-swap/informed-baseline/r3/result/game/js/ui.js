(function() {
  window.AB = window.AB || {};

  let handlers = null;

  AB.UI = {
    init: function(h) {
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

      document.getElementById('btn-next').addEventListener('click', function() {
        handlers.onNext();
      });

      document.getElementById('btn-fail-retry').addEventListener('click', function() {
        handlers.onRetry();
      });

      document.getElementById('btn-fail-main').addEventListener('click', function() {
        handlers.onMain();
      });
    },

    showScreen: function(state) {
      const screens = ['screen-main', 'screen-stages', 'screen-pause', 'screen-clear', 'screen-fail'];
      for (let i = 0; i < screens.length; i++) {
        document.getElementById(screens[i]).classList.add('hidden');
      }

      let screenId = null;
      if (state === 'MAIN') {
        screenId = 'screen-main';
      } else if (state === 'STAGE_SELECT') {
        screenId = 'screen-stages';
      } else if (state === 'PAUSED') {
        screenId = 'screen-pause';
      } else if (state === 'CLEARED') {
        screenId = 'screen-clear';
      } else if (state === 'FAILED') {
        screenId = 'screen-fail';
      }

      if (screenId) {
        document.getElementById(screenId).classList.remove('hidden');
      }

      if (state === 'PLAYING') {
        document.getElementById('pause-btn').classList.remove('hidden');
      } else {
        document.getElementById('pause-btn').classList.add('hidden');
      }
    },

    renderStageGrid: function() {
      const grid = document.getElementById('stage-grid');
      grid.innerHTML = '';

      for (let i = 0; i < 10; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'stage-btn';

        const numSpan = document.createElement('span');
        numSpan.textContent = String(i + 1);

        const starsSpan = document.createElement('span');
        const unlocked = AB.Storage.isUnlocked(i);
        if (unlocked) {
          const record = AB.Storage.getRecord(i);
          if (record) {
            starsSpan.textContent = '★'.repeat(record.stars) + '☆'.repeat(3 - record.stars);
          } else {
            starsSpan.textContent = '☆☆☆';
          }
        } else {
          starsSpan.textContent = '잠김';
        }

        btn.appendChild(numSpan);
        btn.appendChild(starsSpan);

        if (!unlocked) {
          btn.disabled = true;
          btn.classList.add('locked');
        } else {
          btn.addEventListener('click', (function(idx) {
            return function() {
              handlers.onSelectStage(idx);
            };
          })(i));
        }

        grid.appendChild(btn);
      }
    },

    setClearInfo: function(info) {
      const title = document.getElementById('clear-title');
      if (info.isLast) {
        title.textContent = '모든 스테이지 클리어!';
      } else {
        title.textContent = '스테이지 ' + info.stageNumber + ' 클리어!';
      }

      const starsDiv = document.getElementById('clear-stars');
      starsDiv.textContent = '★'.repeat(info.stars) + '☆'.repeat(3 - info.stars);

      const scoreP = document.getElementById('clear-score');
      scoreP.textContent = '점수 ' + info.score.toLocaleString('ko-KR');

      const bonusP = document.getElementById('clear-bonus');
      bonusP.textContent = '남은 새 보너스 +' + info.bonus.toLocaleString('ko-KR');

      const bestP = document.getElementById('clear-best');
      bestP.textContent = '최고 점수 ' + info.best.toLocaleString('ko-KR');

      const nextBtn = document.getElementById('btn-next');
      if (info.isLast) {
        nextBtn.classList.add('hidden');
      } else {
        nextBtn.classList.remove('hidden');
      }
    },

    setFailInfo: function(info) {
      const failText = document.getElementById('fail-text');
      failText.textContent = '스테이지 ' + info.stageNumber + ' — 남은 돼지 ' + info.pigsLeft + '마리';
    }
  };
})();
