import './style.css';
import { STEP_MS, VIRTUAL_H, VIRTUAL_W } from './core/constants.ts';
import { Game } from './game/Game.ts';
import { Particles } from './game/Particles.ts';
import { Renderer } from './game/Renderer.ts';
import { Slingshot, launchVelocity } from './game/Slingshot.ts';
import { Stage } from './game/Stage.ts';
import { Hud } from './ui/Hud.ts';
import { MainMenu } from './ui/MainMenu.ts';
import { PauseOverlay } from './ui/PauseOverlay.ts';
import { ResultOverlay } from './ui/ResultOverlay.ts';

// --- DOM 골격 ---------------------------------------------------------------
const app = document.getElementById('app')!;
const root = document.createElement('div');
root.id = 'game-root';
app.appendChild(root);

const canvas = document.createElement('canvas');
canvas.id = 'game-canvas';
root.appendChild(canvas);

// letterbox 스케일링: 1280×720 가상 해상도를 창에 맞춰 균등 축척
function resize(): void {
  const scale = Math.min(window.innerWidth / VIRTUAL_W, window.innerHeight / VIRTUAL_H);
  root.style.transform = `scale(${scale})`;
}
window.addEventListener('resize', resize);
resize();

// 포인터 좌표 → 가상 좌표
function toVirtual(clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * VIRTUAL_W,
    y: ((clientY - rect.top) / rect.height) * VIRTUAL_H,
  };
}

// --- 구성 요소 ----------------------------------------------------------------
const stage = new Stage();
const particles = new Particles();
const slingshot: Slingshot = new Slingshot(canvas, stage, toVirtual, () => game.isPlaying);
const renderer = new Renderer(canvas, stage, slingshot, particles);

const hud = new Hud(root, () => game.togglePause());
const pause = new PauseOverlay(root, {
  onResume: () => game.resume(),
  onRetry: () => game.retry(),
  onMain: () => game.toMain(),
});
const result = new ResultOverlay(root, {
  onNext: () => game.nextStage(),
  onRetry: () => game.retry(),
  onMain: () => game.toMain(),
});
const menu = new MainMenu(root, (id) => game.startStage(id));

const game: Game = new Game(stage, slingshot, particles, { menu, hud, pause, result });
game.start();

// --- 루프: 고정 타임스텝 누적기 ---------------------------------------------------
// 물리는 Playing 상태에서만 60Hz 고정 스텝으로 진행 — 프레임레이트와 무관하게 궤적 재현.
let last = performance.now();
let acc = 0;

function frame(now: number): void {
  requestAnimationFrame(frame);
  let dt = now - last;
  last = now;
  if (dt > 250) dt = 250; // 탭 복귀 등 큰 공백은 버린다

  if (game.isPlaying) {
    acc += dt;
    while (acc >= STEP_MS) {
      stage.step();
      acc -= STEP_MS;
    }
    particles.update(dt);
    hud.update(game.currentStageId, stage.score, stage.birdsRemaining);
  } else {
    acc = 0; // 일시정지 해제 시 물리 몰아치기 방지
  }

  renderer.draw(); // Paused에서도 마지막 상태를 계속 그린다
}
requestAnimationFrame(frame);

// --- 자동화 테스트용 디버그 훅 (게임플레이에는 관여하지 않음) -------------------------
declare global {
  interface Window {
    __ab?: unknown;
  }
}
window.__ab = {
  game,
  stage,
  // angleDeg: 수평 기준 발사각(위 방향 +), power: 0..1 (최대 당김 비율)
  fire(angleDeg: number, power: number): void {
    const bird = stage.currentBird;
    if (!game.isPlaying || stage.phase !== 'aim' || !bird) return;
    const rad = (angleDeg * Math.PI) / 180;
    const pull = { x: Math.cos(rad) * 90 * power, y: -Math.sin(rad) * 90 * power };
    stage.fire(launchVelocity(pull, bird.type));
  },
};
