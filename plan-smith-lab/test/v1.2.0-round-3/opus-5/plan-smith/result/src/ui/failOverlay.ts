// B17 — 실패 오버레이(다시하기/메인으로)
//
// 새를 다 쓴 상태에서 갇히지 않는다 — 나가는 문이 항상 두 개 있다.

import { VIRTUAL_H, VIRTUAL_W } from '../physics/units';
import { dimScreen, drawButton, drawPanel, pickButton, text } from './button';
import type { UIButton } from './button';

export type FailAction = 'restart' | 'menu';

const PANEL_W = 720;
const PANEL_H = 440;

export function failButtons(): UIButton[] {
  const px = (VIRTUAL_W - PANEL_W) / 2;
  const py = (VIRTUAL_H - PANEL_H) / 2;
  const bw = 280;
  const gap = 32;
  const bx = px + (PANEL_W - (bw * 2 + gap)) / 2;
  const by = py + PANEL_H - 140;
  return [
    { id: 'restart', x: bx, y: by, w: bw, h: 92, label: '다시하기', tone: 'primary' },
    { id: 'menu', x: bx + bw + gap, y: by, w: bw, h: 92, label: '메인으로', tone: 'danger' },
  ];
}

export function drawFailOverlay(
  ctx: CanvasRenderingContext2D,
  pigsAlive: number,
  hoverId: string | null,
): void {
  dimScreen(ctx, VIRTUAL_W, VIRTUAL_H);
  const px = (VIRTUAL_W - PANEL_W) / 2;
  const py = (VIRTUAL_H - PANEL_H) / 2;
  drawPanel(ctx, px, py, PANEL_W, PANEL_H, '스테이지 실패');
  text(
    ctx,
    `남은 새가 없습니다 — 돼지 ${pigsAlive}마리 생존`,
    VIRTUAL_W / 2,
    py + 150,
    '30px "Apple SD Gothic Neo", sans-serif',
    'rgba(228, 232, 240, 0.85)',
    'center',
  );
  for (const b of failButtons()) drawButton(ctx, b, b.id === hoverId);
}

export function pickFailAction(x: number, y: number): FailAction | null {
  const b = pickButton(failButtons(), x, y);
  return b ? (b.id as FailAction) : null;
}
