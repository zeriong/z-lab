// 부트스트랩 — 상태 머신·게임·렌더러·UI·저장 배선 (플랜 S0·S2·S6)

import './styles.css';
import { Game, WORLD_W } from './game/game';
import { StateMachine } from './game/stateMachine';
import { Renderer } from './render/renderer';
import { Screens } from './ui/screens';
import { getStages } from './stages/stages';
import { loadSave, recordClear } from './save/storage';
import * as sound from './audio/sound';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Canvas 2D context unavailable');

// 스테이지 로드 — 스키마 위반은 여기서 명시적 에러 (플랜 S3)
let stages;
try {
  stages = getStages();
} catch (err) {
  document.body.innerHTML = `<pre style="color:#fff;padding:24px">${String(err)}</pre>`;
  throw err;
}

const sm = new StateMachine();
const renderer = new Renderer(ctx);
let save = loadSave();
let game: Game | null = null;
let currentStageId = 1;

// ── 화면 전이 ─────────────────────────────────────────────

function startStage(stageId: number): void {
  const stage = stages.find((s) => s.id === stageId);
  if (!stage) throw new Error(`Unknown stage id: ${stageId}`);
  currentStageId = stageId;
  game = new Game(stage, {
    onCleared({ score, stars }) {
      sm.to('cleared');
      save = recordClear(save, currentStageId, stars, score);
      screens.showCleared(stars, score, currentStageId < stages.length);
    },
    onFailed() {
      sm.to('failed');
      screens.showFailed();
    },
    onHudChange(birds, pigs, score) {
      screens.updateHud(birds, pigs, score);
    },
  });
  sm.to('ingame');
  screens.showIngame();
}

function goMain(): void {
  sm.to('main');
  game = null;
  screens.showMain(save);
}

const screens = new Screens(stages.length, {
  onStageSelect(stageId) {
    if (sm.state === 'main') startStage(stageId);
  },
  onPauseToggle() {
    // 우측 일시정지 버튼 (R3-a). paused 중 재클릭은 재개.
    if (sm.state === 'ingame') {
      sm.to('paused');
      screens.showPause();
    } else if (sm.state === 'paused') {
      sm.to('ingame');
      screens.hidePause();
    }
  },
  onPauseRestart() {
    // 일시정지 → 다시하기: 현 스테이지 리셋 (R3-b)
    if (sm.state === 'paused') {
      sm.to('ingame');
      startStage(currentStageId); // ingame -> ingame은 startStage 내부 to('ingame')와 충돌하므로 아래 참조
    }
  },
  onPauseMain() {
    if (sm.state === 'paused') goMain();
  },
  onResultNext() {
    if (sm.state === 'cleared' && currentStageId < stages.length) startStage(currentStageId + 1);
  },
  onResultRestart() {
    if (sm.state === 'cleared' || sm.state === 'failed') startStage(currentStageId);
  },
  onResultMain() {
    if (sm.state === 'cleared' || sm.state === 'failed') goMain();
  },
});

// startStage는 sm.to('ingame')을 호출한다. paused/cleared/failed → ingame 간선은 전이표에 있으나,
// onPauseRestart에서 먼저 to('ingame') 후 startStage를 부르면 ingame → ingame 전이가 발생한다.
// 전이표에 자기 전이가 없으므로, startStage 호출 전 상태가 이미 ingame이면 to를 생략하도록 보정한다.
const originalTo = sm.to.bind(sm);
sm.to = (next) => {
  if (sm.state === next) return; // 자기 전이는 무시 (다시하기 리셋 경로)
  originalTo(next);
};

// ── 입력: PointerEvent 통일 (가정 A2 선제 완화 — 마우스·터치 동일 경로) ──

function toWorld(e: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * WORLD_W,
    y: ((e.clientY - rect.top) / rect.height) * (canvas.height / canvas.width) * WORLD_W,
  };
}

canvas.addEventListener('pointerdown', (e) => {
  sound.unlock(); // 첫 제스처에서 AudioContext resume (플랜 S5)
  if (sm.state === 'ingame' && game) {
    canvas.setPointerCapture(e.pointerId);
    const p = toWorld(e);
    game.pointerDown(p.x, p.y);
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (sm.state === 'ingame' && game) {
    const p = toWorld(e);
    game.pointerMove(p.x, p.y);
  }
});

canvas.addEventListener('pointerup', () => {
  if (sm.state === 'ingame' && game) game.pointerUp();
});

canvas.addEventListener('pointercancel', () => {
  if (sm.state === 'ingame' && game) game.pointerUp();
});

// 오디오 언락은 어떤 첫 클릭에서도 (버튼 포함)
document.addEventListener('pointerdown', () => sound.unlock(), { once: true });

// ── 메인 루프: paused 동안 game.update 미호출 → 물리 스텝 0 (R3-c) ──

let last = performance.now();

function frame(now: number): void {
  const dt = Math.min(now - last, 100); // 탭 복귀 시 폭주 방지
  last = now;

  if (sm.state === 'ingame' && game) {
    game.update(dt);
  }

  renderer.draw(sm.state === 'main' ? null : game);
  requestAnimationFrame(frame);
}

// 검증 훅: paused 10초 동안 물리 스텝 카운터 0 확인용 (플랜 완료 정의 2)
Object.defineProperty(window, '__physicsSteps', {
  get: () => (game ? game.world.stepCount : 0),
});

screens.showMain(save);
requestAnimationFrame(frame);
