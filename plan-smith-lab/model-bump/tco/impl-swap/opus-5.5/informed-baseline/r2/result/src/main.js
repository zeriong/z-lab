/*
 * main.js — 부트스트랩과 게임 루프 (§7). 로드 순서 마지막.
 * 노출: 없음
 * 참조: C, GAME, INPUT, UI, R
 */
(function () {
  'use strict';

  window.addEventListener('load', function () {
    var canvas = document.getElementById('game-canvas');
    var ctx = canvas.getContext('2d');

    var game = GAME.create(canvas);
    INPUT.attach(canvas, game);
    UI.bind(game);
    UI.setScreen('main');

    var last = null;

    function loop(t) {
      if (last === null) last = t;
      var dt = Math.min((t - last) / 1000, C.MAX_FRAME_DT);
      if (!(dt > 0)) dt = 0;
      last = t;

      try {
        GAME.update(dt);        // PLAYING 이 아니면 내부에서 즉시 반환
      } catch (e) {
        if (window.console) console.error(e);
      }
      try {
        R.draw(ctx, game);      // 항상 그린다
      } catch (e2) {
        if (window.console) console.error(e2);
      }

      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
  });
})();
