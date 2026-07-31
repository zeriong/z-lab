/* ui.js — DOM 화면/오버레이/HUD. 상태는 FSM만 신뢰한다.
 * 일시정지 버튼은 #hud .hud-right 안에 있어 인게임 우측에 고정된다(하드 제약 ③).
 */
(function (AB) {
  'use strict';

  var CFG = AB.CFG;
  var UI = { el: {}, handlers: {} };

  function $(id) { return document.getElementById(id); }

  function show(el, visible) {
    if (!el) return;
    el.classList[visible ? 'remove' : 'add']('hidden');
  }

  /* ---------- 진행도 저장 ---------- */

  UI.loadProgress = function () {
    try {
      var raw = window.localStorage.getItem(CFG.STORAGE_KEY);
      if (!raw) return { cleared: [], best: {} };
      var parsed = JSON.parse(raw);
      return {
        cleared: parsed.cleared || [],
        best: parsed.best || {}
      };
    } catch (e) {
      return { cleared: [], best: {} };
    }
  };

  UI.saveProgress = function (progress) {
    try {
      window.localStorage.setItem(CFG.STORAGE_KEY, JSON.stringify(progress));
    } catch (e) { /* 저장 불가 환경 — 진행도만 휘발 */ }
  };

  UI.markCleared = function (index, score) {
    var p = UI.loadProgress();
    if (p.cleared.indexOf(index) < 0) p.cleared.push(index);
    if (!p.best[index] || score > p.best[index]) p.best[index] = score;
    UI.saveProgress(p);
  };

  UI.firstUncleared = function () {
    var p = UI.loadProgress();
    for (var i = 0; i < AB.Stage.count(); i++) {
      if (p.cleared.indexOf(i) < 0) return i;
    }
    return 0;
  };

  /* ---------- 스테이지 선택 그리드 ---------- */

  UI.buildStageGrid = function () {
    var grid = UI.el.stageGrid;
    var p = UI.loadProgress();
    grid.innerHTML = '';
    for (var i = 0; i < AB.Stage.count(); i++) {
      (function (index) {
        var data = AB.Stage.data(index);
        var unlocked = index === 0 || p.cleared.indexOf(index - 1) >= 0 ||
          p.cleared.indexOf(index) >= 0;
        var btn = document.createElement('button');
        btn.className = 'stage-btn' +
          (p.cleared.indexOf(index) >= 0 ? ' cleared' : '') +
          (unlocked ? '' : ' locked');
        btn.innerHTML = (index + 1) +
          (p.cleared.indexOf(index) >= 0 ? '<span class="tick">CLEAR</span>' : '');
        btn.title = data.name + ' — 새 ' + data.birds + '마리';
        if (unlocked) {
          btn.addEventListener('click', function () {
            UI.handlers.startStage(index);
          });
        } else {
          btn.disabled = true;
        }
        grid.appendChild(btn);
      })(i);
    }
  };

  /* ---------- HUD ---------- */

  UI.syncHud = function (session) {
    if (!session) return;
    UI.el.hudStage.textContent = 'STAGE ' + (session.index + 1) + ' · ' + session.data.name;
    UI.el.hudBirds.textContent = '남은 새 ' + session.birdsLeft;
    UI.el.hudPigs.textContent = '남은 돼지 ' + session.pigs.length;
    UI.el.hudScore.textContent = '점수 ' + session.score;
  };

  /* ---------- 화면 동기화 (FSM 종속) ---------- */

  UI.syncScreens = function (state) {
    show(UI.el.menu, state === 'MENU');
    show(UI.el.pause, state === 'PAUSED');
    show(UI.el.clear, state === 'CLEAR');
    show(UI.el.fail, state === 'FAIL');
    show(UI.el.error, state === 'ERROR');
    show(UI.el.hud, state === 'PLAYING' || state === 'PAUSED');
  };

  UI.showClear = function (session) {
    var p = UI.loadProgress();
    var best = p.best[session.index] || session.score;
    UI.el.clearScore.innerHTML =
      '점수 ' + session.score + ' <br>최고 ' + best +
      ' · 남긴 새 ' + session.birdsLeft + '마리';
    var last = session.index >= AB.Stage.count() - 1;
    UI.el.btnNext.textContent = last ? '메인으로 (전 스테이지 클리어!)' : '다음 스테이지';
  };

  /* ---------- 초기화 ---------- */

  UI.init = function (handlers) {
    UI.handlers = handlers;

    UI.el = {
      hud: $('hud'),
      hudStage: $('hud-stage'),
      hudBirds: $('hud-birds'),
      hudPigs: $('hud-pigs'),
      hudScore: $('hud-score'),
      menu: $('screen-menu'),
      pause: $('screen-pause'),
      clear: $('screen-clear'),
      fail: $('screen-fail'),
      error: $('screen-error'),
      stageGrid: $('stage-grid'),
      clearScore: $('clear-score'),
      btnNext: $('btn-next')
    };

    $('btn-start').addEventListener('click', function () {
      UI.handlers.startStage(UI.firstUncleared());
    });
    $('btn-pause').addEventListener('click', function () { UI.handlers.pause(); });
    $('btn-resume').addEventListener('click', function () { UI.handlers.resume(); });
    $('btn-retry-pause').addEventListener('click', function () { UI.handlers.retry(); });
    $('btn-home-pause').addEventListener('click', function () { UI.handlers.home(); });
    $('btn-next').addEventListener('click', function () { UI.handlers.next(); });
    $('btn-retry-clear').addEventListener('click', function () { UI.handlers.retry(); });
    $('btn-home-clear').addEventListener('click', function () { UI.handlers.home(); });
    $('btn-retry-fail').addEventListener('click', function () { UI.handlers.retry(); });
    $('btn-home-fail').addEventListener('click', function () { UI.handlers.home(); });

    // 키보드 보조: ESC = 일시정지/재개, R = 다시하기
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (AB.FSM.is('PLAYING')) UI.handlers.pause();
        else if (AB.FSM.is('PAUSED')) UI.handlers.resume();
      } else if (e.key === 'r' || e.key === 'R') {
        if (AB.FSM.is('PLAYING') || AB.FSM.is('PAUSED') ||
            AB.FSM.is('CLEAR') || AB.FSM.is('FAIL')) {
          UI.handlers.retry();
        }
      }
    });

    UI.buildStageGrid();
  };

  AB.UI = UI;
})(window.AB);
