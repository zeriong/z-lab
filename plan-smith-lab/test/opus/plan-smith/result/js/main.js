/* main.js — 부트스트랩 / 고정 스텝 루프 / FSM 배선.
 *
 * 루프 규약: 물리는 FSM.isSimulating()일 때만 전진한다(일시정지 = 스텝 중단, 렌더는 계속).
 * 다시하기 = Stage.load(같은 index, 이전 세션) — 로드와 리셋이 같은 경로다(A5xA1).
 */
(function (AB) {
  'use strict';

  var CFG = AB.CFG;
  var Game = { session: null, currentIndex: 0 };

  /* ---------- 상태 전이 진입점 ---------- */

  Game.startStage = function (index) {
    if (index < 0 || index >= AB.Stage.count()) return;
    Game.currentIndex = index;
    Game.session = AB.Stage.load(index, Game.session);
    AB.UI.syncHud(Game.session);
    AB.FSM.set('PLAYING');
  };

  Game.retry = function () {
    Game.startStage(Game.currentIndex);
  };

  Game.pause = function () {
    AB.FSM.set('PAUSED');
  };

  Game.resume = function () {
    AB.FSM.set('PLAYING');
  };

  Game.home = function () {
    AB.Stage.destroy(Game.session);
    Game.session = null;
    AB.UI.buildStageGrid();
    AB.FSM.set('MENU');
  };

  Game.next = function () {
    var nextIndex = Game.currentIndex + 1;
    if (nextIndex >= AB.Stage.count()) {
      Game.home();
      return;
    }
    Game.startStage(nextIndex);
  };

  /* ---------- 판정 결과 → FSM ---------- */

  AB.Judge.onResult = function (session, result) {
    if (result === 'clear') {
      AB.UI.markCleared(session.index, session.score);
      AB.UI.showClear(session);
      AB.UI.buildStageGrid();
      AB.FSM.set('CLEAR');
    } else {
      AB.FSM.set('FAIL');
    }
  };

  /* ---------- 루프 ---------- */

  var accumulator = 0;
  var lastTime = 0;
  var MAX_STEPS_PER_FRAME = 5;

  function frame(now) {
    window.requestAnimationFrame(frame);
    if (!lastTime) lastTime = now;
    var dt = Math.min(now - lastTime, 120);
    lastTime = now;

    if (AB.FSM.isSimulating() && Game.session && Game.session.engine) {
      accumulator += dt;
      var steps = 0;
      while (accumulator >= CFG.STEP_MS && steps < MAX_STEPS_PER_FRAME) {
        AB.Physics.step(Game.session.engine);
        AB.Judge.step(Game.session);
        accumulator -= CFG.STEP_MS;
        steps += 1;
        if (!Game.session || !Game.session.engine) break;   // 전이로 세션이 교체된 경우
      }
      if (accumulator > CFG.STEP_MS * MAX_STEPS_PER_FRAME) accumulator = 0;
      AB.UI.syncHud(Game.session);
    } else {
      accumulator = 0;
    }

    AB.Renderer.draw(Game.session);
  }

  /* ---------- 부트 ---------- */

  function boot() {
    var canvas = document.getElementById('game');
    AB.Renderer.init(canvas);

    AB.FSM.on(function (state) {
      AB.UI.syncScreens(state);
    });

    AB.UI.init({
      startStage: Game.startStage,
      retry: Game.retry,
      pause: Game.pause,
      resume: Game.resume,
      home: Game.home,
      next: Game.next
    });

    AB.Slingshot.init({
      canvas: canvas,
      getSession: function () { return Game.session; },
      canAim: function () { return AB.FSM.is('PLAYING'); }
    });

    if (!AB.Physics.available()) {
      AB.FSM.set('ERROR');
      AB.UI.syncScreens('ERROR');
      AB.Renderer.draw(null);
      return;
    }

    AB.FSM.set('MENU');
    window.requestAnimationFrame(frame);
  }

  AB.Game = Game;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.AB);
