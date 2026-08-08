// 부팅·루프·배선 (S1 + 컨트롤러).
// 루프 규칙: PLAYING일 때만 물리 스텝/판정/파티클 갱신 — PAUSED 동안 물리 스텝 0회 (L20).
// 렌더는 항상 수행해 오버레이 뒤에 정지된 판이 보이게 한다.

import './style.css';
import { WORLD_W, WORLD_H } from './constants';
import { getState, onStateChange, stageOf, transitions } from './state';
import { loadProgress, recordClear, getProgress } from './storage';
import { Session } from './world';
import { drawFrame } from './render';
import { attachInput } from './input';
import { initUI, syncScreens, updateHud } from './ui';
import { updateParticles, clearParticles } from './particles';
import { sfx } from './audio';

const root = document.getElementById('stage-root') as HTMLDivElement;
const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Canvas 2D context unavailable');

// ---- 진행 저장 로드 (콜드 스타트: 해제 기본값 1) ----
loadProgress();

// ---- 세션 관리 ----
let session: Session | null = null;

function disposeSession(): void {
  session?.dispose();
  session = null;
  clearParticles();
}

function startStage(n: number): void {
  disposeSession();
  session = new Session(n); // loadStage(n): 월드 조립 + 첫 새 장착 + 충돌 핸들러 등록
  transitions.toPlaying(n);
}

// ---- UI 배선 ----
initUI({
  onStart: () => transitions.toSelect(),
  onSelectStage: (n) => {
    if (n <= getProgress().unlocked) startStage(n);
  },
  onSelectBack: () => transitions.toMain(),
  onPause: () => {
    session?.cancelAim();
    transitions.toPaused();
  },
  onResume: () => transitions.resume(),
  onRetry: () => {
    // PAUSED/CLEAR/FAIL 어디서든 같은 스테이지를 초기 배치로 재로드 (L18)
    const n = stageOf(getState());
    if (n !== null) startStage(n);
  },
  onMain: () => {
    // 물리 월드 파기 후 메인으로 (L19)
    disposeSession();
    transitions.toMain();
  },
  onNext: () => {
    const st = getState();
    if (st.kind === 'CLEAR' && st.stage < 10) startStage(st.stage + 1);
  },
});

onStateChange((s) => syncScreens(s, getProgress()));
syncScreens(getState(), getProgress());

// ---- 입력 (PLAYING일 때만 세션에 전달) ----
attachInput(canvas, () => (getState().kind === 'PLAYING' ? session : null));

// ---- 뷰포트 스케일링 (L27): 종횡비 유지 fit, 입력 역변환은 input.ts의 rect 기반 ----
function layout(): void {
  const scale = Math.min(window.innerWidth / WORLD_W, window.innerHeight / WORLD_H);
  root.style.width = `${Math.floor(WORLD_W * scale)}px`;
  root.style.height = `${Math.floor(WORLD_H * scale)}px`;
}
window.addEventListener('resize', layout);
layout();

// ---- 메인 루프 ----
function frame(now: number): void {
  const st = getState();
  if (st.kind === 'PLAYING' && session) {
    session.step(now);
    updateParticles();
    const verdict = session.judge(now);
    if (verdict) {
      if (verdict.type === 'clear') {
        recordClear(st.stage, verdict.stars); // 잠금 해제 + 별 저장 (L3, L24)
        sfx.clear();
        transitions.toClear(st.stage, verdict.score, verdict.stars);
      } else {
        sfx.fail();
        transitions.toFail(st.stage);
      }
    }
    updateHud(session.remainingBirds(), session.score);
  }
  drawFrame(ctx as CanvasRenderingContext2D, session);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
