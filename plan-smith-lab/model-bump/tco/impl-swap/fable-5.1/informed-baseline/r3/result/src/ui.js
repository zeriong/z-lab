/* ui.js — §13.2 DOM 화면 전환·HUD 갱신·스테이지 그리드·결과 표시. 참조 전역: GAME, C
 * UI.bind(game) / UI.setScreen(name) / UI.updateHud(game) / UI.showClear(game) / UI.showFail(game) / UI.buildStageGrid(game)
 */
var UI = (function () {
  'use strict';

  /* index.html 의 id 전수 목록 (§13.2 계약) — 캔버스(#game-canvas)는 main.js 가 가져간다 */
  var IDS = [
    'app',
    'hud', 'hud-left', 'hud-stage', 'hud-score', 'hud-birds', 'btn-pause',
    'screen-main', 'btn-start', 'btn-stages',
    'screen-stages', 'stage-grid', 'btn-stages-back',
    'screen-pause', 'btn-resume', 'btn-retry', 'btn-menu',
    'screen-clear', 'clear-stars', 'clear-score', 'btn-next', 'btn-clear-retry', 'btn-clear-menu',
    'screen-fail', 'fail-msg', 'btn-fail-retry', 'btn-fail-menu'
  ];
  var SCREENS = ['main', 'stages', 'pause', 'clear', 'fail'];
  var STAGE_COUNT = 10;

  var els = {};

  function starsText(n) {
    var s = '';
    for (var i = 1; i <= 3; i++) s += (i <= n) ? '★' : '☆';
    return s;
  }

  /* 모든 .screen 에서 active 를 빼고 대상에만 넣는다. name 이 스크린 이름이 아니면 전부 숨김 */
  function setScreen(name) {
    for (var i = 0; i < SCREENS.length; i++) {
      var el = els['screen-' + SCREENS[i]];
      if (el) el.classList.remove('active');
    }
    var target = els['screen-' + name];
    if (target) target.classList.add('active');
  }

  function setHudVisible(visible) {
    if (!els.hud) return;
    if (visible) els.hud.classList.add('active');
    else els.hud.classList.remove('active');
  }

  function updateHud(game) {
    var h = game.hud;
    if (!h) return;
    els['hud-stage'].textContent = h.stage;
    els['hud-score'].textContent = h.score;

    var box = els['hud-birds'];
    while (box.firstChild) box.removeChild(box.firstChild);
    for (var i = 0; i < h.birds.length; i++) {
      var icon = document.createElement('span');
      icon.className = 'bird-icon';
      icon.style.background = h.birds[i];
      box.appendChild(icon);
    }
  }

  function showClear(game) {
    var r = game.result || { stars: 1, scoreText: '0', bonusText: '0' };
    els['clear-stars'].textContent = starsText(r.stars);
    els['clear-score'].textContent = '점수 ' + r.scoreText + ' (남은 새 보너스 +' + r.bonusText + ')';
    els['btn-next'].style.display = (game.stageId >= STAGE_COUNT) ? 'none' : '';
    setScreen('clear');
  }

  function showFail(game) {
    els['fail-msg'].textContent = '새를 모두 사용했습니다';
    setScreen('fail');
  }

  function buildStageGrid(game) {
    var grid = els['stage-grid'];
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    var p = game.progress || { unlocked: 1, stars: {} };

    for (var id = 1; id <= STAGE_COUNT; id++) {
      var unlocked = id <= p.unlocked;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'stage-btn';
      btn.disabled = !unlocked;

      var num = document.createElement('span');
      num.className = 'num';
      num.textContent = String(id);

      var st = document.createElement('span');
      st.className = 'stars';
      st.textContent = unlocked ? starsText(p.stars[id] || 0) : '잠김';

      btn.appendChild(num);
      btn.appendChild(st);
      btn.addEventListener('click', makeStageHandler(id));
      grid.appendChild(btn);
    }
  }

  function makeStageHandler(id) {
    return function () { GAME.loadStage(id); };
  }

  /* 상태 → 화면 동기화 (GAME 의 onStateChange 콜백) */
  function syncScreen(game) {
    switch (game.state) {
      case 'MENU':
        setScreen('main');
        break;
      case 'STAGES':
        buildStageGrid(game);
        setScreen('stages');
        break;
      case 'PLAYING':
        setScreen('none');
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
        setScreen('main');
        break;
    }
    setHudVisible(game.state === 'PLAYING' || game.state === 'PAUSED');
  }

  function on(id, fn) {
    var el = els[id];
    if (el) el.addEventListener('click', fn);
  }

  function bind(game) {
    for (var i = 0; i < IDS.length; i++) {
      els[IDS[i]] = document.getElementById(IDS[i]);
      if (!els[IDS[i]] && window.console) console.warn('UI: element not found #' + IDS[i]);
    }

    /* §6.2 전이표의 버튼 트리거 */
    on('btn-start', function () { GAME.startGame(); });
    on('btn-stages', function () { GAME.toStages(); });
    on('btn-stages-back', function () { GAME.toMenu(); });
    on('btn-pause', function () { GAME.pause(); });
    on('btn-resume', function () { GAME.resume(); });
    on('btn-retry', function () { GAME.retry(); });
    on('btn-menu', function () { GAME.toMenu(); });
    on('btn-next', function () { GAME.nextStage(); });
    on('btn-clear-retry', function () { GAME.retry(); });
    on('btn-clear-menu', function () { GAME.toMenu(); });
    on('btn-fail-retry', function () { GAME.retry(); });
    on('btn-fail-menu', function () { GAME.toMenu(); });

    /* 탭 비활성 → 일시정지 */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && game.state === 'PLAYING') GAME.pause();
    });

    game.onStateChange = syncScreen;
    game.onHudChange = updateHud;

    updateHud(game);
    setHudVisible(false);
  }

  return {
    bind: bind,
    setScreen: setScreen,
    updateHud: updateHud,
    showClear: showClear,
    showFail: showFail,
    buildStageGrid: buildStageGrid
  };
})();
