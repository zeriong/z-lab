import { AssetLoader } from './core/AssetLoader';
import { Camera } from './core/Camera';
import { GameStateMachine } from './core/GameStateMachine';
import { Input } from './core/Input';
import { Loop } from './core/Loop';
import { Progress } from './core/Progress';
import { Rng } from './core/Rng';
import { Sfx } from './core/Sfx';
import { Stats } from './core/Stats';
import { STAGE_COUNT, getStage, type StageDef } from './data/stages';
import { PlacementEditor } from './editor/PlacementEditor';
import { StageRunner } from './game/StageRunner';
import { ParticleSystem } from './render/ParticleSystem';
import { Renderer } from './render/Renderer';
import { Hud } from './ui/Hud';
import { MainMenu } from './ui/MainMenu';
import { PauseOverlay } from './ui/PauseOverlay';
import { ResultOverlay, type ResultInfo } from './ui/ResultOverlay';

/**
 * 부트 + 루프 (플랜 §2 main.ts).
 * 상태 머신이 유일한 진실 — 물리 스텝은 PLAYING/SETTLING에서만 돈다.
 */

const params = new URLSearchParams(location.search);
const editorMode = params.get('editor') === '1';
const statsMode = params.get('stats') === '1';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
const uiRoot = document.getElementById('ui-root');
if (!canvas || !uiRoot) throw new Error('필수 DOM 노드를 찾을 수 없습니다');

const camera = new Camera();
const rng = new Rng(0x51a7c0de);
const particles = new ParticleSystem(rng);
const renderer = new Renderer(canvas, camera, particles);
const sfx = new Sfx();
const progress = new Progress();
const assets = new AssetLoader();
const sm = new GameStateMachine();
const stats = new Stats(statsMode, uiRoot);

const menu = new MainMenu(uiRoot, progress);
const hud = new Hud(uiRoot);
const pauseOverlay = new PauseOverlay(uiRoot);
const resultOverlay = new ResultOverlay(uiRoot);

let runner: StageRunner | null = null;
let currentStage: StageDef | null = null;
let pendingStageId = 1;
let settleDwellMs = 0;
let lastResult: ResultInfo | null = null;
let editor: PlacementEditor | null = null;

const input = new Input(canvas, camera);
const loop = new Loop(step, render);

// ---------------------------------------------------------------- 상태 전이

sm.onChange((to) => {
  switch (to) {
    case 'MAIN_MENU':
      disposeRunner();
      hud.hide();
      pauseOverlay.hide();
      resultOverlay.hide();
      menu.show();
      input.enabled = false;
      break;

    case 'LOADING':
      menu.hide();
      pauseOverlay.hide();
      resultOverlay.hide();
      buildStage(pendingStageId);
      // 월드 구축 완료 → 즉시 PLAYING (프리세틀은 StageRunner 내부에서 처리)
      sm.transition('PLAYING');
      break;

    case 'PLAYING':
      hud.show();
      pauseOverlay.hide();
      resultOverlay.hide();
      // 재개 시 누적 dt를 버린다 → 블록 순간이동 방지 (플랜 §3)
      loop.reset();
      input.enabled = true;
      break;

    case 'PAUSED':
      // 드래그 중이었다면 발사하지 않고 해제한다.
      input.abort();
      input.enabled = false;
      loop.reset();
      pauseOverlay.show();
      break;

    case 'SETTLING':
      settleDwellMs = 700;
      input.enabled = false;
      runner?.frameStage();
      break;

    case 'CLEAR':
    case 'FAIL':
      input.enabled = false;
      if (lastResult) resultOverlay.show(lastResult);
      sfx.play(to === 'CLEAR' ? 'clear' : 'fail');
      break;

    default:
      break;
  }
});

// ---------------------------------------------------------------- 스테이지 수명

function disposeRunner(): void {
  if (runner) {
    runner.destroy();
    runner = null;
  }
  particles.clear();
}

function buildStage(stageId: number): void {
  disposeRunner();
  currentStage = getStage(stageId);
  runner = new StageRunner(currentStage, camera, particles, sfx);
  hud.update(currentStage.id, currentStage.name, 0, runner.birdsRemaining, runner.pigsRemaining);
  hud.setHint('새를 드래그해서 조준하세요');
}

/** 에디터가 수정한 draft로 월드를 다시 만든다 (플랜 P4) */
function rebuildFromDraft(draft: StageDef): void {
  disposeRunner();
  currentStage = draft;
  runner = new StageRunner(draft, camera, particles, sfx);
}

function requestStage(stageId: number): void {
  pendingStageId = stageId;
  sm.transition('LOADING');
}

// ---------------------------------------------------------------- 루프

function step(stepMs: number): void {
  switch (sm.state) {
    case 'PLAYING':
      if (!runner) break;
      runner.step(stepMs);
      if (runner.shotSettled) sm.transition('SETTLING');
      break;

    case 'SETTLING':
      if (!runner) break;
      runner.step(stepMs);
      settleDwellMs -= stepMs;
      if (settleDwellMs <= 0) resolveSettle();
      break;

    default:
      // BOOT / MAIN_MENU / PAUSED / CLEAR / FAIL: 물리 스텝 0 (완료 기준 4)
      break;
  }
}

function resolveSettle(): void {
  if (!runner || !currentStage) return;
  const outcome = runner.outcome();

  if (outcome === 'clear') {
    runner.applyClearBonus();
    const stars = runner.stars();
    const best = progress.best(currentStage.id);
    progress.recordClear(currentStage.id, runner.score, stars, STAGE_COUNT);
    lastResult = {
      cleared: true,
      stageId: currentStage.id,
      stageName: currentStage.name,
      score: runner.score,
      stars,
      best,
      hasNext: currentStage.id < STAGE_COUNT,
    };
    menu.refresh();
    sm.transition('CLEAR');
    return;
  }

  if (outcome === 'fail') {
    lastResult = {
      cleared: false,
      stageId: currentStage.id,
      stageName: currentStage.name,
      score: runner.score,
      stars: 0,
      best: progress.best(currentStage.id),
      hasNext: false,
    };
    sm.transition('FAIL');
    return;
  }

  // 그 외: 다음 새 지급 후 조준으로 복귀
  runner.nextBird();
  sm.transition('PLAYING');
}

function render(frameMs: number): void {
  renderer.draw(runner);

  if (runner && currentStage) {
    hud.update(
      currentStage.id,
      currentStage.name,
      runner.score,
      runner.birdsRemaining,
      runner.pigsRemaining,
    );
    if (sm.state === 'PLAYING') {
      hud.setHint(
        runner.phase === 'aiming'
          ? runner.slingshot.pulling
            ? `파워 ${Math.round(runner.slingshot.power * 100)}%`
            : '새를 드래그해서 조준하세요'
          : '',
      );
    }
  }

  stats.bodies = runner?.bodyCount ?? 0;
  stats.physicsSteps = runner?.world.physicsSteps ?? 0;
  stats.stateLabel = sm.state;
  stats.frame(frameMs);
}

// ---------------------------------------------------------------- 입력 배선

input.onDown = (s) => {
  sfx.unlock();
  if (editor) {
    editor.pointerDown(s.world);
    return;
  }
  if (sm.state !== 'PLAYING' || !runner) return;
  runner.pointerDown(s.world);
};

input.onMove = (s) => {
  if (editor) return;
  if (sm.state !== 'PLAYING' || !runner) return;
  runner.pointerMove(s.world);
};

input.onUp = (s) => {
  if (editor) {
    editor.pointerUp(s.world);
    return;
  }
  if (sm.state !== 'PLAYING' || !runner) return;
  runner.pointerUp(s.world);
};

// ---------------------------------------------------------------- UI 배선

menu.onSelect = (stageId) => {
  sfx.unlock();
  sfx.play('ui');
  requestStage(stageId);
};

hud.onPause = () => {
  sfx.play('ui');
  sm.transition('PAUSED'); // PLAYING이 아니면 화이트리스트가 no-op 처리
};

pauseOverlay.onResume = () => {
  sfx.play('ui');
  sm.transition('PLAYING');
};

pauseOverlay.onRestart = () => {
  sfx.play('ui');
  requestStage(currentStage?.id ?? 1);
};

pauseOverlay.onMain = () => {
  sfx.play('ui');
  sm.transition('MAIN_MENU');
};

resultOverlay.onRestart = () => {
  sfx.play('ui');
  requestStage(currentStage?.id ?? 1);
};

resultOverlay.onNext = () => {
  sfx.play('ui');
  requestStage(Math.min(STAGE_COUNT, (currentStage?.id ?? 1) + 1));
};

resultOverlay.onMain = () => {
  sfx.play('ui');
  sm.transition('MAIN_MENU');
};

// ---------------------------------------------------------------- 자동 일시정지

window.addEventListener('visibilitychange', () => {
  if (document.hidden && sm.state === 'PLAYING') sm.transition('PAUSED');
});

window.addEventListener('blur', () => {
  if (sm.state === 'PLAYING') sm.transition('PAUSED');
});

window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (sm.state === 'PLAYING') sm.transition('PAUSED');
  else if (sm.state === 'PAUSED') sm.transition('PLAYING');
});

window.addEventListener('resize', () => renderer.resize());
window.addEventListener('orientationchange', () => renderer.resize());

// ---------------------------------------------------------------- 부트

async function boot(): Promise<void> {
  await assets.load();
  loop.start();
  sm.transition('MAIN_MENU');

  if (editorMode) {
    const startId = Number(params.get('stage') ?? '1') || 1;
    requestStage(startId);
    editor = new PlacementEditor(uiRoot as HTMLElement, {
      getStage: () => currentStage as StageDef,
      rebuild: (draft) => rebuildFromDraft(draft),
    });
  }
}

void boot();
