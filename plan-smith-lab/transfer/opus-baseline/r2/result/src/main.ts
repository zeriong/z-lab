import { Game } from './core/Game';

// Initialize game on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game('canvas');
  game.start();

  // Global reference for debugging
  (window as any).game = game;
});
