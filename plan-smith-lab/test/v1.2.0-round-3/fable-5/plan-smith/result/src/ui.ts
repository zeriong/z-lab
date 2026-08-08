// DOM 오버레이 UI (S8) — 메인·선택·HUD·일시정지/클리어/실패 오버레이의 표시 동기화.

import type { GameState } from './state';
import type { Progress } from './storage';
import { isPersistent } from './storage';

export interface UIHandlers {
  onStart(): void;
  onSelectStage(n: number): void;
  onSelectBack(): void;
  onPause(): void;
  onResume(): void;
  onRetry(): void;
  onMain(): void;
  onNext(): void;
}

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing element #${id}`);
  return el;
}

function show(id: string, on: boolean): void {
  $(id).classList.toggle('hidden', !on);
}

let handlers: UIHandlers | null = null;

export function initUI(h: UIHandlers): void {
  handlers = h;
  $('btn-start').addEventListener('click', h.onStart);
  $('btn-select-back').addEventListener('click', h.onSelectBack);
  $('btn-pause').addEventListener('click', h.onPause);
  $('btn-resume').addEventListener('click', h.onResume);
  $('btn-pause-retry').addEventListener('click', h.onRetry);
  $('btn-pause-main').addEventListener('click', h.onMain);
  $('btn-next').addEventListener('click', h.onNext);
  $('btn-clear-retry').addEventListener('click', h.onRetry);
  $('btn-clear-main').addEventListener('click', h.onMain);
  $('btn-fail-retry').addEventListener('click', h.onRetry);
  $('btn-fail-main').addEventListener('click', h.onMain);
  // localStorage 불가 환경 안내 (시작 시 1회 — 플랜 위험 절)
  show('storage-warn', !isPersistent());
}

export function syncScreens(state: GameState, progress: Progress): void {
  show('screen-main', state.kind === 'MAIN');
  const select = state.kind === 'STAGE_SELECT';
  show('screen-select', select);
  if (select) buildGrid(progress);
  show('hud', state.kind === 'PLAYING' || state.kind === 'PAUSED');
  show('overlay-pause', state.kind === 'PAUSED');
  show('overlay-clear', state.kind === 'CLEAR');
  show('overlay-fail', state.kind === 'FAIL');
  if (state.kind === 'CLEAR') {
    $('clear-stars').textContent = '★'.repeat(state.stars) + '☆'.repeat(3 - state.stars);
    $('clear-score').textContent = `점수 ${state.score.toLocaleString('ko-KR')}`;
    show('btn-next', state.stage < 10); // 10스테이지 클리어면 "다음" 없음
  }
}

/** 스테이지 선택 그리드 (L2, L3) — 잠금 상태와 획득 별 표시 */
function buildGrid(progress: Progress): void {
  const grid = $('stage-grid');
  grid.innerHTML = '';
  for (let n = 1; n <= 10; n++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'stage-btn';
    const unlocked = n <= progress.unlocked;
    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = String(n);
    btn.appendChild(num);
    const sub = document.createElement('span');
    if (unlocked) {
      const s = progress.stars[n] ?? 0;
      sub.className = 'stars';
      sub.textContent = '★'.repeat(s) + '☆'.repeat(3 - s);
      btn.addEventListener('click', () => handlers?.onSelectStage(n));
    } else {
      sub.className = 'lock';
      sub.textContent = '잠금';
      btn.disabled = true;
    }
    btn.appendChild(sub);
    grid.appendChild(btn);
  }
}

/** HUD (L13) — 남은 새 아이콘 열 + 점수 */
export function updateHud(birds: number, score: number): void {
  $('hud-birds').textContent = birds > 0 ? '●'.repeat(birds) : '−';
  $('hud-score').textContent = `점수 ${score.toLocaleString('ko-KR')}`;
}
