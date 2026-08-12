import { Game } from './core/Game';

/** Entry point: grab the shell elements, boot the game, fail loudly if not. */
function boot(): void {
  const canvas = document.getElementById('game');
  const uiRoot = document.getElementById('ui');

  if (!(canvas instanceof HTMLCanvasElement) || !(uiRoot instanceof HTMLElement)) {
    throw new Error('index.html is missing #game / #ui');
  }

  const game = new Game(canvas, uiRoot);
  game.start();

  // Handy while developing; harmless in production.
  (window as unknown as { game: Game }).game = game;
}

boot();
