// 부트스트랩 + 게임 루프.
// rAF 루프가 물리 틱 호출을 소유한다 — PLAYING 상태에서만 Engine.update가 실행되므로
// 일시정지 중 물리 세계는 완전 정지한다(A3). 고정 dt 60Hz 누산기 방식(A1 리플레이 재현성).

import {
  WIDTH, HEIGHT, FIXED_DT, BIRD_SPENT_MS, BIRD_REST_MIN_MS,
  SETTLE_SPEED, SETTLE_ANGULAR, STAGE_COUNT,
} from './constants.js';
import { fsm, States } from './state.js';
import {
  createPhysicsWorld, destroyPhysicsWorld, stepPhysics,
  flushRemovals, countKind, bodyCount,
} from './physics.js';
import { loadStage, buildWorld, spawnBird } from './stage.js';
import { Slingshot } from './slingshot.js';
import { Judge } from './judge.js';
import { render } from './renderer.js';
import { Replay } from './replay.js';
import { UI } from './ui.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const game = {
  stageNum: 1,
  stageData: null,
  ph: null,
  sling: null,
  judge: null,
  replay: null,
  birdsQueue: 0,
  loadedBird: null,
  activeBird: null,
  birdAge: 0,
  devMode: new URLSearchParams(location.search).has('dev'),
  loading: false,
};

// ---------- 스테이지 수명주기 ----------

async function startStage(n) {
  if (game.loading || n < 1 || n > STAGE_COUNT) return;
  game.loading = true;
  try {
    const data = await loadStage(n);
    game.stageNum = n;
    game.stageData = data;
    resetWorld(data);
    if (fsm.state !== States.PLAYING) fsm.transition(States.PLAYING);
    ui.updateHud(game);
  } catch (err) {
    console.error('[stage] 로드 실패', err);
  } finally {
    game.loading = false;
  }
}

// 월드 전체 해체·재구축 — 다시하기/재진입의 유일한 경로(상태 오염 차단).
function resetWorld(data) {
  teardownWorld();
  game.ph = createPhysicsWorld();
  buildWorld(game.ph, data);

  game.sling = new Slingshot(data.slingshot);
  game.sling.onLaunch = (bird) => {
    game.activeBird = bird;
    game.loadedBird = null;
    game.birdAge = 0;
  };

  game.judge = new Judge();
  game.replay = null;
  game.birdsQueue = data.birds;
  game.activeBird = null;
  game.loadedBird = null;
  game.birdAge = 0;
  loadNextBird();
}

function teardownWorld() {
  if (!game.ph) return;
  destroyPhysicsWorld(game.ph);
  game.ph = null;
  game.sling = null;
  game.judge = null;
  game.replay = null;
  game.activeBird = null;
  game.loadedBird = null;
}

function loadNextBird() {
  if (game.birdsQueue <= 0) return;
  game.birdsQueue--;
  game.loadedBird = spawnBird(game.ph, game.sling.anchor.x, game.sling.anchor.y);
  game.sling.load(game.loadedBird);
}

// ---------- UI 콜백 ----------

const ui = new UI({
  startStage: (n) => startStage(n),
  pause: () => {
    if (fsm.state === States.PLAYING) fsm.transition(States.PAUSED);
  },
  resume: () => {
    if (fsm.state === States.PAUSED) fsm.transition(States.PLAYING);
  },
  retry: () => {
    if (!game.stageData) return;
    resetWorld(game.stageData);
    if (fsm.state !== States.PLAYING) fsm.transition(States.PLAYING);
    ui.updateHud(game);
  },
  toMain: () => {
    fsm.transition(States.MAIN);
  },
  nextStage: () => {
    if (game.stageNum < STAGE_COUNT) startStage(game.stageNum + 1);
  },
  replay: () => {
    // 개발 모드: 월드 재구축 후 동봉 솔루션 시퀀스를 자동 발사.
    if (!game.stageData) return;
    resetWorld(game.stageData);
    game.replay = new Replay(game);
    game.replay.start(game.stageData.solution);
    if (fsm.state !== States.PLAYING) fsm.transition(States.PLAYING);
  },
});

ui.setDevMode(game.devMode);

fsm.onChange((from, to) => {
  if (to === States.MAIN) teardownWorld(); // 잔존 바디·리스너 0 보장
  ui.sync(to, game);
});
ui.sync(fsm.state, game);

// ---------- 입력 (포인터 이벤트 추상화 — 마우스 기준) ----------

function canvasPos(ev) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (ev.clientX - rect.left) * (WIDTH / rect.width),
    y: (ev.clientY - rect.top) * (HEIGHT / rect.height),
  };
}

function inputAllowed() {
  return (
    fsm.state === States.PLAYING &&
    game.sling &&
    !(game.replay && game.replay.active)
  );
}

canvas.addEventListener('pointerdown', (ev) => {
  if (!inputAllowed()) return;
  game.sling.pointerDown(canvasPos(ev));
});
window.addEventListener('pointermove', (ev) => {
  if (!inputAllowed()) return;
  game.sling.pointerMove(canvasPos(ev));
});
window.addEventListener('pointerup', () => {
  if (!inputAllowed()) return;
  game.sling.pointerUp();
});

// ---------- 게임 틱 ----------

function tick(dt) {
  stepPhysics(game.ph, dt);
  flushRemovals(game.ph);
  updateActiveBird(dt);

  if (game.replay) game.replay.tick(dt);

  const pigs = countKind(game.ph, 'pig');
  const birdsExhausted =
    game.birdsQueue === 0 && !game.loadedBird && !game.activeBird;
  const result = game.judge.tick(game.ph, dt, pigs, birdsExhausted);

  ui.updateHud(game);

  if (result === 'CLEAR') fsm.transition(States.CLEAR);
  else if (result === 'FAIL') fsm.transition(States.FAIL);
}

// 발사체 소진: 화면 이탈 / 정지 / 시간 초과 → 제거 후 다음 새 장전.
function updateActiveBird(dt) {
  const b = game.activeBird;
  if (!b) return;
  game.birdAge += dt;

  const off =
    b.position.x < -100 || b.position.x > WIDTH + 150 || b.position.y > HEIGHT + 100;
  const resting =
    game.birdAge > BIRD_REST_MIN_MS &&
    b.speed < SETTLE_SPEED &&
    b.angularSpeed < SETTLE_ANGULAR;

  if (off || resting || game.birdAge > BIRD_SPENT_MS) {
    Matter.Composite.remove(game.ph.engine.world, b);
    game.activeBird = null;
    loadNextBird();
  }
}

// ---------- 루프 (고정 타임스텝 누산기) ----------

let last = performance.now();
let acc = 0;

function frame(now) {
  const elapsed = Math.min(now - last, 100); // 탭 복귀 시 폭주 방지
  last = now;
  acc += elapsed;

  while (acc >= FIXED_DT) {
    if (fsm.state === States.PLAYING && game.ph) tick(FIXED_DT);
    acc -= FIXED_DT;
  }

  render(ctx, game);

  if (game.devMode && game.ph) {
    ui.updateDevInfo(
      `state: ${fsm.state}\n` +
      `bodies: ${bodyCount(game.ph)}\n` +
      `settleTicks: ${game.ph.settleTicks}\n` +
      `replay: ${game.replay && game.replay.active ? 'on' : 'off'}`
    );
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
