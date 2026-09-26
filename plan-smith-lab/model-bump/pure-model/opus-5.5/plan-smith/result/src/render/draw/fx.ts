// 파티클·팝업 그리기
import type { Effects } from '../../fx/effects';

export function drawEffects(ctx: CanvasRenderingContext2D, fx: Effects): void {
  for (const p of fx.particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = p.kind === 'smoke' ? a * 0.6 : a;
    ctx.fillStyle = p.color;
    if (p.kind === 'debris') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-p.size / 2, -p.size / 3, p.size, (p.size * 2) / 3);
      ctx.restore();
    } else {
      const grow = p.kind === 'smoke' ? 1 + (1 - a) * 0.8 : a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * grow * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const p of fx.popups) {
    const a = Math.min(1, (p.life / p.maxLife) * 1.5);
    ctx.globalAlpha = a;
    ctx.font = `900 ${p.text.length > 4 ? 30 : 24}px system-ui, sans-serif`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.strokeText(p.text, p.x, p.y);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
  ctx.textBaseline = 'alphabetic';
}
