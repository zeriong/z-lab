// 부트스트랩 (§9 콜드스타트) — 캔버스·게임·렌더러·UI·입력을 1회 조립하고
// 고정 타임스텝 게임 루프(M15)를 시작한다. rAF 루프는 상시 가동하며
// PAUSED/비플레이 씬에서는 물리 갱신만 스킵한다 (M18).

import './style.css';
import { CFG, WORLD } from './config';
import { Game } from './game';
import { Renderer } from './renderer';
import { bindInput } from './input';
import { buildUI } from './ui';
import { scene } from './scene';

const app = document.getElementById('app');
if (!app) throw new Error('#app 루트가 없다');

const stage = document.createElement('div');
stage.id = 'stage';
const canvas = document.createElement('canvas');
canvas.width = WORLD.width;
canvas.height = WORLD.height;
stage.appendChild(canvas);
app.appendChild(stage);

const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Canvas 2D 컨텍스트를 얻을 수 없다');

const game = new Game();
const renderer = new Renderer(ctx, game);
buildUI(stage, game); // 부팅 시 scene=MAIN → 메인 화면 (M20)
bindInput(canvas, game); // 입력 리스너 1회 바인딩 (§9)

// 반응형 레터박스 (M24): 1280×720 논리 좌표를 비율 유지로 스케일
function resize(): void {
  const s = Math.min(window.innerWidth / WORLD.width, window.innerHeight / WORLD.height);
  stage.style.transform = `translate(-50%, -50%) scale(${s})`;
}
window.addEventListener('resize', resize);
resize();

// 고정 타임스텝 루프 (M15): rAF 누적 시간을 1000/60ms 단위로 소화.
// 탭 복귀 시 누적 dt는 50ms로 클램프 (M25) — 구조물 폭주 방지.
let last = performance.now();
let acc = 0;

function frame(now: number): void {
  let dt = now - last;
  last = now;
  if (dt > CFG.maxFrameDt) dt = CFG.maxFrameDt;

  if (scene() === 'PLAYING') {
    acc += dt;
    // 틱 중 판정으로 씬이 바뀌면(CLEAR/FAIL) 즉시 중단
    while (acc >= CFG.fixedDt && scene() === 'PLAYING') {
      game.tick(CFG.fixedDt);
      acc -= CFG.fixedDt;
    }
  } else {
    // PAUSED 포함 비플레이 씬: 물리·턴 타이머 완전 동결 (M18), 렌더만 지속
    acc = 0;
  }

  renderer.draw();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
