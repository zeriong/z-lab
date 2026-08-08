// B16 — 클리어 오버레이(다음/다시하기/메인으로)
//
// 클리어 후 조작이 오버레이 안에서만 가능하다. 점수 구성과 별이 함께 보인다.

import { VIRTUAL_H, VIRTUAL_W } from '../physics/units';
import { dimScreen, drawButton, drawPanel, drawStars, pickButton, text } from './button';
import type { UIButton } from './button';
import type { ScoreState } from '../game/score';

export type ClearAction = 'next' | 'restart' | 'menu';

const PANEL_W = 860;
const PANEL_H = 660;

export interface ClearSummary {
  stageName: string;
  score: ScoreState;
  stars: number;
  best: number;
  hasNext: boolean;
}

export function clearButtons(hasNext: boolean): UIButton[] {
  const px = (VIRTUAL_W - PANEL_W) / 2;
  const py = (VIRTUAL_H - PANEL_H) / 2;
  const bw = 216;
  const gap = 24;
  const totalW = bw * 3 + gap * 2;
  const bx = px + (PANEL_W - totalW) / 2;
  const by = py + PANEL_H - 140;
  return [
    { id: 'restart', x: bx, y: by, w: bw, h: 92, label: '다시하기', tone: 'ghost' },
    {
      id: 'next',
      x: bx + bw + gap,
      y: by,
      w: bw,
      h: 92,
      label: '다음',
      tone: 'primary',
      disabled: !hasNext,
    },
    { id: 'menu', x: bx + (bw + gap) * 2, y: by, w: bw, h: 92, label: '메인으로', tone: 'danger' },
  ];
}

export function drawClearOverlay(
  ctx: CanvasRenderingContext2D,
  s: ClearSummary,
  hoverId: string | null,
): void {
  dimScreen(ctx, VIRTUAL_W, VIRTUAL_H);
  const px = (VIRTUAL_W - PANEL_W) / 2;
  const py = (VIRTUAL_H - PANEL_H) / 2;
  drawPanel(ctx, px, py, PANEL_W, PANEL_H, '스테이지 클리어');

  text(
    ctx,
    s.stageName,
    VIRTUAL_W / 2,
    py + 116,
    '28px "Apple SD Gothic Neo", sans-serif',
    'rgba(228, 232, 240, 0.8)',
    'center',
  );

  drawStars(ctx, VIRTUAL_W / 2, py + 208, s.stars, 48);

  const font = '30px "Apple SD Gothic Neo", sans-serif';
  const dim = 'rgba(222, 228, 238, 0.85)';
  const left = px + 120;
  const right = px + PANEL_W - 120;
  let row = py + 306;
  const line = (label: string, value: string) => {
    text(ctx, label, left, row, font, dim, 'left');
    text(ctx, value, right, row, font, 'rgb(255, 226, 150)', 'right');
    row += 46;
  };
  line('구조물 파괴', s.score.destruction.toLocaleString());
  line('돼지 제거', s.score.removal.toLocaleString());
  line('잔여 새 보너스', s.score.leftover.toLocaleString());

  ctx.save();
  ctx.strokeStyle = 'rgba(232, 168, 44, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, row - 18);
  ctx.lineTo(right, row - 18);
  ctx.stroke();
  ctx.restore();

  text(ctx, '합계', left, row + 12, 'bold 40px "Apple SD Gothic Neo", sans-serif', 'rgb(245, 240, 230)', 'left');
  text(
    ctx,
    s.score.total.toLocaleString(),
    right,
    row + 12,
    'bold 40px "Apple SD Gothic Neo", sans-serif',
    'rgb(255, 208, 66)',
    'right',
  );
  text(
    ctx,
    `최고 기록 ${s.best.toLocaleString()}`,
    right,
    row + 56,
    '24px "Apple SD Gothic Neo", sans-serif',
    'rgba(210, 216, 226, 0.75)',
    'right',
  );

  for (const b of clearButtons(s.hasNext)) drawButton(ctx, b, b.id === hoverId);
}

export function pickClearAction(x: number, y: number, hasNext: boolean): ClearAction | null {
  const b = pickButton(clearButtons(hasNext), x, y);
  return b ? (b.id as ClearAction) : null;
}
