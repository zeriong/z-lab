// 부트: Viewport.resize → SaveStore.load → UI 연결 → GameLoop.start (§4.14)
import { AudioEngine } from './audio/audio';
import { Game } from './core/game';
import { GameLoop } from './core/loop';
import type { SceneState } from './core/scene-manager';
import { Input } from './game/input';
import { Renderer } from './render/renderer';
import { Viewport } from './render/viewport';
import { STAGES } from './stages';
import { validateAll } from './stages/validate';
import { SaveStore } from './storage/storage';
import { Overlays } from './ui/overlays';

function mustGet<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} not found`);
  return el as T;
}

const app = mustGet<HTMLDivElement>('app');
const canvas = mustGet<HTMLCanvasElement>('game');
const ui = mustGet<HTMLDivElement>('ui');
const fade = mustGet<HTMLDivElement>('fade');

// 개발 빌드: 스테이지 검증기 (§4.9)
if (import.meta.env.DEV) {
  const errors = validateAll(STAGES);
  if (errors.length > 0) console.warn('[slingshot-bird] stage validation:\n' + errors.join('\n'));
}

// 1) 뷰포트 — 첫 프레임 전에 scale > 0 (hop 1 조건)
const viewport = new Viewport();
function resize(): void {
  const rect = canvas.getBoundingClientRect();
  viewport.resize(rect.width || window.innerWidth, rect.height || window.innerHeight, window.devicePixelRatio || 1);
  viewport.applyToDom(canvas, app);
}
resize();

// 2) 저장소 (막혀 있거나 깨져 있으면 기본값)
const save = SaveStore.browser();
save.load();

// 3) 오디오 (첫 제스처에서 잠금 해제)
const audio = new AudioEngine(save.muted);

// 4) 게임·UI·입력·루프 연결
let loop: GameLoop | null = null;
let overlays: Overlays | null = null;
let input: Input | null = null;
let restartPending = false;

/** 화면 전환 페이드 (R31): 순간 검정 → 200ms 동안 걷힘. 일시정지·재개·결과 오버레이는 제외 */
function onSceneChange(prev: SceneState, next: SceneState): void {
  if (next.scene !== 'PLAYING') input?.cancel();
  const overlayOnly =
    (prev.scene === 'PLAYING' && next.scene === 'PAUSED') ||
    (prev.scene === 'PAUSED' && next.scene === 'PLAYING' && !restartPending) ||
    (prev.scene === 'PLAYING' && (next.scene === 'RESULT_CLEAR' || next.scene === 'RESULT_FAIL'));
  if (overlayOnly) return;
  fade.classList.add('on');
  void fade.offsetWidth; // 스타일 확정 후 전환 시작
  requestAnimationFrame(() => requestAnimationFrame(() => fade.classList.remove('on')));
}

const game = new Game({
  stages: STAGES,
  save,
  audio,
  onChange: () => overlays?.sync(),
  onSceneChange,
  resetAccumulator: () => loop?.resetAccumulator(),
});

// 다시하기(PAUSED → PLAYING)는 월드가 바뀌므로 페이드를 준다
const baseRestart = game.restart.bind(game);
game.restart = () => {
  restartPending = true;
  try {
    return baseRestart();
  } finally {
    restartPending = false;
  }
};

overlays = new Overlays({ app, ui, game });
overlays.sync();

input = new Input({ canvas, viewport, game, onFirstGesture: () => audio.unlock() });
input.attach();

const renderer = new Renderer(canvas, viewport);
loop = new GameLoop({
  shouldStep: () => game.shouldStep(),
  step: () => game.step(),
  render: () => renderer.render(game),
});

window.addEventListener('resize', resize);
window.addEventListener('pointerdown', () => audio.unlock(), { capture: true });
window.addEventListener('keydown', (e) => {
  audio.unlock();
  if (e.key === 'Escape') {
    e.preventDefault();
    game.togglePause();
  }
});
// R24: 탭이 숨겨지면 자동 일시정지
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') game.onHidden();
});

loop.start();

// 디버그용 읽기 전용 핸들
(window as unknown as { __slingshot?: unknown }).__slingshot = { game, viewport };
