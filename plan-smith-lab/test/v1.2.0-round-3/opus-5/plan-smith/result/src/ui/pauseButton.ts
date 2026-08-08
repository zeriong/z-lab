// B18 — 인게임 우측 일시정지 버튼
//
// 요구사항의 '우측'을 코드 리뷰가 아니라 좌표로 못 박는다:
// 히트 영역 중심 x 가 캔버스(가상 해상도) 폭의 절반보다 크다.
// 누른 프레임부터 물리 스텝이 멈추는 것은 상태 머신이 보장한다.

import { VIRTUAL_W } from '../physics/units';
import { roundRect } from './button';

export interface HitRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const SIZE = 110;
const MARGIN = 44;

/** 일시정지 버튼 히트 영역(가상 좌표). */
export function pauseButtonRect(): HitRect {
  return { x: VIRTUAL_W - MARGIN - SIZE, y: MARGIN, w: SIZE, h: SIZE };
}

/** 음소거 토글 — 일시정지 버튼 왼쪽, 역시 우측 영역. */
export function muteButtonRect(): HitRect {
  const p = pauseButtonRect();
  return { x: p.x - SIZE - 20, y: p.y, w: SIZE, h: SIZE };
}

export function hitRect(r: HitRect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function rectCenterX(r: HitRect): number {
  return r.x + r.w / 2;
}

/** 스펙 요구를 코드에서 단언 가능하게: 중심 x > 캔버스 폭 / 2. */
export function isOnRightHalf(r: HitRect, canvasWidth = VIRTUAL_W): boolean {
  return rectCenterX(r) > canvasWidth / 2;
}

function chrome(ctx: CanvasRenderingContext2D, r: HitRect, hovered: boolean): void {
  ctx.save();
  ctx.fillStyle = 'rgba(14, 20, 32, 0.78)';
  roundRect(ctx, r.x, r.y, r.w, r.h, 22);
  ctx.fill();
  ctx.strokeStyle = hovered ? 'rgb(255, 226, 150)' : 'rgba(236, 240, 246, 0.75)';
  ctx.lineWidth = 4;
  roundRect(ctx, r.x, r.y, r.w, r.h, 22);
  ctx.stroke();
  ctx.restore();
}

export function drawPauseButton(ctx: CanvasRenderingContext2D, hovered = false): void {
  const r = pauseButtonRect();
  chrome(ctx, r, hovered);
  ctx.save();
  ctx.fillStyle = 'rgb(245, 240, 230)';
  const barW = 14;
  const barH = 46;
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  ctx.fillRect(cx - barW - 7, cy - barH / 2, barW, barH);
  ctx.fillRect(cx + 7, cy - barH / 2, barW, barH);
  ctx.restore();
}

export function drawMuteButton(ctx: CanvasRenderingContext2D, muted: boolean, hovered = false): void {
  const r = muteButtonRect();
  chrome(ctx, r, hovered);
  ctx.save();
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  ctx.fillStyle = 'rgb(245, 240, 230)';
  ctx.beginPath();
  ctx.moveTo(cx - 22, cy - 10);
  ctx.lineTo(cx - 8, cy - 10);
  ctx.lineTo(cx + 6, cy - 24);
  ctx.lineTo(cx + 6, cy + 24);
  ctx.lineTo(cx - 8, cy + 10);
  ctx.lineTo(cx - 22, cy + 10);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = muted ? 'rgb(236, 96, 82)' : 'rgb(245, 240, 230)';
  ctx.lineWidth = 5;
  if (muted) {
    ctx.beginPath();
    ctx.moveTo(cx + 14, cy - 16);
    ctx.lineTo(cx + 34, cy + 16);
    ctx.moveTo(cx + 34, cy - 16);
    ctx.lineTo(cx + 14, cy + 16);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(cx + 12, cy, 14, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 12, cy, 26, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();
  }
  ctx.restore();
}
