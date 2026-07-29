// 부트스트랩 + 고정 타임스텝 루프 + 상태 머신 배선.

import { StateMachine, States } from './game/StateMachine.js';
import { Stage } from './game/Stage.js';
import { Slingshot } from './game/Slingshot.js';
import { Renderer } from './render.js';
import { STAGES } from './data/stages.js';
import { Hud } from './ui/Hud.js';
import { PauseOverlay } from './ui/PauseOverlay.js';
import { ResultOverlay } from './ui/ResultOverlay.js';
import { MainMenu } from './ui/MainMenu.js';
import { VW, VH, STEP_MS, STORAGE_KEY } from './constants.js';

const { Engine } = Matter;

// ---------- 진행도 (localStorage) ----------

function highestCleared() {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveProgress(stageId) {
  try {
    if (stageId > highestCleared()) localStorage.setItem(STORAGE_KEY, String(stageId));
  } catch {
    /* 저장 불가 환경 무시 */
  }
}

function unlockedCount() {
  return Math.min(highestCleared() + 1, STAGES.length);
}

// ---------- 핵심 객체 ----------

const canvas = document.getElementById('canvas');
const engine = Engine.create({ enableSleeping: true });
const fsm = new StateMachine(States.MAIN_MENU);
const renderer = new Renderer(canvas);

let currentStageId = 1;

const stage = new Stage(engine, {
  onClear(score, bonus) {
    if (fsm.transition(States.STAGE_CLEAR)) {
      saveProgress(currentStageId);
      result.showClear(currentStageId, score, bonus, currentStageId < STAGES.length);
    }
  },
  onFail() {
    if (fsm.transition(States.STAGE_FAILED)) {
      result.showFail(currentStageId);
    }
  },
});

const slingshot = new Slingshot(canvas, () => stage, () => fsm.is(States.PLAYING));

function startStage(id) {
  currentStageId = id;
  stage.load(STAGES[id - 1]);
}

// ---------- UI ----------

const hud = new Hud(() => {
  // ⏸ 버튼: Playing→Paused, Paused에서 재클릭 시 해제
  if (fsm.is(States.PLAYING)) fsm.transition(States.PAUSED);
  else if (fsm.is(States.PAUSED)) fsm.transition(States.PLAYING);
});

const pause = new PauseOverlay({
  onResume: () => fsm.transition(States.PLAYING),
  onRetry: () => {
    if (fsm.transition(States.PLAYING)) startStage(currentStageId); // 동일 스테이지 재로드
  },
  onMain: () => fsm.transition(States.MAIN_MENU),
});

const result = new ResultOverlay({
  onNext: () => {
    if (currentStageId < STAGES.length && fsm.transition(States.PLAYING)) {
      startStage(currentStageId + 1);
    }
  },
  onRetry: () => {
    if (fsm.transition(States.PLAYING)) startStage(currentStageId);
  },
  onMain: () => fsm.transition(States.MAIN_MENU),
});

const menu = new MainMenu((id) => {
  if (fsm.transition(States.PLAYING)) startStage(id);
});

// 상태별 UI 가시성 — 전이표 밖의 조작은 StateMachine이 no-op으로 걸러준다.
fsm.onChange((to) => {
  menu.setVisible(to === States.MAIN_MENU);
  if (to === States.MAIN_MENU) menu.refresh(unlockedCount());
  hud.setVisible(to === States.PLAYING || to === States.PAUSED);
  pause.setVisible(to === States.PAUSED);
  if (to !== States.STAGE_CLEAR && to !== States.STAGE_FAILED) result.hide();
  if (to !== States.PLAYING) slingshot.cancelDrag();
});

menu.refresh(unlockedCount());
menu.setVisible(true);

// ---------- letterbox 스케일링 (1280x720 가상 해상도) ----------

const gameEl = document.getElementById('game');
function fit() {
  const scale = Math.min(window.innerWidth / VW, window.innerHeight / VH);
  gameEl.style.width = `${Math.floor(VW * scale)}px`;
  gameEl.style.height = `${Math.floor(VH * scale)}px`;
}
window.addEventListener('resize', fit);
fit();

// ---------- 고정 타임스텝 루프 (accumulator) ----------
// Paused에서는 물리를 완전히 중단하되 렌더는 계속해 정지 화면을 유지.

let last = performance.now();
let acc = 0;

function frame(now) {
  const dt = Math.min(now - last, 250); // 탭 복귀 시 스파이럴 방지
  last = now;

  if (fsm.is(States.PLAYING) && stage.def) {
    acc += dt;
    while (acc >= STEP_MS) {
      stage.update(STEP_MS);
      Engine.update(engine, STEP_MS);
      acc -= STEP_MS;
    }
  } else {
    acc = 0;
  }

  renderer.draw(stage, slingshot);

  if (fsm.is(States.PLAYING) || fsm.is(States.PAUSED)) {
    hud.set(currentStageId, stage.score, stage.remainingBirds());
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
