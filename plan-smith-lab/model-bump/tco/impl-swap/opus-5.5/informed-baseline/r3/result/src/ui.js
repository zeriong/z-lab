/*
 * src/ui.js — DOM 오버레이: 화면 전환 · HUD · 스테이지 그리드 · 결과 표시 (§13.2)
 * 노출: UI = { bind(game), setScreen(name), updateHud(game), showClear, showFail, buildStageGrid }
 * 참조 전역: GAME (함수 본문 안에서만)
 *
 * setScreen(name): name = 'main' | 'stages' | 'pause' | 'clear' | 'fail' | 'none'
 * #hud 는 state === 'PLAYING' || state === 'PAUSED' 일 때만 표시한다.
 */
(function () {
  'use strict';

  var G = null;
  var el = null;
  var screens = null;
  var hudCache = { stage: null, score: null, birds: null };

  function cacheElements() {
    if (el) return;
    el = {
      app: document.getElementById('app'),
      hud: document.getElementById('hud'),
      hudLeft: document.getElementById('hud-left'),
      hudStage: document.getElementById('hud-stage'),
      hudScore: document.getElementById('hud-score'),
      hudBirds: document.getElementById('hud-birds'),
      btnPause: document.getElementById('btn-pause'),
      screenMain: document.getElementById('screen-main'),
      btnStart: document.getElementById('btn-start'),
      btnStages: document.getElementById('btn-stages'),
      screenStages: document.getElementById('screen-stages'),
      stageGrid: document.getElementById('stage-grid'),
      btnStagesBack: document.getElementById('btn-stages-back'),
      screenPause: document.getElementById('screen-pause'),
      btnResume: document.getElementById('btn-resume'),
      btnRetry: document.getElementById('btn-retry'),
      btnMenu: document.getElementById('btn-menu'),
      screenClear: document.getElementById('screen-clear'),
      clearStars: document.getElementById('clear-stars'),
      clearScore: document.getElementById('clear-score'),
      btnNext: document.getElementById('btn-next'),
      btnClearRetry: document.getElementById('btn-clear-retry'),
      btnClearMenu: document.getElementById('btn-clear-menu'),
      screenFail: document.getElementById('screen-fail'),
      failMsg: document.getElementById('fail-msg'),
      btnFailRetry: document.getElementById('btn-fail-retry'),
      btnFailMenu: document.getElementById('btn-fail-menu')
    };
    screens = {
      main: el.screenMain,
      stages: el.screenStages,
      pause: el.screenPause,
      clear: el.screenClear,
      fail: el.screenFail
    };
  }

  function on(node, handler) {
    if (!node) return;
    node.addEventListener('click', function (ev) {
      ev.preventDefault();
      handler();
    });
  }

  function starText(n) {
    var k = Math.max(0, Math.min(3, n | 0));
    var s = '';
    for (var i = 0; i < 3; i++) s += (i < k) ? '★' : '☆';
    return s;
  }

  function blurFocus() {
    var a = document.activeElement;
    if (a && a !== document.body && typeof a.blur === 'function') a.blur();
  }

  /* ------------------------------------------------------------------ */

  function syncHud() {
    var st = G ? G.state : 'MENU';
    var show = st === 'PLAYING' || st === 'PAUSED';
    if (el.hud) el.hud.classList.toggle('active', show);
    if (el.app) el.app.setAttribute('data-state', st);
  }

  function setScreen(name) {
    cacheElements();
    var list = document.querySelectorAll('.screen');
    for (var i = 0; i < list.length; i++) list[i].classList.remove('active');
    if (Object.prototype.hasOwnProperty.call(screens, name) && screens[name]) {
      screens[name].classList.add('active');
    }
    syncHud();
  }

  function updateHud(game) {
    var g = game || G;
    if (!g || !g.hud) return;
    cacheElements();
    var h = g.hud;
    if (h.stage !== hudCache.stage && el.hudStage) {
      el.hudStage.textContent = h.stage;
      hudCache.stage = h.stage;
    }
    if (h.score !== hudCache.score && el.hudScore) {
      el.hudScore.textContent = h.score;
      hudCache.score = h.score;
    }
    if (h.birdsKey !== hudCache.birds && el.hudBirds) {
      while (el.hudBirds.firstChild) el.hudBirds.removeChild(el.hudBirds.firstChild);
      for (var i = 0; i < h.birds.length; i++) {
        var dot = document.createElement('span');
        dot.className = 'hud-bird';
        dot.style.backgroundColor = h.birds[i];
        el.hudBirds.appendChild(dot);
      }
      hudCache.birds = h.birdsKey;
    }
  }

  function showClear(game) {
    var g = game || G;
    cacheElements();
    var r = (g && g.result) || { stars: 1, scoreText: '', isLast: false };
    el.clearStars.textContent = starText(r.stars);
    el.clearScore.textContent = r.scoreText;
    el.btnNext.style.display = r.isLast ? 'none' : '';   // 10단계면 "다음 스테이지" 숨김
    setScreen('clear');
  }

  function showFail(game) {
    cacheElements();
    el.failMsg.textContent = '새를 모두 사용했습니다';
    setScreen('fail');
  }

  function buildStageGrid(game) {
    var g = game || G;
    cacheElements();
    if (!g || !el.stageGrid) return;
    var grid = el.stageGrid;
    while (grid.firstChild) grid.removeChild(grid.firstChild);

    var unlocked = g.save.unlocked;
    for (var i = 1; i <= g.stageCount; i++) {
      (function (id) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'stage-btn';

        var num = document.createElement('span');
        num.className = 'stage-num';
        num.textContent = String(id);

        var stars = document.createElement('span');
        stars.className = 'stage-stars';

        btn.appendChild(num);
        btn.appendChild(stars);

        if (id > unlocked) {
          stars.textContent = '잠김';
          btn.disabled = true;
          btn.classList.add('locked');
        } else {
          stars.textContent = starText(g.save.stars[id] || 0);
          btn.addEventListener('click', function (ev) {
            ev.preventDefault();
            if (G && G.state === 'STAGES') GAME.loadStage(id);
          });
        }
        grid.appendChild(btn);
      })(i);
    }
  }

  // GAME 의 상태 전이 훅
  function handleState(game, state) {
    switch (state) {
      case 'MENU':
        setScreen('main');
        break;
      case 'STAGES':
        buildStageGrid(game);
        setScreen('stages');
        break;
      case 'PLAYING':
        setScreen('none');
        blurFocus();          // 숨겨진 버튼에 포커스가 남아 Space 가 버튼을 누르는 일 방지
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
        setScreen('none');
    }
    updateHud(game);
  }

  function bind(game) {
    G = game;
    cacheElements();
    game.hooks.onState = handleState;
    game.hooks.onHud = updateHud;

    // MENU
    on(el.btnStart, function () {
      if (G.state === 'MENU') GAME.loadStage(G.save.unlocked);   // 해금된 최고 스테이지
    });
    on(el.btnStages, function () {
      if (G.state === 'MENU') GAME.toStages();
    });

    // STAGES
    on(el.btnStagesBack, function () {
      if (G.state === 'STAGES') GAME.toMenu();
    });

    // PLAYING
    on(el.btnPause, function () {
      if (G.state === 'PLAYING') GAME.pause();
    });

    // PAUSED
    on(el.btnResume, function () {
      if (G.state === 'PAUSED') GAME.resume();
    });
    on(el.btnRetry, function () {
      if (G.state === 'PAUSED') GAME.retry();
    });
    on(el.btnMenu, function () {
      if (G.state === 'PAUSED') GAME.toMenu();
    });

    // CLEAR
    on(el.btnNext, function () {
      if (G.state === 'CLEAR' && G.stageId < G.stageCount) GAME.loadStage(G.stageId + 1);
    });
    on(el.btnClearRetry, function () {
      if (G.state === 'CLEAR') GAME.retry();
    });
    on(el.btnClearMenu, function () {
      if (G.state === 'CLEAR') GAME.toMenu();
    });

    // FAIL
    on(el.btnFailRetry, function () {
      if (G.state === 'FAIL') GAME.retry();
    });
    on(el.btnFailMenu, function () {
      if (G.state === 'FAIL') GAME.toMenu();
    });

    // 탭 비활성 → 일시정지
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && G.state === 'PLAYING') GAME.pause();
    });

    updateHud(game);
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
