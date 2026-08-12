import Matter from 'matter-js';
import { TOTAL_STAGES, SCORE } from './config.js';
import { createWorld } from './physics/world.js';
import { MATERIALS } from './physics/materials.js';
import { attachDestructionHandler } from './physics/destruction.js';
import { loadStageData, buildStageWorld, clearWorld } from './stage/stage-loader.js';
import { createSlingshot } from './input/slingshot.js';
import { createRenderer } from './render/renderer.js';
import { predictTrajectory } from './render/trajectory.js';
import { createParticleSystem } from './render/particles.js';
import { GameState, createStateMachine } from './core/state-machine.js';
import { createGameLoop } from './core/game-loop.js';
import { loadSave, recordStageResult } from './core/save-data.js';
import { initOverlays } from './ui/overlays.js';
import { createHud } from './ui/hud.js';

const { Engine } = Matter;

// --- 부트스트랩 (§7 main.js: 부트스트랩, 게임 루프 시작) ---
const canvas = document.getElementById('game-canvas');
const { engine, world } = createWorld();
const renderer = createRenderer(canvas);
const particles = createParticleSystem();
const hud = createHud();

/** @type {import('./stage/stage-loader.js').StageState|null} */
let currentStage = null;
let score = 0;
let birdsLaunchedCount = 0;
let allBirdsSettledFlag = false;

const slingshot = createSlingshot({
  world,
  canvas,
  onLaunch: () => {
    birdsLaunchedCount += 1;
    updateHud();
  },
  onBirdSettled: (body) => {
    if (body && currentStage) currentStage.spentBirds.push(body);
    updateHud();
  },
  onAllBirdsSettled: () => {
    allBirdsSettledFlag = true;
  },
});

attachDestructionHandler(engine, () => currentStage, {
  onBlockDestroyed: (body) => {
    const material = body.plugin.material;
    particles.spawn(body.position.x, body.position.y, MATERIALS[material].render.fill);
    addScore(SCORE.block[material]);
  },
  onPigDestroyed: (body) => {
    particles.spawn(body.position.x, body.position.y, '#8bc34a');
    addScore(SCORE.pig);
  },
});

function addScore(points) {
  score += points;
  updateHud();
}

function updateHud() {
  if (!currentStage) return;
  hud.update({
    stageName: currentStage.name,
    birdsTotal: currentStage.birdOrder.length,
    birdsUsed: birdsLaunchedCount,
    score,
  });
}

function computeStars(finalScore, targetScore) {
  if (finalScore >= targetScore.threeStar) return 3;
  if (finalScore >= targetScore.twoStar) return 2;
  if (finalScore >= targetScore.oneStar) return 1;
  return 0;
}

/**
 * 계획서 §5-2: STAGE_LOADING 상태로 진입해 world를 완전히 비우고 새 스테이지를 구성한 뒤
 * 곧바로 PLAYING으로 전이한다(동기 처리 가능한 데이터 크기이므로 별도 스피너 없음).
 * @param {number} stageId
 */
function startStage(stageId) {
  stateMachine.transition(GameState.STAGE_LOADING, { stageId });

  clearWorld(world);
  const stageData = loadStageData(stageId);
  currentStage = buildStageWorld(world, stageData);

  score = 0;
  birdsLaunchedCount = 0;
  allBirdsSettledFlag = false;
  particles.clear();

  slingshot.reset(currentStage.slingshotAnchor, currentStage.birdOrder);
  slingshot.spawnNext();
  updateHud();

  stateMachine.transition(GameState.PLAYING);
}

/** §6-5: 모든 돼지 제거 시 즉시 클리어. 점수는 이 시점에 1회 확정한다(§6-4). */
function finalizeClear() {
  const remainingBirds = currentStage.birdOrder.length - birdsLaunchedCount;
  score += remainingBirds * SCORE.unusedBirdBonus;
  const stars = computeStars(score, currentStage.targetScore);
  const isLast = currentStage.id === TOTAL_STAGES;
  recordStageResult(currentStage.id, stars);
  stateMachine.transition(GameState.STAGE_CLEAR, { score, stars, isLast });
}

/** §6-5: 새 소진 완료 + 돼지 잔존 시 실패. */
function finalizeFailure() {
  stateMachine.transition(GameState.STAGE_FAILED);
}

const stateMachine = createStateMachine({
  [GameState.MAIN_MENU]: {
    onEnter: () => {
      slingshot.detach();
      overlays.showMainMenu(loadSave());
    },
  },
  [GameState.STAGE_LOADING]: {}, // §2: 전이 로직을 명확히 하기 위해 상태만 유지, 실질 작업은 startStage()가 담당
  [GameState.PLAYING]: {
    onEnter: () => {
      overlays.showPlaying();
      slingshot.attach();
    },
  },
  [GameState.PAUSED]: {
    onEnter: () => {
      slingshot.detach();
      overlays.showPaused();
    },
    onExit: () => overlays.hidePaused(),
  },
  [GameState.STAGE_CLEAR]: {
    onEnter: (payload) => {
      slingshot.detach();
      overlays.showClear(payload);
    },
  },
  [GameState.STAGE_FAILED]: {
    onEnter: () => {
      slingshot.detach();
      overlays.showFailed();
    },
  },
});

const overlays = initOverlays({
  onStart: () => startStage(loadSave().unlockedStage),
  onSelectStage: (stageId) => startStage(stageId),
  onPause: () => {
    if (stateMachine.getState() === GameState.PLAYING) stateMachine.transition(GameState.PAUSED);
  },
  onResume: () => stateMachine.transition(GameState.PLAYING),
  onPauseRestart: () => startStage(currentStage.id),
  onPauseMain: () => stateMachine.transition(GameState.MAIN_MENU),
  onNextStage: () => startStage(currentStage.id + 1),
  onClearMain: () => stateMachine.transition(GameState.MAIN_MENU),
  onFailedRestart: () => startStage(currentStage.id),
  onFailedMain: () => stateMachine.transition(GameState.MAIN_MENU),
});

// §5-3: 탭이 숨겨지면 PLAYING -> PAUSED로 자동 전이(고정 타임스텝 재현성 전제를 지키기 위한 보완).
document.addEventListener('visibilitychange', () => {
  if (document.hidden && stateMachine.getState() === GameState.PLAYING) {
    stateMachine.transition(GameState.PAUSED);
  }
});

function update(dtMs) {
  Engine.update(engine, dtMs);
  slingshot.update(dtMs);
  particles.update(dtMs);

  if (stateMachine.getState() === GameState.PLAYING && currentStage) {
    if (currentStage.pigs.length === 0) {
      finalizeClear();
    } else if (allBirdsSettledFlag) {
      finalizeFailure();
    }
  }
}

function render() {
  renderer.clear();
  if (!currentStage) return;

  renderer.drawBackground(currentStage.background);
  renderer.drawGround(currentStage.groundY);
  for (const block of currentStage.blocks) renderer.drawBlock(block);
  for (const pig of currentStage.pigs) renderer.drawPig(pig);
  renderer.drawSlingshot(currentStage.slingshotAnchor);
  for (const bird of currentStage.spentBirds) renderer.drawBird(bird);

  const activeBird = slingshot.getActiveBird();
  if (activeBird) {
    renderer.drawBird(activeBird);
    if (slingshot.isDragging()) {
      const points = predictTrajectory(currentStage.slingshotAnchor, activeBird.position);
      renderer.drawTrajectory(points);
    }
  }

  particles.draw(renderer.ctx);
}

const gameLoop = createGameLoop({
  update,
  render,
  isRunning: () => stateMachine.getState() === GameState.PLAYING,
});

stateMachine.transition(GameState.MAIN_MENU);
gameLoop.start();
