// ui.js — 화면 전환·HUD 갱신·스테이지 그리드·결과 표시. GAME, C, U, BIRD, STAGES 참조.
(function () {
  'use strict';

  var el = {};
  var gameRef = null;
  var hudCache = { stage: '', score: '', birds: '', visible: null };

  function $(id) {
    return document.getElementById(id);
  }

  function grab() {
    el.app = $('app');
    el.canvas = $('game-canvas');
    el.hud = $('hud');
    el.hudLeft = $('hud-left');
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

    el.screens = {
      main: el.screenMain,
      stages: el.screenStages,
      pause: el.screenPause,
      clear: el.screenClear,
      fail: el.screenFail
    };
  }

  function on(node, fn) {
    if (node) node.addEventListener('click', function (ev) { ev.preventDefault(); fn(); });
  }

  // ---------------------------------------------------------------
  // §6.2 전이표의 버튼 리스너
  // ---------------------------------------------------------------
  function bind(game) {
    gameRef = game;
    grab();

    // MENU
    on(el.btnStart, function () { GAME.startFromMenu(); });
    on(el.btnStages, function () { buildStageGrid(); GAME.toStages(); });

    // STAGES
    on(el.btnStagesBack, function () { GAME.toMenu(); });

    // PLAYING
    on(el.btnPause, function () { GAME.pause(); });

    // PAUSED
    on(el.btnResume, function () { GAME.resume(); });
    on(el.btnRetry, function () { GAME.retry(); });
    on(el.btnMenu, function () { GAME.toMenu(); });

    // CLEAR
    on(el.btnNext, function () { GAME.nextStage(); });
    on(el.btnClearRetry, function () { GAME.retry(); });
    on(el.btnClearMenu, function () { GAME.toMenu(); });

    // FAIL
    on(el.btnFailRetry, function () { GAME.retry(); });
    on(el.btnFailMenu, function () { GAME.toMenu(); });

    buildStageGrid();
    updateHud(game);
  }

  // ---------------------------------------------------------------
  // 화면 전환: 모든 .screen 에서 active 제거 후 대상에만 추가
  // name: 'main' | 'stages' | 'pause' | 'clear' | 'fail' | 'none'
  // ---------------------------------------------------------------
  function setScreen(name) {
    if (!el.screens) grab();
    var all = document.querySelectorAll('.screen');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
    var target = el.screens[name];
    if (target) target.classList.add('active');
    if (gameRef) syncHudVisible(gameRef);
  }

  function syncHudVisible(game) {
    var visible = game.state === 'PLAYING' || game.state === 'PAUSED';
    if (hudCache.visible === visible) return;
    hudCache.visible = visible;
    if (!el.hud) return;
    if (visible) el.hud.classList.add('active');
    else el.hud.classList.remove('active');
  }

  // ---------------------------------------------------------------
  // HUD (DOM) — 변경된 값만 갱신
  // ---------------------------------------------------------------
  function updateHud(game) {
    if (!el.hud) grab();
    if (!game) return;
    gameRef = game;
    syncHudVisible(game);

    var stageText = '스테이지 ' + (game.stageId || 1);
    if (hudCache.stage !== stageText) {
      hudCache.stage = stageText;
      if (el.hudStage) el.hudStage.textContent = stageText;
    }

    var scoreText = '점수 ' + U.fmt(game.score || 0);
    if (hudCache.score !== scoreText) {
      hudCache.score = scoreText;
      if (el.hudScore) el.hudScore.textContent = scoreText;
    }

    // 남은 새 아이콘 (아직 발사하지 않은 새)
    var birds = game.birds || [];
    var sig = birds.join(',');
    if (hudCache.birds !== sig) {
      hudCache.birds = sig;
      if (el.hudBirds) {
        el.hudBirds.innerHTML = '';
        for (var i = 0; i < birds.length; i++) {
          var bd = BIRD[birds[i]] || BIRD.red;
          var icon = document.createElement('span');
          icon.className = 'hud-bird';
          icon.style.background = bd.color;
          icon.title = birds[i];
          el.hudBirds.appendChild(icon);
        }
      }
    }
  }

  // ---------------------------------------------------------------
  // 결과 화면
  // ---------------------------------------------------------------
  function starText(n) {
    var s = '';
    for (var i = 0; i < 3; i++) s += i < n ? '★' : '☆';
    return s;
  }

  function showClear(game) {
    if (!el.hud) grab();
    if (el.clearStars) el.clearStars.textContent = starText(game.lastStars || 1);
    if (el.clearScore) el.clearScore.textContent = '점수 ' + U.fmt(game.score || 0);
    if (el.btnNext) {
      el.btnNext.style.display = game.stageId >= STAGES.length ? 'none' : '';
    }
    setScreen('clear');
  }

  function showFail(game) {
    if (!el.hud) grab();
    if (el.failMsg) el.failMsg.textContent = '새를 모두 사용했습니다';
    setScreen('fail');
  }

  // ---------------------------------------------------------------
  // 스테이지 선택 그리드 (버튼 10개를 JS 로 생성)
  // ---------------------------------------------------------------
  function buildStageGrid() {
    if (!el.stageGrid) grab();
    if (!el.stageGrid) return;
    var save = GAME.getSave();
    el.stageGrid.innerHTML = '';
    for (var i = 0; i < STAGES.length; i++) {
      var st = STAGES[i];
      var locked = st.id > save.unlocked;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'stage-btn' + (locked ? ' locked' : '');
      btn.disabled = locked;
      btn.title = st.name;

      var num = document.createElement('span');
      num.textContent = String(st.id);
      btn.appendChild(num);

      var stars = document.createElement('span');
      stars.className = 'stage-stars';
      stars.textContent = locked ? '잠김' : starText(save.stars[st.id] || 0);
      btn.appendChild(stars);

      if (!locked) {
        btn.addEventListener('click', (function (id) {
          return function (ev) { ev.preventDefault(); GAME.loadStage(id); };
        })(st.id));
      }
      el.stageGrid.appendChild(btn);
    }
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
