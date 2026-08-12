import type { Camera } from '../core/Camera';
import type { DebugShape } from '../physics/PhysicsWorld';

/**
 * Development overlay, hidden behind `?debug=1` / the backtick key (plan §10,
 * quality item 14). Body outlines come from PhysicsWorld.getDebugShapes() so
 * the render layer still never imports matter-js.
 */
export interface DebugInfo {
  shapes: DebugShape[];
  lines: string[];
  /** Actual flight path breadcrumbs, for eyeballing prediction accuracy (§5.2). */
  trail: Array<{ x: number; y: number }>;
}

export function drawDebug(ctx: CanvasRenderingContext2D, camera: Camera, info: DebugInfo): void {
  ctx.save();
  camera.apply(ctx);

  ctx.lineWidth = 1 / camera.zoom;
  for (const shape of info.shapes) {
    if (shape.verts.length < 4) continue;
    ctx.strokeStyle = shape.isStatic
      ? 'rgba(120, 255, 160, 0.9)'
      : shape.isSleeping
        ? 'rgba(120, 160, 255, 0.9)'
        : 'rgba(255, 90, 90, 0.9)';
    ctx.beginPath();
    ctx.moveTo(shape.verts[0], shape.verts[1]);
    for (let i = 2; i < shape.verts.length; i += 2) {
      ctx.lineTo(shape.verts[i], shape.verts[i + 1]);
    }
    ctx.closePath();
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255, 240, 120, 0.9)';
  for (const p of info.trail) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5 / camera.zoom, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  ctx.save();
  ctx.font = '13px monospace';
  ctx.textBaseline = 'top';
  const pad = 6;
  const width = 250;
  const height = info.lines.length * 17 + pad * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(12, 92, width, height);
  ctx.fillStyle = '#9ff5a0';
  info.lines.forEach((line, i) => {
    ctx.fillText(line, 12 + pad, 92 + pad + i * 17);
  });
  ctx.restore();
}
