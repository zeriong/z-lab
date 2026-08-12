// 부트스트랩 — 상태 머신 소유(MAIN/PLAYING/PAUSED/RESULT), 화면 전환, 게임 루프 (§2.1, §2.3).
// 정지 로직은 여기 한 곳에만 존재: PAUSED/RESULT/MAIN에서는 game.update()를 호출하지 않는다.

import { STAGES } from './stages.js';
import { Game } from './game.js';
import { Renderer } from './renderer.js';
import { FIXED_DT } from './physics.js';
import * as ui from './ui.js';

const canvas = document.getElementById('game-canvas');
const renderer = new Renderer(canvas);

let state = 'MAIN'; // MAIN | PLAYING | PAUSED | RESULT
let game = null;
let currentStage = 0;

const hooks = {
  isPlaying: () => state === 'PLAYING',
  onHUD: (data) => ui.updateHUD(data),
  onFinish: (result) => {
    state = 'RESULT';
    ui.showResult({ ...result, isLast: currentStage === STAGES.length - 1 });
  },
};

function startStage(index) {
  if (game) game.destroy();
  currentStage = index;
  game = new Game(canvas, STAGES[index], hooks);
  state = 'PLAYING';
  ui.showPlaying();
}

function toMain() {
  if (game) {
    game.destroy();
    game = null;
  }
  state = 'MAIN';
  ui.showMain();
}

ui.initUI(
  {
    onStart: (index) => startStage(index),
    onPause: () => {
      if (state !== 'PLAYING') return;
      state = 'PAUSED';
      ui.showPause();
    },
    onResume: () => {
      if (state !== 'PAUSED') return;
      state = 'PLAYING';
      ui.hidePause();
    },
    onRestart: () => startStage(currentStage), // 현재 스테이지 완전 재구성 (§5.2)
    onMain: () => toMain(),
    onNext: () => {
      if (currentStage < STAGES.length - 1) startStage(currentStage + 1);
    },
  },
  STAGES.length
);

// 게임 루프 — rAF + 고정 타임스텝, 프레임 드랍 보정 상한 3회 (§2.3)
const MAX_STEPS = 3;
let last = performance.now();
let acc = 0;

function loop(now) {
  requestAnimationFrame(loop);
  const elapsed = Math.min(now - last, 100);
  last = now;

  if (state === 'PLAYING' && game) {
    acc += elapsed;
    let steps = 0;
    while (acc >= FIXED_DT && steps < MAX_STEPS) {
      game.update(FIXED_DT);
      acc -= FIXED_DT;
      steps += 1;
    }
    if (acc > FIXED_DT) acc = 0; // 스파이럴 방지: 밀린 시간 폐기
  } else {
    acc = 0;
  }

  // PAUSED/RESULT에서도 마지막 상태를 계속 렌더(오버레이 뒤 정지 화면) (§2.3)
  renderer.draw(state === 'MAIN' ? null : game);
}

ui.showMain();
requestAnimationFrame(loop);
