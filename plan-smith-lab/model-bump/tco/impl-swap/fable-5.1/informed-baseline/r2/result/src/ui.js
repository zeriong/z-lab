// ui.js — 화면 전환·HUD·스테이지 그리드·결과 표시. 참조 전역: GAME, C, U, BIRD
(function () {
  'use strict';

  var el = {};
  var lastHud = { stage: '', score: '', birds: '' };

  function $(id) { return document.getElementById(id); }

  function cache() {
    el.hud = $('hud');
    el.hudStage = $('hud-stage');
    el.hudScore = $('hud-score');
    el.hudBirds = $('hud-birds');
    el.btnPause = $('btn-pause');

    el.screenMain = $('screen-main');
    el.btnStart = $('btn-start');
    el.btnStages = $('btn-stages');

    el.screenStages = $('screen-stages');
    el.stageGrid = $('stage-grid');
    el.btnStagesBack = $('btn-stages-back');

    el.screenPause = $('screen-pause');
    el.btnResume = $('btn-resume');
    el.btnRetry = $('btn-retry');
    el.btnMenu = $('btn-menu');

    el.screenClear = $('screen-clear');
    el.clearStars = $('clear-stars');
    el.clearScore = $('clear-score');
    el.btnNext = $('btn-next');
    el.btnClearRetry = $('btn-clear-retry');
    el.btnClearMenu = $('btn-clear-menu');

    el.screenFail = $('screen-fail');
    el.failMsg = $('fail-msg');
    el.btnFailRetry = $('btn-fail-retry');
    el.btnFailMenu = $('btn-fail-menu');
  }

  var SCREEN_IDS = {
    main: 'screen-main',
    stages: 'screen-stages',
    pause: 'screen-pause',
    clear: 'screen-clear',
    fail: 'screen-fail'
  };

  function setScreen(name) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) {
      screens[i].classList.remove('active');
    }
    var id = SCREEN_IDS[name];
    if (id) {
      var target = $(id);
      if (target) target.classList.add('active');
    }
  }

  function setHudVisible(on) {
    if (!el.hud) return;
    if (on) el.hud.classList.add('active');
    else el.hud.classList.remove('active');
  }

  function updateHud(game) {
    if (!el.hud) return;
    var stageText = '스테이지 ' + game.stageId;
    var scoreText = '점수 ' + U.fmt(game.score);

    // 남은 새: 손에 든 새 + 큐
    var list = [];
    if (game.birdType && (game.shot === 'ARMED' || game.shot === 'DRAG' || game.shot === 'FLYING')) {
      list.push(game.birdType);
    }
    for (var i = 0; i < game.birdQueue.length; i++) list.push(game.birdQueue[i]);
    var birdsSig = list.join(',');

    if (stageText !== lastHud.stage) {
      el.hudStage.textContent = stageText;
      lastHud.stage = stageText;
    }
    if (scoreText !== lastHud.score) {
      el.hudScore.textContent = scoreText;
      lastHud.score = scoreText;
    }
    if (birdsSig !== lastHud.birds) {
      el.hudBirds.innerHTML = '';
      for (var k = 0; k < list.length; k++) {
        var dot = document.createElement('span');
        dot.className = 'hud-bird';
        var spec = BIRD[list[k]] || BIRD.red;
        dot.style.background = spec.color;
        el.hudBirds.appendChild(dot);
      }
      lastHud.birds = birdsSig;
    }
  }

  function starsText(n) {
    var s = '';
    for (var i = 1; i <= 3; i++) s += (i <= n ? '★' : '☆');
    return s;
  }

  function showClear(game) {
    el.clearStars.textContent = starsText(game.resultStars);
    el.clearScore.textContent = '점수 ' + U.fmt(game.score);
    if (game.stageId >= 10) el.btnNext.classList.add('hidden');
    else el.btnNext.classList.remove('hidden');
    setScreen('clear');
  }

  function showFail(game) {
    el.failMsg.textContent = '새를 모두 사용했습니다';
    setScreen('fail');
  }

  function buildStageGrid(game) {
    var grid = el.stageGrid;
    grid.innerHTML = '';
    var save = game.save;
    for (var i = 1; i <= 10; i++) {
      (function (id) {
        var btn = document.createElement('button');
        btn.type = 'button';
        var num = document.createElement('span');
        num.textContent = String(id);
        var st = document.createElement('span');
        st.className = 'stars';
        st.textContent = starsText(save.stars[id] || 0);
        btn.appendChild(num);
        btn.appendChild(st);
        if (id > save.unlocked) {
          btn.disabled = true;
        } else {
          btn.addEventListener('click', function () {
            GAME.loadStage(id);
          });
        }
        grid.appendChild(btn);
      })(i);
    }
  }

  function onState(state, game) {
    setHudVisible(state === 'PLAYING' || state === 'PAUSED');
    switch (state) {
      case 'MENU':
        setScreen('main');
        break;
      case 'STAGES':
        buildStageGrid(game);
        setScreen('stages');
        break;
      case 'PLAYING':
        lastHud = { stage: '', score: '', birds: '' };
        updateHud(game);
        setScreen(null);
        break;
      case 'PAUSED':
        setScreen('pause');
        break;
      case 'CLEAR':
        showClear(game);
        break;
      case 'FAIL':
        showFail(game);
        break;
      default:
        setScreen(null);
    }
  }

  function bind(game) {
    cache();

    // 게임 → UI 훅
    game.onState = onState;
    game.onHud = updateHud;

    // MENU
    el.btnStart.addEventListener('click', function () { GAME.startHighest(); });
    el.btnStages.addEventListener('click', function () { GAME.toStages(); });

    // STAGES
    el.btnStagesBack.addEventListener('click', function () { GAME.toMenu(); });

    // PLAYING
    el.btnPause.addEventListener('click', function () { GAME.pause(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && game.state === 'PLAYING') GAME.pause();
    });

    // PAUSED
    el.btnResume.addEventListener('click', function () { GAME.resume(); });
    el.btnRetry.addEventListener('click', function () { GAME.retry(); });
    el.btnMenu.addEventListener('click', function () { GAME.toMenu(); });

    // CLEAR
    el.btnNext.addEventListener('click', function () { GAME.nextStage(); });
    el.btnClearRetry.addEventListener('click', function () { GAME.retry(); });
    el.btnClearMenu.addEventListener('click', function () { GAME.toMenu(); });

    // FAIL
    el.btnFailRetry.addEventListener('click', function () { GAME.retry(); });
    el.btnFailMenu.addEventListener('click', function () { GAME.toMenu(); });
  }

  window.UI = {
    bind: bind,
    setScreen: setScreen,
    updateHud: updateHud,
    showClear: showClear,
    showFail: showFail,
    buildStageGrid: buildStageGrid
  };
})();
