/*
 * ui.js — DOM 화면 전환 · HUD 갱신 · 스테이지 그리드 · 결과 표시 (§6.2, §13.2)
 * 노출: window.UI = { bind, setScreen, updateHud, showClear, showFail, buildStageGrid }
 * 참조 전역: GAME (C — 사용하지 않음)
 *
 * GAME 이 상태를 바꾸면 game.hooks.state(state) 로 알려 주고, 여기서 화면을 맞춘다.
 * 화면 이름: 'main' | 'stages' | 'pause' | 'clear' | 'fail' | 'game'(오버레이 없음)
 */
(function () {
  'use strict';

  var game = null;
  var el = null;
  var screens = null;
  var hudCache = { stage: null, score: null, birds: null };

  function num(n) {
    return Math.round(Number(n) || 0).toLocaleString('ko-KR');
  }

  function starText(n) {
    var s = '';
    for (var i = 0; i < 3; i++) s += (i < n) ? '★' : '☆';
    return s;
  }

  // index.html 의 id 전부 (game-canvas 는 main.js 에서 조회)
  function grabElements() {
    return {
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
  }

  function onClick(node, fn) {
    if (!node) return;
    node.addEventListener('click', function (ev) {
      ev.preventDefault();
      if (typeof node.blur === 'function') node.blur();
      fn(ev);
    });
  }

  // 인게임 진입 시 포커스된 버튼이 Space 키를 가로채지 않도록 포커스를 뺀다
  function blurActive() {
    var a = document.activeElement;
    if (a && a !== document.body && typeof a.blur === 'function') a.blur();
  }

  // 모든 .screen 에서 active 를 빼고 대상에만 넣는다. #hud 는 PLAYING/PAUSED 에서만 표시.
  function setScreen(name) {
    var all = document.querySelectorAll('.screen');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
    var target = screens ? screens[name] : null;
    if (target) target.classList.add('active');

    var st = game ? game.state : 'MENU';
    if (el) {
      if (el.app) el.app.setAttribute('data-state', st);
      if (el.hud) el.hud.style.display = (st === 'PLAYING' || st === 'PAUSED') ? 'block' : 'none';
    }
  }

  // GAME 상태 변경 알림 -> 화면 동기화
  function onState(state) {
    switch (state) {
      case 'MENU':
        setScreen('main');
        break;
      case 'STAGES':
        buildStageGrid(game);
        setScreen('stages');
        break;
      case 'PLAYING':
        blurActive();
        setScreen('game');
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
        break;
    }
    updateHud(game);
  }

  // 스테이지 버튼 10개 생성 (잠김/별 표시)
  function buildStageGrid(g) {
    if (!el || !el.stageGrid || !g) return;
    var grid = el.stageGrid;
    var p = g.progress;
    grid.textContent = '';

    for (var i = 0; i < g.stageInfo.length; i++) {
      var s = g.stageInfo[i];
      var locked = s.id > p.unlocked;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'stage-btn' + (locked ? ' locked' : '');
      btn.setAttribute('data-stage', String(s.id));
      btn.disabled = locked;

      var numEl = document.createElement('span');
      numEl.className = 'stage-num';
      numEl.textContent = String(s.id);

      var nameEl = document.createElement('span');
      nameEl.className = 'stage-name';
      nameEl.textContent = locked ? '잠김' : s.name;

      var starEl = document.createElement('span');
      starEl.className = 'stage-stars';
      starEl.textContent = starText(p.stars[s.id] || 0);

      btn.appendChild(numEl);
      btn.appendChild(nameEl);
      btn.appendChild(starEl);
      grid.appendChild(btn);
    }
  }

  // HUD: 스테이지 번호, 점수, 남은 새 아이콘 (바뀐 경우에만 DOM 갱신)
  function updateHud(g) {
    if (!el || !g) return;

    var stageTxt = '스테이지 ' + (g.stageId || 1);
    if (stageTxt !== hudCache.stage) {
      hudCache.stage = stageTxt;
      if (el.hudStage) el.hudStage.textContent = stageTxt;
    }

    var scoreTxt = '점수 ' + num(g.score);
    if (scoreTxt !== hudCache.score) {
      hudCache.score = scoreTxt;
      if (el.hudScore) el.hudScore.textContent = scoreTxt;
    }

    var rest = (g.birds || []).slice(g.firedCount || 0);
    var keyParts = [];
    for (var i = 0; i < rest.length; i++) keyParts.push(rest[i].type);
    var key = keyParts.join(',');
    if (key !== hudCache.birds) {
      hudCache.birds = key;
      if (el.hudBirds) {
        el.hudBirds.textContent = '';
        for (var j = 0; j < rest.length; j++) {
          var dot = document.createElement('span');
          dot.className = 'hud-bird';
          dot.style.background = rest[j].color;
          dot.title = rest[j].type;
          el.hudBirds.appendChild(dot);
        }
      }
    }
  }

  function showClear(g) {
    if (!el || !g) return;
    if (el.clearStars) el.clearStars.textContent = starText(g.lastStars);
    if (el.clearScore) el.clearScore.textContent = '점수 ' + num(g.score);
    if (el.btnNext) {
      var hasNext = g.stageId < g.stageInfo.length;   // 10단계면 숨김
      el.btnNext.style.display = hasNext ? '' : 'none';
    }
    setScreen('clear');
  }

  function showFail(g) {
    if (!el || !g) return;
    if (el.failMsg) el.failMsg.textContent = '새를 모두 사용했습니다';
    setScreen('fail');
  }

  // MENU -> STAGES (UI 전용 상태)
  function goStages() {
    if (!game || game.state !== 'MENU') return;
    game.state = 'STAGES';
    onState('STAGES');
  }

  function bind(g) {
    game = g;
    el = grabElements();
    screens = {
      main: el.screenMain,
      stages: el.screenStages,
      pause: el.screenPause,
      clear: el.screenClear,
      fail: el.screenFail
    };

    if (el.hudLeft) el.hudLeft.setAttribute('aria-live', 'polite');

    // GAME -> UI 알림 연결
    g.hooks.state = onState;
    g.hooks.hud = updateHud;

    // MENU
    onClick(el.btnStart, function () {
      if (game.state !== 'MENU') return;
      GAME.loadStage(game.progress.unlocked || 1);    // 해금된 최고 스테이지
    });
    onClick(el.btnStages, goStages);

    // STAGES
    onClick(el.btnStagesBack, function () {
      GAME.toMenu();
    });
    if (el.stageGrid) {
      el.stageGrid.addEventListener('click', function (ev) {
        if (game.state !== 'STAGES') return;
        var t = ev.target;
        var btn = (t && typeof t.closest === 'function') ? t.closest('button[data-stage]') : null;
        if (!btn || btn.disabled) return;
        var id = parseInt(btn.getAttribute('data-stage'), 10);
        if (id >= 1 && id <= game.progress.unlocked) GAME.loadStage(id);
      });
    }

    // PLAYING
    onClick(el.btnPause, function () {
      GAME.pause();
    });

    // PAUSED
    onClick(el.btnResume, function () {
      GAME.resume();
    });
    onClick(el.btnRetry, function () {
      GAME.retry();
    });
    onClick(el.btnMenu, function () {
      GAME.toMenu();
    });

    // CLEAR
    onClick(el.btnNext, function () {
      if (game.stageId < game.stageInfo.length) GAME.loadStage(game.stageId + 1);
    });
    onClick(el.btnClearRetry, function () {
      GAME.retry();
    });
    onClick(el.btnClearMenu, function () {
      GAME.toMenu();
    });

    // FAIL
    onClick(el.btnFailRetry, function () {
      GAME.retry();
    });
    onClick(el.btnFailMenu, function () {
      GAME.toMenu();
    });

    // PLAYING 중 탭 비활성 -> PAUSED
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && game.state === 'PLAYING') GAME.pause();
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
