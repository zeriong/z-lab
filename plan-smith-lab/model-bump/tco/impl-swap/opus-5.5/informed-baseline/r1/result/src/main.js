/*
 * main.js — 부트스트랩과 게임 루프 (§7). 로드 순서 마지막.
 * 노출: 없음
 * 참조 전역: GAME, INPUT, UI, R, C
 */
(function () {
  'use strict';

  window.addEventListener('load', function () {
    var canvas = document.getElementById('game-canvas');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');

    var game = GAME.create(canvas);
    INPUT.attach(canvas, game);
    UI.bind(game);
    UI.setScreen('main');

    var last = null;
    var errorCount = 0;

    function loop(t) {
      if (last === null) last = t;
      var dt = Math.min((t - last) / 1000, C.MAX_FRAME_DT);
      if (!(dt > 0)) dt = 0;
      last = t;

      try {
        GAME.update(dt);      // PLAYING 이 아니면 내부에서 즉시 반환
        R.draw(ctx, game);    // 항상 그린다
      } catch (err) {
        // 한 프레임의 예외로 루프 전체가 멈추지 않게 한다 (로그는 처음 몇 번만)
        if (errorCount < 5 && window.console && console.error) console.error(err);
        errorCount++;
      }

      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
  });
})();
