import type { Pig } from '../../core/entities/pig';
import type { Pose } from '../../core/physics/world';
import { damageStage } from '../../core/rules/damage';

/** 돼지: 초록 원, 눈, 코. 크기별로 다르고 HP가 낮으면 멍 자국 (§8.2-5) */
export function drawPig(ctx: CanvasRenderingContext2D, pig: Pig, pose: Pose): void {
  const r = pig.radius;
  const stage = damageStage(pig.hp, pig.maxHp);
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.angle);

  // 몸
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.2, 0, 0, r);
  g.addColorStop(0, '#b7f06a');
  g.addColorStop(1, '#5fae2c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3d7a19';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 귀
  ctx.fillStyle = '#6fbf36';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * r * 0.55, -r * 0.82, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // 코
  ctx.fillStyle = '#8fdc55';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.18, r * 0.36, r * 0.27, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2f5e12';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * r * 0.13, r * 0.18, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  // 눈
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s * r * 0.38, -r * 0.25, r * 0.19, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(s * r * 0.38 + r * 0.05, -r * 0.24, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  // L 크기는 헬멧 대신 눈썹
  if (pig.size === 'L') {
    ctx.strokeStyle = '#2f5e12';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.5);
    ctx.lineTo(-r * 0.2, -r * 0.42);
    ctx.moveTo(r * 0.6, -r * 0.5);
    ctx.lineTo(r * 0.2, -r * 0.42);
    ctx.stroke();
  }

  // 멍 자국
  if (stage >= 1) {
    ctx.fillStyle = 'rgba(80, 60, 120, 0.45)';
    ctx.beginPath();
    ctx.arc(r * 0.45, -r * 0.2, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
  if (stage >= 2) {
    ctx.beginPath();
    ctx.arc(-r * 0.4, r * 0.5, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
