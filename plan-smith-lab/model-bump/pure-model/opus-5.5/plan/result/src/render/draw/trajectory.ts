import { LOGICAL_W } from '../../config/constants';
import type { Vec } from '../../core/math';

/** 궤적 예측 점: 뒤로 갈수록 작고 투명해진다 (§5.2) */
export function drawPreview(ctx: CanvasRenderingContext2D, dots: readonly Vec[]): void {
  const n = dots.length;
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0;
    const d = dots[i]!;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.95 - 0.7 * t})`;
    ctx.beginPath();
    ctx.arc(d.x, d.y, 6.5 - 3.5 * t, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(40, 60, 80, ${0.5 - 0.35 * t})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/** 직전 발사의 흔적: 흰 점 */
export function drawTrail(ctx: CanvasRenderingContext2D, trail: readonly Vec[]): void {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  for (let i = 0; i < trail.length; i++) {
    const p = trail[i]!;
    ctx.beginPath();
    ctx.arc(p.x, p.y, i % 2 === 0 ? 3.2 : 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 새가 화면 위로 나가면 상단 가장자리에 x 위치 마커를 표시한다 (§5.4-5) */
export function drawOffscreenMarker(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  if (y >= 0) return;
  const mx = Math.max(24, Math.min(LOGICAL_W - 24, x));
  const height = Math.min(1, -y / 600);
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(mx, 8);
  ctx.lineTo(mx - 14, 34);
  ctx.lineTo(mx + 14, 34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(-y)}`, mx, 54 + height * 4);
  ctx.restore();
}
