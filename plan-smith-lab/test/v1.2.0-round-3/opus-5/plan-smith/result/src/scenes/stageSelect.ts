// B3 — 스테이지 선택 화면
//
// 10칸이 항상 보이고, 잠금/해금/별 획득이 한눈에 구분된다.
// 잠긴 카드는 자물쇠와 함께 클릭이 무시된다.

import { VIRTUAL_H, VIRTUAL_W } from '../physics/units';
import { drawButton, drawStars, pickButton, roundRect, text } from '../ui/button';
import type { UIButton } from '../ui/button';
import { isUnlocked } from '../core/save';
import type { SaveData } from '../core/save';
import { stageDefs } from '../stages';
import type { StageDef } from '../stages/schema';

const COLS = 5;
const CARD_W = 300;
const CARD_H = 260;
const GAP_X = 44;
const GAP_Y = 40;

export function backButton(): UIButton {
  return { id: 'back', x: 60, y: VIRTUAL_H - 128, w: 240, h: 84, label: '뒤로', tone: 'ghost' };
}

function cardRect(index: number): { x: number; y: number; w: number; h: number } {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  const gridW = COLS * CARD_W + (COLS - 1) * GAP_X;
  const x0 = (VIRTUAL_W - gridW) / 2;
  const y0 = 250;
  return {
    x: x0 + col * (CARD_W + GAP_X),
    y: y0 + row * (CARD_H + GAP_Y),
    w: CARD_W,
    h: CARD_H,
  };
}

/** 클릭된 스테이지 정의(해금된 경우만). 뒤로 버튼이면 'back'. */
export function pickStage(save: SaveData, x: number, y: number): StageDef | 'back' | null {
  if (pickButton([backButton()], x, y)) return 'back';
  for (let i = 0; i < stageDefs.length; i++) {
    const r = cardRect(i);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      const def = stageDefs[i];
      return isUnlocked(def, save) ? def : null;
    }
  }
  return null;
}

export function hoverStageIndex(x: number, y: number): number {
  for (let i = 0; i < stageDefs.length; i++) {
    const r = cardRect(i);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

export function drawStageSelect(
  ctx: CanvasRenderingContext2D,
  save: SaveData,
  hoverIndex: number,
  hoverBack: boolean,
): void {
  const g = ctx.createLinearGradient(0, 0, 0, VIRTUAL_H);
  g.addColorStop(0, 'rgb(30, 44, 70)');
  g.addColorStop(1, 'rgb(52, 76, 104)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);

  text(
    ctx,
    '스테이지 선택',
    VIRTUAL_W / 2,
    140,
    'bold 64px "Apple SD Gothic Neo", sans-serif',
    'rgb(245, 240, 230)',
    'center',
  );

  for (let i = 0; i < stageDefs.length; i++) {
    const def = stageDefs[i];
    const r = cardRect(i);
    const unlocked = isUnlocked(def, save);
    const hovered = hoverIndex === i && unlocked;

    ctx.save();
    ctx.fillStyle = unlocked ? 'rgba(34, 48, 72, 0.95)' : 'rgba(24, 30, 42, 0.9)';
    roundRect(ctx, r.x, r.y, r.w, r.h, 22);
    ctx.fill();
    ctx.strokeStyle = hovered
      ? 'rgb(255, 214, 110)'
      : unlocked
        ? 'rgba(232, 168, 44, 0.7)'
        : 'rgba(120, 128, 142, 0.4)';
    ctx.lineWidth = hovered ? 6 : 4;
    roundRect(ctx, r.x, r.y, r.w, r.h, 22);
    ctx.stroke();
    ctx.restore();

    const cx = r.x + r.w / 2;

    if (!unlocked) {
      drawLock(ctx, cx, r.y + 100);
      text(
        ctx,
        `${def.id}`,
        cx,
        r.y + 186,
        'bold 44px "Trebuchet MS", sans-serif',
        'rgba(160, 168, 182, 0.6)',
        'center',
      );
      text(
        ctx,
        '잠김',
        cx,
        r.y + 226,
        '22px "Apple SD Gothic Neo", sans-serif',
        'rgba(150, 158, 172, 0.7)',
        'center',
      );
      continue;
    }

    text(
      ctx,
      `${def.id}`,
      cx,
      r.y + 72,
      'bold 62px "Trebuchet MS", sans-serif',
      'rgb(255, 208, 66)',
      'center',
    );
    text(
      ctx,
      def.name,
      cx,
      r.y + 128,
      '24px "Apple SD Gothic Neo", sans-serif',
      'rgba(230, 236, 246, 0.9)',
      'center',
    );
    drawStars(ctx, cx, r.y + 180, save.stars[def.id] ?? 0, 24);
    text(
      ctx,
      `최고 ${(save.best[def.id] ?? 0).toLocaleString()}`,
      cx,
      r.y + 226,
      '22px "Apple SD Gothic Neo", sans-serif',
      'rgba(200, 208, 222, 0.75)',
      'center',
    );
  }

  drawButton(ctx, backButton(), hoverBack);
}

function drawLock(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(170, 178, 192, 0.8)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(cx, cy - 6, 20, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = 'rgba(170, 178, 192, 0.8)';
  roundRect(ctx, cx - 30, cy - 6, 60, 48, 8);
  ctx.fill();
  ctx.restore();
}
