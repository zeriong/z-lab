import { GROUND_Y, LOGICAL_H, LOGICAL_W } from '../../config/constants';
import type { Vec } from '../../core/math';

/** 하늘 그라디언트와 먼 언덕 실루엣. 정적이므로 한 번 그려 오프스크린에 캐시한다. */
export function createBackgroundCache(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = LOGICAL_W;
  c.height = LOGICAL_H;
  const ctx = c.getContext('2d');
  if (!ctx) return c;

  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#5ab3e8');
  sky.addColorStop(0.6, '#a8dcf5');
  sky.addColorStop(1, '#e6f6ff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  // 구름
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const clouds: [number, number, number][] = [
    [260, 170, 1], [720, 110, 0.8], [1180, 200, 1.1], [1620, 130, 0.9],
  ];
  for (const [x, y, k] of clouds) {
    ctx.beginPath();
    ctx.arc(x, y, 38 * k, 0, Math.PI * 2);
    ctx.arc(x + 44 * k, y - 16 * k, 46 * k, 0, Math.PI * 2);
    ctx.arc(x + 96 * k, y, 36 * k, 0, Math.PI * 2);
    ctx.fill();
  }

  // 먼 언덕 두 겹
  const hills = (color: string, base: number, amp: number, freq: number, phase: number) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    for (let x = 0; x <= LOGICAL_W; x += 20) {
      const y = base - amp * (0.5 + 0.5 * Math.sin(x * freq + phase)) - amp * 0.3 * Math.sin(x * freq * 2.7 + phase);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(LOGICAL_W, GROUND_Y);
    ctx.closePath();
    ctx.fill();
  };
  hills('#b9dfb0', GROUND_Y - 40, 120, 0.004, 0.6);
  hills('#8fcc86', GROUND_Y - 10, 70, 0.007, 2.1);
  return c;
}

export function drawBackground(ctx: CanvasRenderingContext2D, cache: HTMLCanvasElement): void {
  ctx.drawImage(cache, 0, 0, LOGICAL_W, LOGICAL_H);
}

/** 지면 띠 */
export function drawGround(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, GROUND_Y, 0, LOGICAL_H);
  g.addColorStop(0, '#6aa84f');
  g.addColorStop(0.12, '#5b8f3f');
  g.addColorStop(0.13, '#8a6a43');
  g.addColorStop(1, '#5e4428');
  ctx.fillStyle = g;
  ctx.fillRect(-10, GROUND_Y, LOGICAL_W + 20, LOGICAL_H - GROUND_Y + 10);
  ctx.strokeStyle = '#4c7a33';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-10, GROUND_Y + 1);
  ctx.lineTo(LOGICAL_W + 10, GROUND_Y + 1);
  ctx.stroke();
}

/** 정적 지형(언덕, 받침대) */
export function drawTerrain(ctx: CanvasRenderingContext2D, points: readonly Vec[]): void {
  if (points.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i]!.x, points[i]!.y);
  ctx.closePath();
  const top = Math.min(...points.map((p) => p.y));
  const bottom = Math.max(...points.map((p) => p.y));
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, '#7cb95a');
  g.addColorStop(0.08, '#6a9a48');
  g.addColorStop(0.1, '#9a7650');
  g.addColorStop(1, '#6d5033');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#4d3a24';
  ctx.lineWidth = 2;
  ctx.stroke();
}
