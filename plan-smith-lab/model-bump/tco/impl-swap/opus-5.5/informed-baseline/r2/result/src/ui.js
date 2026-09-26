/*
 * ui.js — DOM 화면 전환, HUD 갱신, 스테이지 그리드, 결과 표시 (§13.2)
 * 노출: window.UI = { bind, setScreen, updateHud, showClear, showFail, buildStageGrid }
 * 참조: GAME, C
 *
 * 연결 방식: bind(game) 가 game.onState / game.onHud 훅을 설치한다.
 * 버튼 핸들러는 GAME 의 전이 함수만 호출하고, 실제 화면 전환은 onState 훅에서 한 곳으로 처리한다.
 */
(function () {
  'use strict';

  var el = {};
  var gameRef = null;
  var hudCache = { stage: null, score: null, birds: null };

  function fmt(n) {
    var v = Math.round(Number(n) || 0);
    return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function starText(n) {
    var s = '';
    for (var i = 0; i < 3; i++) s += i < n ? '★' : '☆';
    return s;
  }

  // index.html 의 id 전부(game-canvas 는 main.js 가 가져간다)
  function cacheElements() {
    el.app = document.getElementById('app');
    el.hud = document.getElementById('hud');
    el.hudLeft = document.getElementById('hud-left');
    el.hudStage = document.getElementById('hud-stage');
    el.hudScore = document.getElementById('hud-score');
    el.hudBirds = document.getElementById('hud-birds');
    el.btnPause = document.getElementById('btn-pause');

    el.screenMain = document.getElementById('screen-main');
    el.btnStart = document.getElementById('btn-start');
    el.btnStages = document.getElementById('btn-stages');

    el.screenStages = document.getElementById('screen-stages');
    el.stageGrid = document.getElementById('stage-grid');
    el.btnStagesBack = document.getElementById('btn-stages-back');

    el.screenPause = document.getElementById('screen-pause');
    el.btnResume = document.getElementById('btn-resume');
    el.btnRetry = document.getElementById('btn-retry');
    el.btnMenu = document.getElementById('btn-menu');

    el.screenClear = document.getElementById('screen-clear');
    el.clearStars = document.getElementById('clear-stars');
    el.clearScore = document.getElementById('clear-score');
    el.btnNext = document.getElementById('btn-next');
    el.btnClearRetry = document.getElementById('btn-clear-retry');
    el.btnClearMenu = document.getElementById('btn-clear-menu');

    el.screenFail = document.getElementById('screen-fail');
    el.failMsg = document.getElementById('fail-msg');
    el.btnFailRetry = document.getElementById('btn-fail-retry');
    el.btnFailMenu = document.getElementById('btn-fail-menu');

    for (var k in el) {
      if (Object.prototype.hasOwnProperty.call(el, k) && !el[k] && window.console) {
        console.warn('[UI] missing element: ' + k);
      }
    }
  }

  function screenFor(name) {
    switch (name) {
      case 'main': return el.screenMain;
      case 'stages': return el.screenStages;
      case 'pause': return el.screenPause;
      case 'clear': return el.screenClear;
      case 'fail': return el.screenFail;
      default: return null;       // null / 'game' -> 오버레이 없음(인게임)
    }
  }

  function syncHud() {
    var st = gameRef ? gameRef.state : 'MENU';
    var show = st === 'PLAYING' || st === 'PAUSED';
    if (el.hud) el.hud.classList.toggle('show', show);
    if (el.app) el.app.setAttribute('data-state', st);
  }

  // 모든 .screen 에서 active 를 빼고 대상에만 넣는다
  function setScreen(name) {
    if (!el.hud) cacheElements();
    var all = [el.screenMain, el.screenStages, el.screenPause, el.screenClear, el.screenFail];
    for (var i = 0; i < all.length; i++) {
      if (all[i]) all[i].classList.remove('active');
    }
    var target = screenFor(name);
    if (target) target.classList.add('active');
    syncHud();
  }

  function updateHud(game) {
    if (!el.hud || !game) return;

    var stageText = '스테이지 ' + game.stageId;
    if (hudCache.stage !== stageText) {
      el.hudStage.textContent = stageText;
      hudCache.stage = stageText;
    }

    var scoreText = '점수 ' + fmt(game.score);
    if (hudCache.score !== scoreText) {
      el.hudScore.textContent = scoreText;
      hudCache.score = scoreText;
    }

    var birds = GAME.remainingBirds();
    var sig = game.shot + '|';
    for (var i = 0; i < birds.length; i++) sig += birds[i].type + ',';
    if (hudCache.birds !== sig) {
      hudCache.birds = sig;
      while (el.hudBirds.firstChild) el.hudBirds.removeChild(el.hudBirds.firstChild);
      var loaded = game.shot === 'ARMED' || game.shot === 'DRAG';
      for (var j = 0; j < birds.length; j++) {
        var s = document.createElement('span');
        s.className = 'hud-bird' + (loaded && j === 0 ? ' next' : '');
        s.style.backgroundColor = birds[j].color;
        s.title = birds[j].type;
        el.hudBirds.appendChild(s);
      }
    }
  }

  function showClear(game) {
    var r = (game && game.result) || { stars: 1, score: game ? game.score : 0, bonus: 0, isLast: false };
    el.clearStars.textContent = starText(r.stars);
    var txt = '점수 ' + fmt(r.score);
    if (r.bonus > 0) txt += '  (남은 새 보너스 ' + fmt(r.bonus) + ')';
    el.clearScore.textContent = txt;
    el.btnNext.style.display = r.isLast ? 'none' : '';   // 10단계면 숨김
    setScreen('clear');
  }

  function showFail(game) {
    el.failMsg.textContent = '새를 모두 사용했습니다';
    setScreen('fail');
  }

  function buildStageGrid(game) {
    var grid = el.stageGrid;
    if (!grid) return;
    while (grid.firstChild) grid.removeChild(grid.firstChild);

    var list = GAME.getStages();
    for (var i = 0; i < list.length; i++) {
      (function (s) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'stage-btn' + (s.unlocked ? '' : ' locked');
        b.setAttribute('data-stage', String(s.id));

        var num = document.createElement('span');
        num.className = 'stage-num';
        num.textContent = String(s.id);
        var name = document.createElement('span');
        name.className = 'stage-name';
        name.textContent = s.unlocked ? s.name : '잠김';
        var stars = document.createElement('span');
        stars.className = 'stage-stars';
        stars.textContent = starText(s.stars);

        b.appendChild(num);
        b.appendChild(name);
        b.appendChild(stars);

        if (!s.unlocked) {
          b.disabled = true;
        } else {
          b.addEventListener('click', function (ev) {
            ev.preventDefault();
            b.blur();
            GAME.loadStage(s.id);
          });
        }
        grid.appendChild(b);
      })(list[i]);
    }
  }

  // 상태 변화 -> 화면 (전이표 §6.2 의 "다음" 상태 표시를 한 곳에서 담당)
  function onStateChange(state, game) {
    switch (state) {
      case 'MENU':
        setScreen('main');
        break;
      case 'STAGES':
        buildStageGrid(game);
        setScreen('stages');
        break;
      case 'PLAYING':
        hudCache.stage = hudCache.score = hudCache.birds = null;
        setScreen(null);
        updateHud(game);
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
    }
  }

  function onClick(node, fn) {
    if (!node) return;
    node.addEventListener('click', function (ev) {
      ev.preventDefault();
      if (node.blur) node.blur();   // 포커스가 남아 Space 키가 버튼을 누르지 않도록
      fn();
    });
  }

  function bind(game) {
    gameRef = game;
    cacheElements();

    onClick(el.btnStart, function () { GAME.startGame(); });          // MENU -> PLAYING
    onClick(el.btnStages, function () { GAME.openStages(); });        // MENU -> STAGES
    onClick(el.btnStagesBack, function () { GAME.toMenu(); });        // STAGES -> MENU
    onClick(el.btnPause, function () { GAME.pause(); });              // PLAYING -> PAUSED
    onClick(el.btnResume, function () { GAME.resume(); });            // PAUSED -> PLAYING
    onClick(el.btnRetry, function () { GAME.retry(); });              // PAUSED -> PLAYING(재로드)
    onClick(el.btnMenu, function () { GAME.toMenu(); });              // PAUSED -> MENU
    onClick(el.btnNext, function () { GAME.nextStage(); });           // CLEAR -> PLAYING(다음)
    onClick(el.btnClearRetry, function () { GAME.retry(); });         // CLEAR -> PLAYING(재로드)
    onClick(el.btnClearMenu, function () { GAME.toMenu(); });         // CLEAR -> MENU
    onClick(el.btnFailRetry, function () { GAME.retry(); });          // FAIL -> PLAYING(재로드)
    onClick(el.btnFailMenu, function () { GAME.toMenu(); });          // FAIL -> MENU

    game.onState = onStateChange;
    game.onHud = updateHud;
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
