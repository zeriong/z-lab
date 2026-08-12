import { Vector } from '../core/types';
import { Bird, BirdType } from '../game/Bird';
import { Pig } from '../game/Pig';
import { Block } from '../game/Block';
import { Ground } from '../game/Ground';

export function drawBird(ctx: CanvasRenderingContext2D, bird: Bird, pos: Vector, radius: number = 16): void {
  const type = bird.type;

  ctx.save();
  ctx.translate(pos.x, pos.y);

  // Body
  ctx.fillStyle = type === 'speed' ? '#FFD700' : type === 'bomb' ? '#333' : '#FF6B6B';
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(6, -4, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(7, -4, 2, 0, Math.PI * 2);
  ctx.fill();

  // Special markers
  if (type === 'bomb') {
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(-6, -6, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'speed') {
    ctx.strokeStyle = '#FF6B6B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(-6, 0);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawPig(ctx: CanvasRenderingContext2D, pig: Pig, pos: Vector): void {
  const radius = pig.size === 'small' ? 14 : 20;

  ctx.save();
  ctx.translate(pos.x, pos.y);

  // Body
  ctx.fillStyle = '#90EE90';
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  // Snout
  ctx.fillStyle = '#7CCD7C';
  ctx.beginPath();
  ctx.arc(radius * 0.6, 0, radius * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(-radius * 0.3, -radius * 0.4, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-radius * 0.3, radius * 0.4, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawBlock(
  ctx: CanvasRenderingContext2D,
  block: Block,
  pos: Vector,
  rotation: number
): void {
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(rotation);

  // Color based on material
  switch (block.type) {
    case 'glass':
      ctx.fillStyle = 'rgba(100, 150, 255, 0.6)';
      ctx.strokeStyle = '#4080FF';
      break;
    case 'wood':
      ctx.fillStyle = '#8B4513';
      ctx.strokeStyle = '#654321';
      break;
    case 'stone':
      ctx.fillStyle = '#999';
      ctx.strokeStyle = '#666';
      break;
    default:
      ctx.fillStyle = '#ccc';
      ctx.strokeStyle = '#999';
  }

  if (block.shape === 'rect') {
    const w = block.size.w || 40;
    const h = block.size.h || 40;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
  } else if (block.shape === 'circle') {
    const r = block.size.r || 20;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

export function drawGround(ctx: CanvasRenderingContext2D, pos: Vector, w: number, h: number): void {
  ctx.fillStyle = '#8B7355';
  ctx.fillRect(pos.x - w / 2, pos.y - h / 2, w, h);

  // Pattern
  ctx.strokeStyle = '#A0826D';
  ctx.lineWidth = 2;
  for (let i = 0; i < w; i += 20) {
    ctx.beginPath();
    ctx.moveTo(pos.x - w / 2 + i, pos.y - h / 2);
    ctx.lineTo(pos.x - w / 2 + i, pos.y + h / 2);
    ctx.stroke();
  }
}

export function drawParticle(
  ctx: CanvasRenderingContext2D,
  pos: Vector,
  size: number,
  color: string,
  opacity: number
): void {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
