import { GROUND_Y, SLING_FORK_BACK, SLING_FORK_FRONT } from '../../config/constants';
import type { Vec } from '../../core/math';
import { bandWidth } from '../../core/slingshot';

/** 새총: 뒤쪽 갈래 → (새) → 앞쪽 갈래 순서로 그려 새가 두 갈래 사이에 끼인 것처럼 보이게 한다. */

const WOOD = '#7a4a1f';
const WOOD_DARK = '#4f2e10';
const BAND = '#3b2414';

export function forkBack(anchor: Vec): Vec {
  return { x: anchor.x + SLING_FORK_BACK.x, y: anchor.y + SLING_FORK_BACK.y };
}

export function forkFront(anchor: Vec): Vec {
  return { x: anchor.x + SLING_FORK_FRONT.x, y: anchor.y + SLING_FORK_FRONT.y };
}

function limb(ctx: CanvasRenderingContext2D, from: Vec, to: Vec, width: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

/** 밑동, 줄기, 뒤쪽 갈래 */
export function drawSlingshotBack(ctx: CanvasRenderingContext2D, anchor: Vec): void {
  const base = { x: anchor.x, y: GROUND_Y };
  const crotch = { x: anchor.x, y: anchor.y + 70 };
  limb(ctx, base, crotch, 20, WOOD_DARK);
  limb(ctx, base, crotch, 14, WOOD);
  limb(ctx, crotch, forkBack(anchor), 13, WOOD_DARK);
}

/** 앞쪽 갈래 */
export function drawSlingshotFront(ctx: CanvasRenderingContext2D, anchor: Vec): void {
  const crotch = { x: anchor.x, y: anchor.y + 70 };
  limb(ctx, crotch, forkFront(anchor), 14, WOOD);
}

/** 갈래 끝에서 주머니까지의 고무줄. 당김이 클수록 가늘다. */
export function drawBand(ctx: CanvasRenderingContext2D, fork: Vec, pocket: Vec, pullLen: number): void {
  ctx.strokeStyle = BAND;
  ctx.lineWidth = bandWidth(pullLen);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(fork.x, fork.y);
  ctx.lineTo(pocket.x, pocket.y);
  ctx.stroke();
}

/** 새가 없을 때 느슨한 고무줄 */
export function drawRestingBand(ctx: CanvasRenderingContext2D, anchor: Vec): void {
  const a = forkBack(anchor);
  const b = forkFront(anchor);
  ctx.strokeStyle = BAND;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(anchor.x, anchor.y + 14, b.x, b.y);
  ctx.stroke();
}
