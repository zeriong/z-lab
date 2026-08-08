// B19 — 일시정지 오버레이(다시하기·메인으로)
//
// 두 버튼 모두 상태를 완전히 되돌린다: '다시하기'는 같은 스테이지를 초기 상태로
// 재구성하고(잔해·점수·카메라 포함), '메인으로'는 월드를 파기한다.

import { VIRTUAL_H, VIRTUAL_W } from '../physics/units';
import { dimScreen, drawButton, drawPanel, pickButton, text } from './button';
import type { UIButton } from './button';

export type PauseAction = 'resume' | 'restart' | 'menu';

const PANEL_W = 720;
const PANEL_H = 520;

export function pauseButtons(): UIButton[] {
  const px = (VIRTUAL_W - PANEL_W) / 2;
  const py = (VIRTUAL_H - PANEL_H) / 2;
  const bw = 520;
  const bx = px + (PANEL_W - bw) / 2;
  return [
    { id: 'resume', x: bx, y: py + 150, w: bw, h: 92, label: '계속하기', tone: 'primary' },
    { id: 'restart', x: bx, y: py + 262, w: bw, h: 92, label: '다시하기', tone: 'ghost' },
    { id: 'menu', x: bx, y: py + 374, w: bw, h: 92, label: '메인으로', tone: 'danger' },
  ];
}

export function drawPauseOverlay(ctx: CanvasRenderingContext2D, hoverId: string | null): void {
  dimScreen(ctx, VIRTUAL_W, VIRTUAL_H);
  const px = (VIRTUAL_W - PANEL_W) / 2;
  const py = (VIRTUAL_H - PANEL_H) / 2;
  drawPanel(ctx, px, py, PANEL_W, PANEL_H, '일시정지');
  text(
    ctx,
    '물리 시뮬레이션이 멈춰 있습니다',
    VIRTUAL_W / 2,
    py + 118,
    '24px "Apple SD Gothic Neo", sans-serif',
    'rgba(228, 232, 240, 0.75)',
    'center',
  );
  for (const b of pauseButtons()) drawButton(ctx, b, b.id === hoverId);
}

export function pickPauseAction(x: number, y: number): PauseAction | null {
  const b = pickButton(pauseButtons(), x, y);
  return b ? (b.id as PauseAction) : null;
}
