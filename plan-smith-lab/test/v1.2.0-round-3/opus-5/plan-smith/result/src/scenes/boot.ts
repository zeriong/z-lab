// B1 — 부트·에셋 로딩 화면(+로드 실패 복구)
//
// 첫 프레임이 비어 있지 않고, 실패해도 사용자가 다음 행동('다시 시도')을 할 수 있다.

import { VIRTUAL_H, VIRTUAL_W } from '../physics/units';
import { Audio } from '../core/audio';
import { assertStages } from '../stages/schema';
import { stageDefs } from '../stages';
import { drawButton, pickButton, roundRect, text } from '../ui/button';
import type { UIButton } from '../ui/button';

export interface BootState {
  progress: number;
  failed: boolean;
  message: string;
  done: boolean;
}

export function createBootState(): BootState {
  return { progress: 0, failed: false, message: '준비 중', done: false };
}

export function retryButton(): UIButton {
  return { id: 'retry', x: VIRTUAL_W / 2 - 160, y: 640, w: 320, h: 88, label: '다시 시도', tone: 'primary' };
}

export function pickBootAction(state: BootState, x: number, y: number): 'retry' | null {
  if (!state.failed) return null;
  const b = pickButton([retryButton()], x, y);
  return b ? 'retry' : null;
}

const STEPS: { label: string; run: () => void }[] = [
  { label: '스테이지 정의 검증', run: () => assertStages(stageDefs) },
  { label: '오디오 준비', run: () => Audio.prepare() },
  { label: '렌더 자원 준비', run: () => void 0 },
];

/** 프리로드. 실패하면 state.failed 가 서고 화면에 '다시 시도'가 뜬다. */
export async function runBoot(state: BootState): Promise<boolean> {
  state.failed = false;
  state.done = false;
  state.progress = 0;
  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i];
    state.message = step.label;
    try {
      step.run();
    } catch (e) {
      state.failed = true;
      state.message = e instanceof Error ? e.message.split('\n')[0] : '초기화 실패';
      return false;
    }
    state.progress = (i + 1) / STEPS.length;
    await new Promise<void>((r) => setTimeout(r, 90));
  }
  state.message = '준비 완료';
  state.done = true;
  return true;
}

export function drawBootScreen(ctx: CanvasRenderingContext2D, state: BootState, hover: boolean): void {
  const g = ctx.createLinearGradient(0, 0, 0, VIRTUAL_H);
  g.addColorStop(0, 'rgb(24, 34, 54)');
  g.addColorStop(1, 'rgb(46, 66, 92)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);

  text(
    ctx,
    'ANGRY BIRDS',
    VIRTUAL_W / 2,
    380,
    'bold 96px "Trebuchet MS", sans-serif',
    'rgb(232, 168, 44)',
    'center',
  );
  text(
    ctx,
    '10 스테이지 슬링샷 물리 게임',
    VIRTUAL_W / 2,
    452,
    '30px "Apple SD Gothic Neo", sans-serif',
    'rgba(226, 232, 242, 0.8)',
    'center',
  );

  if (state.failed) {
    text(
      ctx,
      '초기화에 실패했습니다',
      VIRTUAL_W / 2,
      560,
      'bold 36px "Apple SD Gothic Neo", sans-serif',
      'rgb(236, 108, 92)',
      'center',
    );
    text(
      ctx,
      state.message,
      VIRTUAL_W / 2,
      606,
      '24px "Apple SD Gothic Neo", sans-serif',
      'rgba(226, 232, 242, 0.75)',
      'center',
    );
    drawButton(ctx, retryButton(), hover);
    return;
  }

  const barW = 640;
  const barX = (VIRTUAL_W - barW) / 2;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  roundRect(ctx, barX, 580, barW, 26, 13);
  ctx.fill();
  ctx.fillStyle = 'rgb(232, 168, 44)';
  roundRect(ctx, barX, 580, Math.max(26, barW * state.progress), 26, 13);
  ctx.fill();

  text(
    ctx,
    state.message,
    VIRTUAL_W / 2,
    646,
    '24px "Apple SD Gothic Neo", sans-serif',
    'rgba(226, 232, 242, 0.7)',
    'center',
  );
}
