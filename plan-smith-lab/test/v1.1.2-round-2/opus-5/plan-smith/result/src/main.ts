/**
 * 부트 (§3 파일 경계의 main.ts).
 *  - 논리 캔버스 1280x720 레터박스 + DPR 보정
 *  - rAF + 누산기로 고정 스텝 호출 (엔진에 rAF delta를 넘기지 않는다 — §7-A 제약 1)
 *  - 상태 머신 전이 한 곳에서 화면/HUD/입력/오디오를 동시에 처리 (일시정지 누수 방지 — §9)
 */

import './style.css';
import { StateMachine } from './state-machine';
import { Game } from './game';
import { AudioBus } from './audio';
import { drawMenuBackdrop } from './render';
import { Hud } from './ui/hud';
import { Screens } from './ui/screens';
import { renderStageGrid } from './ui/select';
import { onClick, q } from './ui/dom';
import { STR } from './ui/strings';
import { loadSave, recordClear, setMuted, type SaveData } from './storage';
import { nextStageId, stageById, TOTAL_STAGES } from './stages';
import { FIXED_DT, LOGICAL_H, LOGICAL_W, MAX_STEPS_PER_FRAME } from './tuning';
import type { StageResult } from './types';

// ---------- 부트 자원 ----------

const canvas = q<HTMLCanvasElement>('#game-canvas');
const ctx = canvas.getContext('2d', { alpha: false });
if (!ctx) throw new Error('Canvas 2D 컨텍스트를 얻을 수 없습니다');

const layer = q<HTMLElement>('#stage-layer');
const sm = new StateMachine();
const screens = new Screens();
const hud = new Hud();

const loaded = loadSave();
let save: SaveData = loaded.data;

const audio = new AudioBus(save.muted);
let currentStageId = 1;

const game = new Game(canvas, ctx, audio, {
  onResolved: (result: StageResult) => handleResolved(result),
});

// ---------- 레터박스 + DPR ----------

let backingScale = 1;

function layout(): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.min(vw / LOGICAL_W, vh / LOGICAL_H);
  const offsetX = Math.round((vw - LOGICAL_W * scale) / 2);
  const offsetY = Math.round((vh - LOGICAL_H * scale) / 2);
  layer.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;

  // 배킹스토어는 실제 표시 픽셀에 맞춘다(흐림 방지). 상한 2.5배로 과도한 픽셀 수를 막는다.
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  backingScale = Math.min(2.5, Math.max(1, dpr * scale));
  canvas.width = Math.round(LOGICAL_W * backingScale);
  canvas.height = Math.round(LOGICAL_H * backingScale);
}

window.addEventListener('resize', layout);
window.addEventListener('orientationchange', layout);
layout();

// ---------- 상태 전이: 화면 / HUD / 입력 / 오디오를 한 곳에서 ----------

sm.onChange((to, from) => {
  screens.applyState(to);
  hud.setVisible(to === 'PLAYING' || to === 'PAUSED');
  game.interactive = to === 'PLAYING';

  if (to === 'PAUSED') {
    // 물리 스텝은 아래 루프가 PLAYING 이 아니면 호출하지 않는다 → 물리·타이머 정지
    audio.suspend();
  } else if (to === 'PLAYING') {
    audio.resume();
    if (from === 'PAUSED') audio.startMusic();
  }

  if (to === 'MAIN' || to === 'SELECT') {
    audio.stopMusic();
    if (from === 'PLAYING' || from === 'PAUSED' || from === 'CLEAR' || from === 'FAIL') {
      screens.clearStarTimers();
      game.unload(); // 인게임 리소스 해제 — 다시 들어가면 초기 상태
    }
  }
});

// ---------- 스테이지 진행 ----------

function startStage(id: number): void {
  const stage = stageById(id);
  if (!stage) {
    screens.toast(`스테이지 ${id} 정의가 유효하지 않습니다(콘솔의 검증 오류를 확인하세요).`);
    return;
  }
  currentStageId = id;
  audio.unlock();
  screens.clearStarTimers();
  hud.resetScoreAnim();
  game.loadStage(stage);
  sm.to('PLAYING');
}

function handleResolved(result: StageResult): void {
  if (result.cleared) {
    save = recordClear(save, result.stageId, result.stars);
    renderStageGrid(save, startStage);
  }
  const next = nextStageId(result.stageId);
  const hasNext = result.cleared && next !== null && stageById(next) !== undefined;
  screens.renderResult(result, hasNext);
  sm.to(result.cleared ? 'CLEAR' : 'FAIL');
}

function retryCurrent(): void {
  startStage(currentStageId);
}

function goHome(): void {
  sm.to('MAIN');
}

function toggleMute(): void {
  const muted = !audio.isMuted;
  audio.setMuted(muted);
  save = setMuted(save, muted);
  screens.setMuteLabels(muted);
  if (!muted && (sm.current === 'PLAYING' || sm.current === 'PAUSED')) audio.startMusic();
  else if (muted) audio.stopMusic();
}

// ---------- 버튼 배선 ----------

onClick(q<HTMLElement>('#btn-start'), () => {
  audio.unlock();
  audio.play('ui');
  startStage(Math.min(Math.max(1, save.unlocked), TOTAL_STAGES));
});

onClick(q<HTMLElement>('#btn-select'), () => {
  audio.unlock();
  audio.play('ui');
  renderStageGrid(save, startStage);
  sm.to('SELECT');
});

onClick(q<HTMLElement>('#btn-select-back'), () => {
  audio.play('ui');
  goHome();
});

// R3: 우측 일시정지 버튼
onClick(q<HTMLElement>('#btn-pause'), () => {
  if (sm.current !== 'PLAYING') return;
  audio.play('ui');
  sm.to('PAUSED');
});

onClick(q<HTMLElement>('#btn-resume'), () => {
  audio.play('ui');
  sm.to('PLAYING');
});

onClick(q<HTMLElement>('#btn-retry-pause'), () => {
  audio.play('ui');
  retryCurrent();
});

onClick(q<HTMLElement>('#btn-home-pause'), () => {
  audio.play('ui');
  goHome();
});

onClick(q<HTMLElement>('#btn-next'), () => {
  audio.play('ui');
  const next = nextStageId(currentStageId);
  if (next === null) {
    screens.toast(STR.allClear);
    goHome();
    return;
  }
  startStage(next);
});

onClick(q<HTMLElement>('#btn-retry-result'), () => {
  audio.play('ui');
  retryCurrent();
});

onClick(q<HTMLElement>('#btn-home-result'), () => {
  audio.play('ui');
  goHome();
});

onClick(q<HTMLElement>('#btn-mute-main'), toggleMute);
onClick(q<HTMLElement>('#btn-mute-pause'), toggleMute);

// 키보드: Esc 로 일시정지/재개 (§1-A R3)
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (sm.current === 'PLAYING') {
    sm.to('PAUSED');
    audio.play('ui');
  } else if (sm.current === 'PAUSED') {
    sm.to('PLAYING');
    audio.play('ui');
  }
});

// 탭이 백그라운드로 가면 자동 일시정지 — 복귀 시 누산기 폭주와 오디오 잔류를 막는다
document.addEventListener('visibilitychange', () => {
  if (document.hidden && sm.current === 'PLAYING') sm.to('PAUSED');
});

// ---------- 메인 루프 ----------

let last = performance.now();
let accumulator = 0;

function frame(now: number): void {
  const dt = Math.min(now - last, 250);
  last = now;

  if (sm.current === 'PLAYING') {
    accumulator += dt;
    let steps = 0;
    while (accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
      game.stepOnce();
      accumulator -= FIXED_DT;
      steps += 1;
    }
    if (accumulator > FIXED_DT * MAX_STEPS_PER_FRAME) accumulator = 0; // 밀린 시간은 버린다
  } else {
    accumulator = 0; // PAUSED/결과 화면에서는 시간이 흐르지 않는다
  }

  ctx.setTransform(backingScale, 0, 0, backingScale, 0, 0);
  const inWorld =
    sm.current === 'PLAYING' || sm.current === 'PAUSED' || sm.current === 'CLEAR' || sm.current === 'FAIL';
  if (inWorld && game.hasStage()) {
    game.render();
    hud.update(game.hudData());
  } else {
    drawMenuBackdrop(ctx);
  }

  requestAnimationFrame(frame);
}

// ---------- 시작 ----------

screens.setMuteLabels(audio.isMuted);
renderStageGrid(save, startStage);
sm.to('MAIN');
if (loaded.recovered) screens.toast(STR.saveRecovered, 4200);

requestAnimationFrame(frame);

// 진단 훅 (§10-2 계약 검증: 콘솔에서 바디 수·물리 스텝 수를 직접 읽는다)
(window as unknown as Record<string, unknown>).__ab10 = {
  bodyCount: () => game.bodyCount(),
  baselineBodies: () => game.baselineBodies,
  physicsSteps: () => game.physicsStepCount(),
  state: () => sm.current,
};
