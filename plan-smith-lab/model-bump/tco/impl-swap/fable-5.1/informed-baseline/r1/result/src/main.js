// main.js — §7 부트스트랩 + 게임 루프. 로드 순서 마지막.
(function () {
  'use strict';

  var canvas = null;
  var ctx = null;
  var game = null;
  var last = 0;

  function loop(t) {
    var dt = Math.min((t - last) / 1000, C.MAX_FRAME_DT);
    if (dt < 0 || isNaN(dt)) dt = 0;
    last = t;
    GAME.update(dt);       // PLAYING 아니면 내부에서 즉시 반환
    R.draw(ctx, game);     // 항상 그린다
    window.requestAnimationFrame(loop);
  }

  window.addEventListener('load', function () {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    game = GAME.create(canvas);
    INPUT.attach(canvas, game);
    UI.bind(game);
    UI.setScreen('main');

    // PLAYING → 탭 비활성(visibilitychange) → PAUSED
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) GAME.pause();
    });

    last = window.performance ? window.performance.now() : 0;
    window.requestAnimationFrame(loop);
  });
})();
