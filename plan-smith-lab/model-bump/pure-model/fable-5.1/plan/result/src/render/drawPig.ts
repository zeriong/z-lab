/** 돼지: 녹색 원 + 코(타원, 콧구멍 2점) + 눈 + 귀 (§8.4). 체력 비율로 색이 어두워진다. */
import type { Entity } from '../entities/Entity';

export function drawPig(ctx: CanvasRenderingContext2D, e: Entity): void {
  const b = e.body;
  const r = e.r ?? 20;
  const ratio = isFinite(e.maxHealth) ? Math.max(0, e.health / e.maxHealth) : 1;

  ctx.save();
  ctx.translate(b.position.x, b.position.y);
  ctx.rotate(b.angle);

  // 귀
  ctx.fillStyle = '#5cbf3a';
  ctx.strokeStyle = '#2f7a1e';
  ctx.lineWidth = 1.5;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * r * 0.55, -r * 0.8, r * 0.22, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // 몸
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
  g.addColorStop(0, ratio > 0.5 ? '#9be36f' : '#b5c96f');
  g.addColorStop(1, ratio > 0.5 ? '#4fa832' : '#6f8a32');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2f7a1e';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 눈
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s * r * 0.38, -r * 0.25, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(s * r * 0.38 + s * r * 0.04, -r * 0.25, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }

  // 코
  ctx.fillStyle = '#6fc84a';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.15, r * 0.42, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2f7a1e';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#2f7a1e';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * r * 0.16, r * 0.15, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  // 손상 표시
  if (ratio < 0.66) {
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, r * 0.5);
    ctx.lineTo(-r * 0.4, r * 0.3);
    ctx.lineTo(-r * 0.5, r * 0.75);
    if (ratio < 0.33) {
      ctx.moveTo(r * 0.6, -r * 0.6);
      ctx.lineTo(r * 0.35, -r * 0.4);
      ctx.lineTo(r * 0.75, -r * 0.2);
    }
    ctx.stroke();
  }

  ctx.restore();
}
