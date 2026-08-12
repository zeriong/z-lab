import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../core/constants';
import { hashRandom, TAU } from '../core/math';
import type { BirdKind } from '../data/levelSchema';
import { BIRDS } from '../physics/materials';
import type { Block } from '../game/entities/Block';
import type { Pig } from '../game/entities/Pig';
import type { Ground } from '../game/entities/Ground';

/**
 * Shape-based art (plan §0 non-goals: no third-party IP assets, everything is
 * drawn from primitives). Every function assumes the caller has already put
 * the context in the right space.
 */

export function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// --------------------------------------------------------------- background

export function drawBackground(ctx: CanvasRenderingContext2D, camX: number, zoom: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
  sky.addColorStop(0, '#4aa8e0');
  sky.addColorStop(0.55, '#96d4f2');
  sky.addColorStop(1, '#d9f0d2');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  // Sun
  ctx.fillStyle = 'rgba(255, 246, 199, 0.85)';
  ctx.beginPath();
  ctx.arc(LOGICAL_WIDTH * 0.82, 110, 54, 0, TAU);
  ctx.fill();

  // Clouds — slowest parallax layer.
  const cloudShift = -camX * 0.12;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 7; i += 1) {
    const baseX = i * 420 + hashRandom(i * 7 + 1) * 200;
    const x = ((baseX + cloudShift) % 2800) + (((baseX + cloudShift) % 2800) < -200 ? 2800 : 0);
    const y = 60 + hashRandom(i * 13 + 3) * 160;
    const s = 0.7 + hashRandom(i * 17 + 5) * 0.8;
    drawCloud(ctx, x - 200, y, s);
  }

  // Two hill layers.
  drawHills(ctx, -camX * 0.28, LOGICAL_HEIGHT * 0.72, 150, '#7fbf7a', zoom);
  drawHills(ctx, -camX * 0.45, LOGICAL_HEIGHT * 0.82, 110, '#5da65f', zoom);
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, TAU);
  ctx.arc(30, -10, 32, 0, TAU);
  ctx.arc(64, 2, 24, 0, TAU);
  ctx.arc(32, 14, 28, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawHills(
  ctx: CanvasRenderingContext2D,
  shift: number,
  baseY: number,
  amplitude: number,
  color: string,
  zoom: number,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, LOGICAL_HEIGHT);
  const step = 40;
  for (let x = 0; x <= LOGICAL_WIDTH + step; x += step) {
    const wx = (x - shift) * 0.4;
    const y = baseY - Math.sin(wx * 0.006) * amplitude * 0.5 - Math.sin(wx * 0.0017) * amplitude;
    ctx.lineTo(x, y + (1 - zoom) * 40);
  }
  ctx.lineTo(LOGICAL_WIDTH, LOGICAL_HEIGHT);
  ctx.closePath();
  ctx.fill();
}

// ------------------------------------------------------------------- ground

export function drawGround(ctx: CanvasRenderingContext2D, ground: Ground): void {
  for (const piece of ground.pieces) {
    ctx.fillStyle = '#8b5a33';
    ctx.fillRect(piece.x, piece.y, piece.w, piece.h);

    ctx.fillStyle = '#6f4526';
    for (let i = 0; i < Math.floor(piece.w / 90); i += 1) {
      const rx = piece.x + hashRandom(i * 31 + 7) * piece.w;
      const ry = piece.y + 24 + hashRandom(i * 37 + 11) * (piece.h - 30);
      ctx.fillRect(rx, ry, 18 + hashRandom(i * 41) * 26, 7);
    }

    ctx.fillStyle = '#5fae4f';
    ctx.fillRect(piece.x, piece.y, piece.w, 16);
    ctx.fillStyle = '#7ccb63';
    ctx.fillRect(piece.x, piece.y, piece.w, 7);

    ctx.strokeStyle = '#4b8b3f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < Math.floor(piece.w / 26); i += 1) {
      const gx = piece.x + i * 26 + hashRandom(i * 19 + 3) * 12;
      ctx.moveTo(gx, piece.y + 2);
      ctx.lineTo(gx + (hashRandom(i * 23) - 0.5) * 8, piece.y - 8 - hashRandom(i * 29) * 7);
    }
    ctx.stroke();
  }
}

// ------------------------------------------------------------------- blocks

export function drawBlock(
  ctx: CanvasRenderingContext2D,
  block: Block,
  x: number,
  y: number,
  angle: number,
): void {
  const spec = block.spec;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.fillStyle = spec.fill;
  ctx.strokeStyle = spec.stroke;
  ctx.lineWidth = 2;

  if (block.shape === 'circle') {
    ctx.beginPath();
    ctx.arc(0, 0, block.r, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(block.r, 0);
    ctx.stroke();
  } else {
    const w = block.w;
    const h = block.h;
    roundedRectPath(ctx, -w / 2, -h / 2, w, h, Math.min(5, Math.min(w, h) * 0.25));
    ctx.fill();
    ctx.stroke();

    if (block.type === 'wood') {
      ctx.strokeStyle = 'rgba(94, 58, 24, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const along = w >= h ? w : h;
      const lines = Math.max(1, Math.floor(along / 26));
      for (let i = 1; i <= lines; i += 1) {
        const t = (i / (lines + 1) - 0.5) * (w >= h ? h : w);
        if (w >= h) {
          ctx.moveTo(-w / 2 + 4, t);
          ctx.lineTo(w / 2 - 4, t);
        } else {
          ctx.moveTo(t, -h / 2 + 4);
          ctx.lineTo(t, h / 2 - 4);
        }
      }
      ctx.stroke();
    } else if (block.type === 'stone') {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, Math.min(6, h * 0.2));
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(-w / 2 + 4, -h / 2 + 4, Math.max(2, w * 0.12), h - 8);
    }
  }

  // Cracks scale with lost hp.
  const damage = 1 - block.hpRatio;
  if (damage > 0.15) {
    const extent = block.extent;
    ctx.strokeStyle = `rgba(20, 12, 8, ${Math.min(0.75, damage)})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    const cracks = damage > 0.6 ? 4 : 2;
    for (let i = 0; i < cracks; i += 1) {
      const a = hashRandom(i * 97 + block.handle.id) * TAU;
      const len = extent * (0.5 + hashRandom(i * 53 + block.handle.id) * 0.5);
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
    }
    ctx.stroke();
  }

  if (block.damageFlash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${block.damageFlash * 0.4})`;
    if (block.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, block.r, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillRect(-block.w / 2, -block.h / 2, block.w, block.h);
    }
  }

  ctx.restore();
}

// --------------------------------------------------------------------- pigs

export function drawPig(
  ctx: CanvasRenderingContext2D,
  pig: Pig,
  x: number,
  y: number,
  angle: number,
): void {
  const r = pig.radius;
  const hurt = 1 - pig.hpRatio;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Ears
  ctx.fillStyle = '#69ad42';
  ctx.beginPath();
  ctx.arc(-r * 0.62, -r * 0.72, r * 0.3, 0, TAU);
  ctx.arc(r * 0.62, -r * 0.72, r * 0.3, 0, TAU);
  ctx.fill();

  // Body
  ctx.fillStyle = hurt > 0.5 ? '#93b96b' : '#7ec850';
  ctx.strokeStyle = '#4e8f2f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // Snout
  ctx.fillStyle = '#96da66';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.22, r * 0.42, r * 0.32, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#3f7a24';
  ctx.beginPath();
  ctx.arc(-r * 0.16, r * 0.22, r * 0.08, 0, TAU);
  ctx.arc(r * 0.16, r * 0.22, r * 0.08, 0, TAU);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-r * 0.34, -r * 0.22, r * 0.24, 0, TAU);
  ctx.arc(r * 0.34, -r * 0.22, r * 0.24, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#111';
  const pupil = hurt > 0.5 ? r * 0.08 : r * 0.11;
  ctx.beginPath();
  ctx.arc(-r * 0.3, -r * 0.22, pupil, 0, TAU);
  ctx.arc(r * 0.38, -r * 0.22, pupil, 0, TAU);
  ctx.fill();

  if (pig.hurtFlash > 0) {
    ctx.fillStyle = `rgba(255, 80, 80, ${pig.hurtFlash * 0.5})`;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
}

// -------------------------------------------------------------------- birds

export function drawBird(
  ctx: CanvasRenderingContext2D,
  kind: BirdKind,
  x: number,
  y: number,
  angle: number,
  radiusOverride?: number,
): void {
  const spec = BIRDS[kind];
  const r = radiusOverride ?? spec.radius;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Tail
  ctx.fillStyle = spec.body;
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, -r * 0.2);
  ctx.lineTo(-r * 1.6, -r * 0.75);
  ctx.lineTo(-r * 1.45, r * 0.15);
  ctx.closePath();
  ctx.fill();

  // Body
  ctx.fillStyle = spec.body;
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // Belly
  ctx.fillStyle = spec.belly;
  ctx.beginPath();
  ctx.ellipse(r * 0.05, r * 0.42, r * 0.5, r * 0.35, 0, 0, TAU);
  ctx.fill();

  // Beak
  ctx.fillStyle = spec.beak;
  ctx.beginPath();
  ctx.moveTo(r * 0.6, -r * 0.05);
  ctx.lineTo(r * 1.35, r * 0.12);
  ctx.lineTo(r * 0.6, r * 0.35);
  ctx.closePath();
  ctx.fill();

  // Eye
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(r * 0.3, -r * 0.3, r * 0.3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(r * 0.4, -r * 0.3, r * 0.13, 0, TAU);
  ctx.fill();

  // Brow — the angry part
  ctx.strokeStyle = '#2a1210';
  ctx.lineWidth = Math.max(2, r * 0.16);
  ctx.beginPath();
  ctx.moveTo(r * 0.02, -r * 0.68);
  ctx.lineTo(r * 0.62, -r * 0.4);
  ctx.stroke();

  if (kind === 'bomb') {
    ctx.strokeStyle = '#d8d8d8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r * 0.4, -r * 1.6, r * 0.05, -r * 1.9);
    ctx.stroke();
    ctx.fillStyle = '#ff8a3d';
    ctx.beginPath();
    ctx.arc(r * 0.05, -r * 1.95, r * 0.16, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
}

/** Compact bird glyph for the HUD queue (drawn in screen space). */
export function drawBirdIcon(
  ctx: CanvasRenderingContext2D,
  kind: BirdKind,
  x: number,
  y: number,
  r: number,
  dimmed = false,
): void {
  ctx.save();
  ctx.globalAlpha = dimmed ? 0.32 : 1;
  drawBird(ctx, kind, x, y, 0, r);
  ctx.restore();
}

// ---------------------------------------------------------------- slingshot

export function drawSlingshot(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  anchorY: number,
  birdX: number,
  birdY: number,
  hasBird: boolean,
): void {
  const baseY = anchorY + 120;

  ctx.strokeStyle = '#7a4a22';
  ctx.lineCap = 'round';

  // Back band first so the bird sits between the prongs.
  if (hasBird) {
    ctx.strokeStyle = '#3a2a1c';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(anchorX + 14, anchorY);
    ctx.lineTo(birdX, birdY);
    ctx.stroke();
  }

  ctx.strokeStyle = '#7a4a22';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(anchorX, baseY);
  ctx.lineTo(anchorX, anchorY + 26);
  ctx.stroke();

  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(anchorX, anchorY + 30);
  ctx.lineTo(anchorX - 16, anchorY - 4);
  ctx.moveTo(anchorX, anchorY + 30);
  ctx.lineTo(anchorX + 16, anchorY - 4);
  ctx.stroke();

  if (hasBird) {
    ctx.strokeStyle = '#3a2a1c';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(anchorX - 14, anchorY - 2);
    ctx.lineTo(birdX, birdY);
    ctx.stroke();
  }
}

export function drawTrajectory(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
): void {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < points.length; i += 1) {
    const t = 1 - i / (points.length + 1);
    ctx.globalAlpha = 0.25 + t * 0.6;
    ctx.beginPath();
    ctx.arc(points[i].x, points[i].y, 4.5 - i * 0.12, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
