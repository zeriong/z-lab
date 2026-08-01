import { Game } from './game/Game';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const container = document.getElementById('gameContainer')!;
canvas.width = container.clientWidth;
canvas.height = container.clientHeight;

const game = new Game(canvas, ctx);
game.start();

window.addEventListener('resize', () => {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    game.resize(canvas.width, canvas.height);
});
