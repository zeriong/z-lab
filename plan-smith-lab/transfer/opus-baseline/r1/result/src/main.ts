import { Game } from './core/Game';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const uiContainer = document.getElementById('uiContainer') as HTMLDivElement;

if (!canvas || !uiContainer) {
  throw new Error('Required DOM elements not found');
}

const game = new Game(canvas, uiContainer);
game.start();
