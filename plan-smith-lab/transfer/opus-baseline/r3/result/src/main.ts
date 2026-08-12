import { Game } from './core/Game';

// Bootstrap the game
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element not found');
}

const game = new Game(canvas);

// Start game loop
let lastTime = performance.now();
let frameCount = 0;
let lastFpsTime = performance.now();

function gameLoop(currentTime: number) {
  const dt = Math.min(currentTime - lastTime, 100); // Clamp to prevent death spiral on tab switch
  lastTime = currentTime;

  game.update(dt);
  game.render();

  // FPS counter for debug
  frameCount++;
  if (currentTime - lastFpsTime >= 1000) {
    const fps = Math.round(frameCount);
    const debugEl = document.getElementById('debug-info');
    if (debugEl) {
      debugEl.textContent = `FPS: ${fps}`;
    }
    frameCount = 0;
    lastFpsTime = currentTime;
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
