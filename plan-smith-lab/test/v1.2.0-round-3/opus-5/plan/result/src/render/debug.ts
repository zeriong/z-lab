/**
 * §12 디버그 오버레이 (?debug=1).
 * 바디 외곽선, 속도 벡터, pigsAlive/birdsLeft, 바디 수, FPS, 프레임 시간 p95, Engine.update p95.
 */

import { Composite } from 'matter-js';
import type { GameWorld } from '../game/world';
import { birdsRemaining } from '../game/world';

export function isDebugEnabled(): boolean {
  try {
    return new URLSearchParams(location.search).get('debug') === '1';
  } catch {
    return false;
  }
}

export class DebugStats {
  private frameTimes: number[] = [];
  private stepTimes: number[] = [];
  private lastFrame = performance.now();
  fps = 0;

  markFrame(): void {
    const now = performance.now();
    const dt = now - this.lastFrame;
    this.lastFrame = now;
    this.frameTimes.push(dt);
    if (this.frameTimes.length > 240) this.frameTimes.shift();
    this.fps = dt > 0 ? 1000 / dt : 0;
  }

  markStep(ms: number): void {
    this.stepTimes.push(ms);
    if (this.stepTimes.length > 240) this.stepTimes.shift();
  }

  private p95(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
    return sorted[idx]!;
  }

  framep95(): number {
    return this.p95(this.frameTimes);
  }

  stepp95(): number {
    return this.p95(this.stepTimes);
  }

  reset(): void {
    this.frameTimes = [];
    this.stepTimes = [];
  }
}

export function drawDebug(
  ctx: CanvasRenderingContext2D,
  gw: GameWorld | null,
  stats: DebugStats,
  cameraX: number,
  extra: string[] = [],
): void {
  ctx.save();

  if (gw) {
    ctx.save();
    ctx.translate(-cameraX, 0);
    ctx.lineWidth = 1;
    for (const body of Composite.allBodies(gw.engine.world)) {
      const v = body.vertices;
      ctx.strokeStyle = body.isSleeping ? 'rgba(120,255,120,0.7)' : 'rgba(255,60,60,0.7)';
      ctx.beginPath();
      ctx.moveTo(v[0]!.x, v[0]!.y);
      for (let i = 1; i < v.length; i++) ctx.lineTo(v[i]!.x, v[i]!.y);
      ctx.closePath();
      ctx.stroke();

      if (!body.isStatic) {
        ctx.strokeStyle = 'rgba(60,160,255,0.9)';
        ctx.beginPath();
        ctx.moveTo(body.position.x, body.position.y);
        ctx.lineTo(body.position.x + body.velocity.x * 6, body.position.y + body.velocity.y * 6);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  const lines = [
    `fps ${stats.fps.toFixed(0)}  frame p95 ${stats.framep95().toFixed(1)}ms  step p95 ${stats
      .stepp95()
      .toFixed(2)}ms`,
    gw
      ? `pigs ${gw.pigsAlive}  birds ${birdsRemaining(gw)}  bodies ${
          Composite.allBodies(gw.engine.world).length
        }  step ${gw.step}`
      : 'no world',
    `camera.x ${cameraX.toFixed(1)}`,
    ...extra,
  ];

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(8, 640, 560, 18 * lines.length + 12);
  ctx.fillStyle = '#9ef29e';
  ctx.font = '13px ui-monospace, Menlo, monospace';
  lines.forEach((l, i) => ctx.fillText(l, 18, 660 + i * 18));

  ctx.restore();
}
