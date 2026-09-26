/**
 * 새총: 갈색 Y자. 고무줄은 뒤 가지 → 새 → 앞 가지 순으로 새를 사이에 두고 그린다 (§8.4).
 * 뒤 가지는 엔티티보다 먼저, 앞 가지·고무줄은 새 다음에 그린다.
 */
import type { Vec } from '../core/math';
import { SLINGSHOT, type SlingshotGeometry } from '../entities/Slingshot';

const WOOD = '#7a4a1e';
const WOOD_DARK = '#4e2e10';

function arm(ctx: CanvasRenderingContext2D, from: Vec, to: Vec, width: number): void {
  ctx.strokeStyle = WOOD;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.strokeStyle = WOOD_DARK;
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function drawSlingshotBack(ctx: CanvasRenderingContext2D, geo: SlingshotGeometry = SLINGSHOT): void {
  // 기둥
  arm(ctx, geo.base, geo.fork, 14);
  // 뒤 가지
  arm(ctx, geo.fork, geo.backTip, 10);
}

/**
 * 앞 가지와 고무줄.
 * @param birdPos 새총 위 새의 위치 (없으면 고무줄을 느슨하게 앵커에 그린다)
 * @param birdRadius 고무줄이 새 뒤를 감싸도록 반지름만큼 뒤로 물린다
 */
export function drawSlingshotFront(
  ctx: CanvasRenderingContext2D,
  birdPos: Vec | null,
  birdRadius: number,
  geo: SlingshotGeometry = SLINGSHOT,
): void {
  const target = birdPos ?? geo.anchor;
  // 고무줄: 새의 뒤쪽(앵커 반대 방향)을 지나도록 살짝 뒤로
  let bx = target.x;
  let by = target.y;
  if (birdPos) {
    const dx = birdPos.x - geo.anchor.x;
    const dy = birdPos.y - geo.anchor.y;
    const l = Math.hypot(dx, dy);
    if (l > 1) {
      bx += (dx / l) * birdRadius * 0.8;
      by += (dy / l) * birdRadius * 0.8;
    }
  }
  ctx.strokeStyle = '#3a2214';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(geo.backTip.x, geo.backTip.y);
  ctx.lineTo(bx, by);
  ctx.lineTo(geo.frontTip.x, geo.frontTip.y);
  ctx.stroke();

  // 앞 가지
  arm(ctx, geo.fork, geo.frontTip, 10);
}
