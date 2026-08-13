// Bootstrap and game loop
window.addEventListener('load', () => {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  const game = GAME.create(canvas);

  INPUT.attach(canvas, game);
  UI.bind(game);
  UI.setScreen('main');

  let last = performance.now();

  const loop = (t) => {
    const dt = Math.min((t - last) / 1000, C.MAX_FRAME_DT);
    last = t;

    GAME.update(game, dt);
    UI.updateHud(game);

    // State transitions
    if (game.state === 'CLEAR') {
      UI.showClear(game);
    } else if (game.state === 'FAIL') {
      UI.showFail(game);
    }

    R.draw(ctx, game);

    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);
});
