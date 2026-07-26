import { Game } from './game.js';
import stagesData from './stages.json';

const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas, stagesData);

// Menu screen buttons
const menuScreen = document.getElementById('menuScreen');
const stageButtonsContainer = document.getElementById('stageButtonsContainer');

stagesData.stages.forEach((stage, idx) => {
  const btn = document.createElement('button');
  btn.className = 'stage-btn';
  btn.textContent = `Stage ${idx + 1}`;
  btn.addEventListener('click', () => {
    menuScreen.classList.add('hidden');
    game.startStage(idx);
  });
  stageButtonsContainer.appendChild(btn);
});

// Pause button
const pauseBtn = document.getElementById('pauseBtn');
pauseBtn.addEventListener('click', () => {
  game.pause();
});

// Pause modal buttons
document.getElementById('resumeBtn').addEventListener('click', () => {
  game.resume();
});

document.getElementById('retryBtn').addEventListener('click', () => {
  menuScreen.classList.remove('hidden');
  game.goToMenu();
});

document.getElementById('menuBtn').addEventListener('click', () => {
  menuScreen.classList.remove('hidden');
  game.goToMenu();
});

// Result screen buttons
document.getElementById('nextBtn').addEventListener('click', () => {
  game.nextStage();
  menuScreen.classList.add('hidden');
});

document.getElementById('resultMenuBtn').addEventListener('click', () => {
  menuScreen.classList.remove('hidden');
  game.goToMenu();
});

// Start game loop
game.start();
