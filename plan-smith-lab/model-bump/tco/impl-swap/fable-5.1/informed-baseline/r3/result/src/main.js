/* main.js — §7 부트스트랩 + 게임 루프. 전역 노출 없음. 로드 순서 마지막. */
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
      var dt = last === 0 ? 0 : Math.min((t - last) / 1000, C.MAX_FRAME_DT);
      last = t;
      GAME.update(dt);      /* PLAYING 아니면 내부에서 즉시 반환 */
      R.draw(ctx, game);    /* 항상 그린다 */
      window.requestAnimationFrame(loop);
    }

    window.requestAnimationFrame(loop);
  });
})();
