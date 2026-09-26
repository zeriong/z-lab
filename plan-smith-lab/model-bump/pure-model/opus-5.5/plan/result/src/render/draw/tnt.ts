import type { Tnt } from '../../core/entities/tnt';
import type { Pose } from '../../core/physics/world';
import { damageStage } from '../../core/rules/damage';
import { drawCracks } from './block';

/** TNT: 빨간 상자에 "TNT" (§8.2-4) */
export function drawTnt(ctx: CanvasRenderingContext2D, t: Tnt, pose: Pose): void {
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.angle);
  ctx.fillStyle = '#c62828';
  ctx.fillRect(-t.w / 2, -t.h / 2, t.w, t.h);
  ctx.strokeStyle = '#6d1010';
  ctx.lineWidth = 2;
  ctx.strokeRect(-t.w / 2, -t.h / 2, t.w, t.h);
  ctx.fillStyle = '#ffe082';
  ctx.fillRect(-t.w / 2 + 3, -6, t.w - 6, 12);
  ctx.fillStyle = '#6d1010';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TNT', 0, 0.5);
  drawCracks(ctx, t.w, t.h, damageStage(t.hp, t.maxHp), t.id);
  ctx.restore();
}
