/** 배경: 하늘 그라데이션 + 먼 언덕 실루엣 2겹, 지면은 흙색 + 잔디선 (§8.4). */
import { GROUND_Y, WORLD_H, WORLD_W } from '../core/config';

let skyCache: CanvasGradient | null = null;
let skyCacheCtx: CanvasRenderingContext2D | null = null;

function hill(
  ctx: CanvasRenderingContext2D,
  baseY: number,
  amp: number,
  period: number,
  phase: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, WORLD_H);
  ctx.lineTo(0, baseY);
  for (let x = 0; x <= WORLD_W; x += 16) {
    const y = baseY - Math.abs(Math.sin((x + phase) / period)) * amp;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(WORLD_W, WORLD_H);
  ctx.closePath();
  ctx.fill();
}

export function drawBackground(ctx: CanvasRenderingContext2D): void {
  if (!skyCache || skyCacheCtx !== ctx) {
    skyCache = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    skyCache.addColorStop(0, '#6fb7ff');
    skyCache.addColorStop(0.7, '#bfe3ff');
    skyCache.addColorStop(1, '#e8f6ff');
    skyCacheCtx = ctx;
  }
  ctx.fillStyle = skyCache;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  // 먼 언덕 2겹
  hill(ctx, GROUND_Y - 40, 120, 260, 40, 'rgba(120, 190, 120, 0.45)');
  hill(ctx, GROUND_Y - 10, 70, 170, 400, 'rgba(90, 165, 95, 0.7)');
}

export function drawGround(ctx: CanvasRenderingContext2D): void {
  // 흙
  ctx.fillStyle = '#8a5a34';
  ctx.fillRect(0, GROUND_Y, WORLD_W, WORLD_H - GROUND_Y);
  // 잔디
  ctx.fillStyle = '#5faa3c';
  ctx.fillRect(0, GROUND_Y - 6, WORLD_W, 10);
  ctx.strokeStyle = '#3e7f2a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x < WORLD_W; x += 22) {
    ctx.moveTo(x, GROUND_Y - 6);
    ctx.lineTo(x + 6, GROUND_Y - 14);
  }
  ctx.stroke();
}
