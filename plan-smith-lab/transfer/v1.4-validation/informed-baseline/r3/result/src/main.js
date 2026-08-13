// src/main.js
// 부트스트랩 및 게임 루프 (§7)
// 의존성: 전체

window.addEventListener('load', () => {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  const game = GAME.create(canvas);

  INPUT.attach(canvas, game);
  UI.bind(game);
  UI.setScreen('main');

  let last = 0;

  function loop(t) {
    const dt = Math.min((t - last) / 1000, C.MAX_FRAME_DT);
    last = t;

    GAME.update(dt);
    R.draw(ctx, game);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
});
