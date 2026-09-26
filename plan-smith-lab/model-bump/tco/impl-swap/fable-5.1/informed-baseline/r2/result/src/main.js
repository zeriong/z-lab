// main.js — §7 부트스트랩 + 게임 루프
(function () {
  'use strict';

  window.addEventListener('load', function () {
    var canvas = document.getElementById('game-canvas');
    var ctx = canvas.getContext('2d');
    var game = GAME.create(canvas);

    INPUT.attach(canvas, game);
    UI.bind(game);
    UI.setScreen('main');

    var last = 0;

    function loop(t) {
      if (!last) last = t;
      var dt = Math.min((t - last) / 1000, C.MAX_FRAME_DT);
      last = t;
      if (dt < 0) dt = 0;

      GAME.update(dt);       // PLAYING 아니면 내부에서 즉시 반환
      R.draw(ctx, game);     // 항상 그린다

      window.requestAnimationFrame(loop);
    }

    window.requestAnimationFrame(loop);
  });
})();
