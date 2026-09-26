import { BIRDS } from '../../config/catalog';
import type { BirdKind } from '../../config/catalog';

/** 새: 색깔별 원, 눈썹, 부리 (§8.2-6) */
export function drawBird(ctx: CanvasRenderingContext2D, kind: BirdKind, x: number, y: number, angle = 0, radius?: number): void {
  const spec = BIRDS[kind];
  const r = radius ?? spec.radius;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // 몸
  ctx.fillStyle = spec.color;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (kind === 'bomb') {
    // 도화선
    ctx.strokeStyle = '#8a6d3b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r * 0.3, -r * 1.35, r * 0.1, -r * 1.5);
    ctx.stroke();
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.arc(r * 0.1, -r * 1.5, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 배
    ctx.fillStyle = kind === 'red' ? '#f3d2b3' : '#fff2b3';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.45, r * 0.6, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 눈
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(r * 0.28 + s * r * 0.22, -r * 0.12, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(r * 0.33 + s * r * 0.22, -r * 0.1, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
  // 눈썹
  ctx.strokeStyle = '#111';
  ctx.lineWidth = Math.max(2, r * 0.14);
  ctx.beginPath();
  ctx.moveTo(r * 0.02, -r * 0.42);
  ctx.lineTo(r * 0.5, -r * 0.28);
  ctx.lineTo(r * 0.78, -r * 0.44);
  ctx.stroke();
  // 부리
  ctx.fillStyle = '#f6a01a';
  ctx.beginPath();
  ctx.moveTo(r * 0.55, r * 0.02);
  ctx.lineTo(r * 1.08, r * 0.16);
  ctx.lineTo(r * 0.55, r * 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
