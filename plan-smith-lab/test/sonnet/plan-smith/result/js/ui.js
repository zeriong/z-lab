var AB = window.AB || (window.AB = {});

// DOM wiring: HUD text, the right-side pause button (requirement 3),
// pause/clear/fail overlays, the stage-select grid, and localStorage
// progress (Step 4: sequential unlock, no server/account).
AB.UI = (function () {
  const STORAGE_KEY = 'ab_progress_v1';

  let stageLabel, scoreLabel, birdsLabel, pauseBtn;
  let menuOverlay, pauseOverlay, clearOverlay, failOverlay, stageGrid, clearScoreEl, nextBtn;

  function getUnlocked() {
    const v = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    return isNaN(v) ? 0 : v;
  }

  function unlock(index) {
    const cur = getUnlocked();
    if (index > cur) localStorage.setItem(STORAGE_KEY, String(index));
  }

  function buildStageGrid(onSelect) {
    stageGrid.innerHTML = '';
    const unlocked = getUnlocked();
    for (let i = 0; i < AB.STAGES.length; i++) {
      const btn = document.createElement('button');
      btn.textContent = 'Stage ' + (i + 1);
      btn.className = 'stage-button';
      if (i > unlocked) {
        btn.disabled = true;
      } else {
        (function (idx) {
          btn.addEventListener('click', function () { onSelect(idx); });
        })(i);
      }
      stageGrid.appendChild(btn);
    }
  }

  function showOverlay(el) { el.classList.remove('hidden'); }
  function hideOverlay(el) { el.classList.add('hidden'); }

  function init(handlers) {
    stageLabel = document.getElementById('stage-label');
    scoreLabel = document.getElementById('score-label');
    birdsLabel = document.getElementById('birds-label');
    pauseBtn = document.getElementById('pause-btn');
    menuOverlay = document.getElementById('menu-overlay');
    pauseOverlay = document.getElementById('pause-overlay');
    clearOverlay = document.getElementById('clear-overlay');
    failOverlay = document.getElementById('fail-overlay');
    stageGrid = document.getElementById('stage-grid');
    clearScoreEl = document.getElementById('clear-score');
    nextBtn = clearOverlay.querySelector('[data-action="next"]');

    pauseBtn.addEventListener('click', function () { AB.StateMachine.send('pause'); });

    pauseOverlay.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () { handleAction(btn.dataset.action); });
    });
    clearOverlay.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () { handleAction(btn.dataset.action); });
    });
    failOverlay.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () { handleAction(btn.dataset.action); });
    });

    function handleAction(action) {
      if (action === 'resume') {
        AB.StateMachine.send('resume');
      } else if (action === 'retry') {
        AB.StateMachine.send('retry', { stageIndex: handlers.getStageIndex() });
      } else if (action === 'next') {
        const ni = handlers.getStageIndex() + 1;
        if (ni >= AB.STAGES.length) AB.StateMachine.send('menu');
        else AB.StateMachine.send('next', { stageIndex: ni });
      } else if (action === 'menu') {
        AB.StateMachine.send('menu');
      }
    }

    function enterMenu() {
      buildStageGrid(function (idx) { AB.StateMachine.send('start', { stageIndex: idx }); });
      showOverlay(menuOverlay);
      pauseBtn.style.display = 'none';
    }

    AB.StateMachine.onEnter('MENU', enterMenu);
    AB.StateMachine.onExit('MENU', function () {
      hideOverlay(menuOverlay);
      pauseBtn.style.display = '';
    });
    AB.StateMachine.onEnter('PAUSED', function () { showOverlay(pauseOverlay); });
    AB.StateMachine.onExit('PAUSED', function () { hideOverlay(pauseOverlay); });
    AB.StateMachine.onEnter('CLEAR', function () {
      unlock(Math.min(handlers.getStageIndex() + 1, AB.STAGES.length - 1));
      clearScoreEl.textContent = 'Score: ' + handlers.getScore();
      nextBtn.style.display = (handlers.getStageIndex() + 1 >= AB.STAGES.length) ? 'none' : '';
      showOverlay(clearOverlay);
    });
    AB.StateMachine.onExit('CLEAR', function () { hideOverlay(clearOverlay); });
    AB.StateMachine.onEnter('FAIL', function () { showOverlay(failOverlay); });
    AB.StateMachine.onExit('FAIL', function () { hideOverlay(failOverlay); });

    // Initial paint: the machine starts in MENU without ever "entering" it
    // via send(), so the first screen is drawn explicitly once here.
    enterMenu();
  }

  function updateHUD(session) {
    stageLabel.textContent = 'Stage ' + (session.stageIndex + 1);
    scoreLabel.textContent = 'Score: ' + session.score;
    birdsLabel.textContent = 'Birds: ' + session.birdsRemaining;
  }

  return { init: init, updateHUD: updateHUD, getUnlocked: getUnlocked, unlock: unlock };
})();
