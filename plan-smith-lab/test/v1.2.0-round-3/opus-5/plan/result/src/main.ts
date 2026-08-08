/**
 * 부트스트랩. canvas/DOM 마운트, rAF 루프 소유, 상태 머신 배선.
 *
 * 이 파일이 지키는 규약(§3, §8):
 *  - fixedUpdate 내부 순서: input → Engine.update → 데미지 확정 → 화면밖 정리 → settle → camera → 파티클
 *  - PAUSED에서는 Engine.update를 절대 호출하지 않는다 (sm.isSimulating()이 false)
 *  - 다시하기/메인으로는 부분 리셋이 아니라 월드 전체 파기 후 재생성이다
 */

import './style.css';

import { Engine } from 'matter-js';
import type { Vector } from 'matter-js';

import { startLoop, type LoopHandle } from './core/loop';
import { StateMachine } from './core/stateMachine';
import { InputManager, LOGICAL_H, LOGICAL_W } from './core/input';
import { audio } from './core/audio';
import {
  defaultProgress,
  loadProgress,
  recordClear,
  saveProgress,
  type Progress,
} from './core/storage';

import {
  birdsRemaining,
  buildWorld,
  cleanupOffWorld,
  consumeBird,
  destroyWorld,
  isOffWorld,
  loadNextBird,
  prerollWorld,
  type GameWorld,
} from './game/world';
import { flushDamage } from './game/damage';
import { Slingshot } from './game/slingshot';
import { TrajectoryPredictor } from './game/trajectory';
import { FlightWatcher, Settle } from './game/settle';
import { Camera } from './game/camera';
import { clearBonus, starsFor } from './game/score';
import { tickAbilities, triggerAbility, type AbilityResult } from './game/abilities';
import { MATERIAL } from './game/entities';

import { Renderer } from './render/renderer';
import { ParticleSystem } from './render/particles';
import { DebugStats, drawDebug, isDebugEnabled } from './render/debug';

import { Hud } from './ui/hud';
import { PauseOverlay } from './ui/pauseOverlay';
import { ResultOverlay } from './ui/resultOverlay';
import { MainMenu } from './ui/mainMenu';
import { StageSelect } from './ui/stageSelect';

import { STAGE_COUNT, getStage, runStageValidation } from './stages';

// ---------------------------------------------------------------- 마운트

const stageRoot = document.getElementById('stage-root') as HTMLDivElement | null;
const canvas = document.getElementById('game') as HTMLCanvasElement | null;
const uiLayer = document.getElementById('ui-layer') as HTMLDivElement | null;

if (!stageRoot || !canvas || !uiLayer) {
  throw new Error('index.html의 필수 요소(#stage-root, #game, #ui-layer)가 없다');
}

const DEBUG = isDebugEnabled();

const sm = new StateMachine();
const camera = new Camera();
const renderer = new Renderer(canvas);
const particles = new ParticleSystem();
const input = new InputManager(canvas, () => camera.x);
const predictor = new TrajectoryPredictor();
const settle = new Settle();
const flight = new FlightWatcher();
const stats = new DebugStats();

let progress: Progress = loadProgress();
let gw: GameWorld | null = null;
let sling: Slingshot | null = null;
let currentStageId = 1;
let trajectory: Vector[] = [];
let hudKey = '';
let loop: LoopHandle | null = null;

// ---------------------------------------------------------------- letterbox (§1.5)

function fitViewport(): void {
  const scale = Math.min(window.innerWidth / LOGICAL_W, window.innerHeight / LOGICAL_H);
  stageRoot!.style.transform = `scale(${scale})`;
}
window.addEventListener('resize', () => {
  fitViewport();
  renderer.applyDpr();
});
fitViewport();

// ---------------------------------------------------------------- UI

const mainMenu = new MainMenu(uiLayer, {
  onStart: () => {
    audio.unlock();
    audio.play('ui');
    mainMenu.hide();
    sm.dispatch('START');
    stageSelect.show(progress);
  },
  onResetProgress: () => {
    progress = defaultProgress();
    saveProgress(progress);
  },
});

const stageSelect = new StageSelect(uiLayer, {
  onSelect: (id) => {
    audio.unlock();
    audio.play('ui');
    stageSelect.hide();
    currentStageId = id;
    sm.dispatch('SELECT');
    loadStage();
  },
  onBack: () => {
    stageSelect.hide();
    sm.dispatch('BACK');
    mainMenu.show();
  },
});

const hud = new Hud(uiLayer, {
  onPause: () => doPause(),
  onToggleMute: () => {
    audio.setMuted(!audio.isMuted());
    hudKey = ''; // 강제 갱신
  },
});
hud.hide();

const pauseOverlay = new PauseOverlay(uiLayer, {
  onResume: () => doResume(),
  onRetry: () => doRetry('PAUSED'),
  onMain: () => doMain('PAUSED'),
});

const resultOverlay = new ResultOverlay(uiLayer, {
  onNext: () => doNext(),
  onRetry: () => doRetry('RESULT'),
  onMain: () => doMain('RESULT'),
});

// ---------------------------------------------------------------- 스테이지 로드/파기

/** §8.3 월드 파기 체크리스트 — RETRY/TO_MAIN 공통 */
function teardown(): void {
  destroyWorld(gw);
  gw = null;
  sling = null;
  predictor.destroy();
  trajectory = [];
  particles.clear();
  settle.reset();
  flight.reset();
  input.reset();
  camera.reset();
  audio.stopAll();
  stats.reset();
}

/** LOADING 상태에서만 호출된다. (a) 파기 → (b) 빌드 → (c) 프리롤 → (d) PLAYING */
function loadStage(): void {
  teardown();

  const stage = getStage(currentStageId);
  if (!stage) {
    console.error(`[main] 존재하지 않는 스테이지: ${currentStageId}`);
    sm.dispatch('TO_MAIN');
    mainMenu.show();
    return;
  }

  gw = buildWorld(stage);
  prerollWorld(gw);
  sling = new Slingshot(gw);
  camera.setWorldWidth(stage.world.width);
  loadNextBird(gw);

  sm.dispatch('built'); // → PLAYING / AIMING
  hud.show();
  hudKey = '';
  updateHud();
  loop?.resetClock();
}

// ---------------------------------------------------------------- 상태 전이 헬퍼

function doPause(): void {
  if (!sm.isSimulating()) return;
  // 순서 고정: 상태 전이가 먼저, DOM 표시가 나중 (§9.2)
  sm.dispatch('PAUSE');
  audio.suspend();
  pauseOverlay.show(hud.pauseBtn);
}

function doResume(): void {
  if (!sm.is('PAUSED')) return;
  pauseOverlay.hide();
  sm.dispatch('RESUME');
  audio.resume();
  loop?.resetClock(); // 정지 동안 쌓인 시간 부채를 버린다
}

function doRetry(from: 'PAUSED' | 'RESULT'): void {
  if (from === 'PAUSED') pauseOverlay.hide();
  else resultOverlay.hide();
  audio.resume();
  sm.dispatch('RETRY'); // → LOADING
  loadStage();
}

function doMain(from: 'PAUSED' | 'RESULT'): void {
  if (from === 'PAUSED') pauseOverlay.hide();
  else resultOverlay.hide();
  audio.resume();
  sm.dispatch('TO_MAIN');
  teardown();
  hud.hide();
  mainMenu.show();
}

function doNext(): void {
  resultOverlay.hide();
  if (currentStageId >= STAGE_COUNT) {
    sm.dispatch('TO_SELECT');
    teardown();
    hud.hide();
    stageSelect.show(progress);
    return;
  }
  currentStageId += 1;
  sm.dispatch('NEXT'); // → LOADING
  loadStage();
}

// ---------------------------------------------------------------- 입력 처리 (§3-1)

function abilityFx(r: AbilityResult): void {
  if (!r.used) return;
  if (r.kind === 'bomb') {
    particles.explosion(r.x, r.y);
    audio.play('explode');
  } else if (r.kind === 'boost') {
    particles.dust(r.x, r.y);
    audio.play('launch', 0.6);
  }
}

function beginAim(): void {
  if (!gw) return;
  sm.dispatch('pointerDownOnBird');
  predictor.build(gw);
}

function updateTrajectory(): void {
  if (!gw || !sling) return;
  const st = sling.state();
  trajectory = predictor.predict(
    st.birdPos,
    st.launchVel,
    gw.stage.world.width,
    gw.stage.world.height,
  );
}

function endDrag(): void {
  trajectory = [];
  predictor.destroy();
}

function handlePointer(): void {
  if (!gw || !sling) return;

  for (const s of input.consume()) {
    const pt: Vector = { x: s.x, y: s.y };

    if (s.phase === 'down') audio.unlock();

    if (sm.isPlayingSub('AIMING')) {
      if (s.phase === 'down' && sling.canGrab(pt)) {
        beginAim();
        sling.beginDrag(pt);
        updateTrajectory();
        audio.play('pull');
      }
      continue;
    }

    if (sm.isPlayingSub('DRAGGING')) {
      if (s.phase === 'move') {
        sling.moveTo(pt);
        updateTrajectory();
      } else if (s.phase === 'up') {
        if (sling.release()) {
          endDrag();
          flight.reset();
          sm.dispatch('launch');
          audio.play('launch');
        } else {
          endDrag();
          sm.dispatch('cancelDrag');
        }
      } else if (s.phase === 'cancel') {
        sling.cancel();
        endDrag();
        sm.dispatch('cancelDrag');
      }
      continue;
    }

    if (sm.isPlayingSub('FLYING') && s.phase === 'down') {
      const r = triggerAbility(gw);
      if (r.used) {
        sm.dispatch('ability');
        abilityFx(r);
      }
    }
  }
}

function handleKeys(): void {
  if (!gw || !sling) return;

  for (const k of input.consumeKeys()) {
    if (k.code === 'Escape' || k.code === 'KeyP' || k.code === 'KeyM') continue; // 전역 리스너가 처리

    if (sm.isPlayingSub('AIMING')) {
      if (k.code === 'ArrowLeft' || k.code === 'ArrowRight' || k.code === 'ArrowUp' || k.code === 'ArrowDown') {
        beginAim();
        sling.applyKeyboardAim();
        updateTrajectory();
      }
      continue;
    }

    if (sm.isPlayingSub('DRAGGING')) {
      switch (k.code) {
        case 'ArrowLeft':
          sling.nudgeAngle(-1);
          updateTrajectory();
          break;
        case 'ArrowRight':
          sling.nudgeAngle(1);
          updateTrajectory();
          break;
        case 'ArrowUp':
          sling.nudgePower(0.02);
          updateTrajectory();
          break;
        case 'ArrowDown':
          sling.nudgePower(-0.02);
          updateTrajectory();
          break;
        case 'Space':
          if (sling.release()) {
            endDrag();
            flight.reset();
            sm.dispatch('launch');
            audio.play('launch');
          } else {
            endDrag();
            sm.dispatch('cancelDrag');
          }
          break;
        default:
          break;
      }
      continue;
    }

    if (sm.isPlayingSub('FLYING') && k.code === 'Space') {
      const r = triggerAbility(gw);
      if (r.used) {
        sm.dispatch('ability');
        abilityFx(r);
      }
    }
  }
}

// ---------------------------------------------------------------- 판정 (§7)

function resolveSettle(): void {
  if (!gw) return;
  const stage = gw.stage;

  // 1) 돼지가 모두 사라졌으면 CLEAR (마지막 새를 썼더라도 FAIL보다 우선한다)
  if (gw.pigsAlive === 0) {
    gw.score += clearBonus(birdsRemaining(gw));
    const stars = starsFor(gw.score, stage.starThresholds);
    progress = recordClear(progress, stage.id, stars, gw.score, STAGE_COUNT);
    sm.dispatch('settledClear');
    audio.play('clear');
    resultOverlay.show({
      cleared: true,
      score: gw.score,
      best: progress.best[stage.id] ?? gw.score,
      stars,
      isLast: stage.id >= STAGE_COUNT,
    });
    return;
  }

  // 2) 남은 새가 없으면 FAIL
  if (birdsRemaining(gw) === 0) {
    sm.dispatch('settledFail');
    audio.play('fail');
    resultOverlay.show({
      cleared: false,
      score: gw.score,
      best: progress.best[stage.id] ?? 0,
      stars: 0,
      isLast: stage.id >= STAGE_COUNT,
    });
    return;
  }

  // 3) 다음 새 로드
  loadNextBird(gw);
  sling?.reset();
  settle.reset();
  flight.reset();
  sm.dispatch('settledNext');
}

// ---------------------------------------------------------------- fixedUpdate (§3)

function consumeDestroyEvents(): void {
  if (!gw) return;

  for (const ev of gw.destroyEvents) {
    const spec = MATERIAL[ev.material];
    particles.burst(ev.x, ev.y, spec.debris, ev.radius * 2);
    audio.play(ev.kind === 'pig' ? 'pig' : 'break');
  }
  gw.destroyEvents.length = 0;

  for (const hit of gw.hitEvents) {
    const name =
      hit.material === 'ice' ? 'hitIce' : hit.material === 'stone' ? 'hitStone' : 'hitWood';
    audio.play(name, hit.intensity);
  }
  gw.hitEvents.length = 0;
}

function fixedUpdate(dt: number): void {
  if (!gw || !sling) return;

  // 1. 입력
  handlePointer();
  handleKeys();
  if (!gw || !sling) return; // 입력 처리 중 월드가 파기됐을 수 있다

  // 2. 물리
  const t0 = performance.now();
  Engine.update(gw.engine, dt);
  stats.markStep(performance.now() - t0);
  gw.step++;

  // 3. 데미지 확정 (콜백 안이 아니라 여기서 월드를 변경한다)
  flushDamage(gw);

  // black bird 자동 폭발
  const auto = tickAbilities(gw);
  if (auto.used) abilityFx(auto);

  // 4. 화면 밖 정리
  cleanupOffWorld(gw);
  consumeDestroyEvents();

  // 5. 비행/정지 판정
  if (sm.isPlayingSub('FLYING')) {
    const off = gw.bird ? isOffWorld(gw, gw.bird) : true;
    if (flight.tick(gw, off)) {
      consumeBird(gw);
      settle.reset();
      sm.dispatch('birdDone');
    }
  } else if (sm.isPlayingSub('SETTLING')) {
    if (settle.tick(gw)) resolveSettle();
  }

  // 6. 카메라
  if (sm.isPlayingSub('FLYING')) camera.follow(gw.bird);
  else if (sm.isPlayingSub('SETTLING')) camera.hold();
  else camera.returnHome();

  // 7. 파티클
  particles.update();
}

// ---------------------------------------------------------------- HUD 갱신

function updateHud(): void {
  if (!gw) return;
  const remaining = [...gw.birdQueue];
  if (gw.bird) {
    const type = gw.stage.birds[gw.birdsUsed];
    if (type) remaining.unshift(type);
  }
  const key = `${gw.stage.id}|${gw.score}|${remaining.length}|${gw.pigsAlive}|${audio.isMuted()}`;
  if (key === hudKey) return;
  hudKey = key;

  hud.update({
    stageId: gw.stage.id,
    stageName: gw.stage.name,
    score: gw.score,
    remaining,
    total: gw.stage.birds,
    pigsAlive: gw.pigsAlive,
    hint: gw.stage.hint,
    muted: audio.isMuted(),
  });
}

// ---------------------------------------------------------------- 렌더

function render(): void {
  const aim = sling && sm.isPlayingSub('DRAGGING') ? sling.state() : null;
  renderer.draw({
    gw,
    cameraX: camera.x,
    aim,
    trajectory: aim ? trajectory : [],
    particles,
  });

  if (gw) updateHud();
  if (DEBUG) {
    drawDebug(renderer.ctx2d(), gw, stats, camera.x, [
      `state ${sm.get().state}/${sm.get().sub}`,
      `particles ${particles.count()}`,
    ]);
  }
  stats.markFrame();
}

// ---------------------------------------------------------------- 전역 키/포커스

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.code === 'KeyP') {
    if (pauseOverlay.isOpen()) {
      // Esc = 계속하기 (오버레이 자체에서도 처리하지만, 포커스가 밖에 있을 수 있다)
      if (e.key === 'Escape') {
        e.preventDefault();
        doResume();
      }
      return;
    }
    if (resultOverlay.isOpen()) return;
    if (sm.isSimulating()) {
      e.preventDefault();
      doPause();
    }
    return;
  }
  if (e.code === 'KeyM') {
    audio.setMuted(!audio.isMuted());
    hudKey = '';
  }
});

// §8.2 visibilitychange(hidden) / blur → 시뮬레이션 중이면 자동 PAUSE
document.addEventListener('visibilitychange', () => {
  if (document.hidden && sm.isSimulating()) doPause();
});
window.addEventListener('blur', () => {
  if (sm.isSimulating()) doPause();
});

// ---------------------------------------------------------------- 부트

runStageValidation();
input.attach();

loop = startLoop({
  shouldStep: () => sm.isSimulating(),
  fixedUpdate,
  render,
});

sm.dispatch('assetsReady');
mainMenu.show();

if (DEBUG) {
  (window as unknown as { __ab: unknown }).__ab = { sm, get gw() { return gw; }, camera, particles };
}
