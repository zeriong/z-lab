/** 새: 색 원 + 부리 삼각 + 눈썹 + 눈 (§8.4). 바디 회전을 따른다. */
import type { Entity } from '../entities/Entity';
import { BIRD_COLORS } from '../physics/Materials';

export function drawBird(ctx: CanvasRenderingContext2D, e: Entity): void {
  const b = e.body;
  const r = e.r ?? 18;
  const color = BIRD_COLORS[e.birdKind ?? 'red'];

  ctx.save();
  ctx.translate(b.position.x, b.position.y);
  ctx.rotate(b.angle);

  // 몸
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 배
  ctx.fillStyle = 'rgba(255, 230, 200, 0.85)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.45, r * 0.55, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 부리
  ctx.fillStyle = '#f2b233';
  ctx.strokeStyle = '#a5731a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(r * 0.55, -r * 0.05);
  ctx.lineTo(r * 1.25, r * 0.1);
  ctx.lineTo(r * 0.55, r * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 눈
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(r * 0.35, -r * 0.3, r * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(r * 0.42, -r * 0.3, r * 0.12, 0, Math.PI * 2);
  ctx.fill();

  // 눈썹 (화난 표정)
  ctx.strokeStyle = '#3a1a0a';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(r * 0.05, -r * 0.7);
  ctx.lineTo(r * 0.7, -r * 0.45);
  ctx.stroke();

  // 꽁지깃
  ctx.strokeStyle = '#3a1a0a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.9, 0);
  ctx.lineTo(-r * 1.3, -r * 0.3);
  ctx.moveTo(-r * 0.9, 0);
  ctx.lineTo(-r * 1.3, r * 0.2);
  ctx.stroke();

  ctx.restore();
}

/** HUD 남은 새 아이콘용 소형 새 */
export function drawBirdIcon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, kind: keyof typeof BIRD_COLORS): void {
  ctx.fillStyle = BIRD_COLORS[kind];
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#f2b233';
  ctx.beginPath();
  ctx.moveTo(x + r * 0.5, y);
  ctx.lineTo(x + r * 1.2, y + r * 0.15);
  ctx.lineTo(x + r * 0.5, y + r * 0.35);
  ctx.closePath();
  ctx.fill();
}
