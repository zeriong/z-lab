import { MATERIAL_SPECS } from '../../config/catalog';
import type { Block } from '../../core/entities/block';
import type { Pose } from '../../core/physics/world';
import { damageStage } from '../../core/rules/damage';

/** 블록: 재질별 색과 무늬, 금 간 오버레이 (§5.4-6, §8.2-4) */

function shapePath(ctx: CanvasRenderingContext2D, b: Block): void {
  ctx.beginPath();
  if (b.shape === 'circle') {
    ctx.arc(0, 0, b.r, 0, Math.PI * 2);
  } else if (b.shape === 'triangle' && b.localVerts) {
    const v = b.localVerts;
    ctx.moveTo(v[0]!.x, v[0]!.y);
    for (let i = 1; i < v.length; i++) ctx.lineTo(v[i]!.x, v[i]!.y);
    ctx.closePath();
  } else {
    ctx.rect(-b.w / 2, -b.h / 2, b.w, b.h);
  }
}

function woodGrain(ctx: CanvasRenderingContext2D, b: Block): void {
  ctx.strokeStyle = 'rgba(90, 52, 18, 0.45)';
  ctx.lineWidth = 1.5;
  const horizontal = b.w >= b.h;
  const span = horizontal ? b.h : b.w;
  const lines = Math.max(1, Math.floor(span / 10));
  for (let i = 1; i <= lines; i++) {
    const t = -span / 2 + (span * i) / (lines + 1);
    ctx.beginPath();
    if (horizontal) {
      ctx.moveTo(-b.w / 2 + 4, t);
      ctx.lineTo(b.w / 2 - 4, t + 1.5);
    } else {
      ctx.moveTo(t, -b.h / 2 + 4);
      ctx.lineTo(t + 1.5, b.h / 2 - 4);
    }
    ctx.stroke();
  }
}

function stoneSpeckles(ctx: CanvasRenderingContext2D, b: Block): void {
  ctx.fillStyle = 'rgba(60, 62, 68, 0.35)';
  const n = Math.min(12, Math.round((b.w * b.h) / 600));
  for (let i = 0; i < n; i++) {
    // 결정론적 의사난수 (id 기반): 매 프레임 같은 위치
    const rx = Math.sin(b.id * 12.9898 + i * 78.233) * 0.5;
    const ry = Math.sin(b.id * 39.3468 + i * 11.135) * 0.5;
    ctx.beginPath();
    ctx.arc(rx * (b.w - 8), ry * (b.h - 8), 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function glassShine(ctx: CanvasRenderingContext2D, b: Block): void {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const s = Math.min(b.w, b.h) * 0.35;
  ctx.moveTo(-b.w / 2 + 5, -b.h / 2 + 5 + s);
  ctx.lineTo(-b.w / 2 + 5 + s, -b.h / 2 + 5);
  ctx.stroke();
}

/** 손상 단계별 금 */
export function drawCracks(ctx: CanvasRenderingContext2D, w: number, h: number, stage: 0 | 1 | 2, seed: number): void {
  if (stage === 0) return;
  ctx.strokeStyle = 'rgba(30, 20, 10, 0.75)';
  ctx.lineWidth = 1.6;
  const count = stage === 1 ? 2 : 5;
  for (let i = 0; i < count; i++) {
    const a = Math.sin(seed * 3.1 + i * 1.7);
    const b = Math.cos(seed * 1.3 + i * 2.9);
    let x = a * w * 0.3;
    let y = b * h * 0.3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 3; k++) {
      x += Math.sin(seed + i * 4.1 + k * 2.3) * w * 0.18;
      y += Math.cos(seed + i * 2.7 + k * 1.9) * h * 0.18;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

export function drawBlock(ctx: CanvasRenderingContext2D, b: Block, pose: Pose): void {
  const spec = MATERIAL_SPECS[b.material];
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.angle);
  shapePath(ctx, b);
  ctx.fillStyle = spec.fill;
  ctx.fill();
  ctx.save();
  shapePath(ctx, b);
  ctx.clip();
  if (b.material === 'wood') woodGrain(ctx, b);
  else if (b.material === 'stone') stoneSpeckles(ctx, b);
  else glassShine(ctx, b);
  drawCracks(ctx, b.w, b.h, damageStage(b.hp, b.maxHp), b.id);
  ctx.restore();
  shapePath(ctx, b);
  ctx.strokeStyle = spec.stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}
