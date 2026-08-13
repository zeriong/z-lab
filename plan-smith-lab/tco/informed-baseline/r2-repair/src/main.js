// Bootstrap
window.addEventListener('load', () => {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  const game = GAME.create(canvas);
  INPUT.attach(canvas, game);
  UI.bind(game);
  UI.setScreen('main');

  let lastTime = performance.now();

  function loop(t) {
    const dt = Math.min((t - lastTime) / 1000, C.MAX_FRAME_DT);
    lastTime = t;

    GAME.update(game, dt);
    R.draw(ctx, game);

    // Update state-based UI
    if (game.state === 'CLEAR') {
      UI.showClear(game);
    } else if (game.state === 'FAIL') {
      UI.showFail(game);
    } else if (game.state === 'PLAYING' || game.state === 'PAUSED') {
      UI.updateHud(game);
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
});
