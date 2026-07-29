// Canvas 2D 자체 드로잉. 에셋은 전부 자체 제작 도형(법률/IP 감사 착지점).

import { WIDTH, HEIGHT, GROUND_Y, MATERIALS } from './constants.js';

export function render(ctx, game) {
  drawBackground(ctx);
  if (!game.ph) return;

  drawSlingshotBack(ctx, game.sling);

  const bodies = Matter.Composite.allBodies(game.ph.engine.world);
  for (const b of bodies) drawBody(ctx, b);

  drawSlingshotFront(ctx, game.sling);
  drawTrajectory(ctx, game.sling);
}

function drawBackground(ctx) {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, '#87ceeb');
  sky.addColorStop(1, '#d8f2fc');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = '#7cb342';
  ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);
  ctx.fillStyle = '#5d8f2f';
  ctx.fillRect(0, GROUND_Y, WIDTH, 6);
}

function drawBody(ctx, b) {
  const p = b.plugin || {};
  switch (p.kind) {
    case 'block': drawBlock(ctx, b, p); break;
    case 'pig': drawPig(ctx, b, p); break;
    case 'bird': drawBird(ctx, b, p); break;
    default: break; // ground는 배경에서 그림
  }
}

function drawBlock(ctx, b, p) {
  const mat = MATERIALS[p.material];
  ctx.save();
  ctx.translate(b.position.x, b.position.y);
  ctx.rotate(b.angle);
  ctx.fillStyle = mat.color;
  ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
  // 손상 표현: hp 비율만큼 어둡게
  const dmg = 1 - Math.max(p.hp, 0) / p.maxHp;
  if (dmg > 0.05) {
    ctx.fillStyle = `rgba(30, 20, 10, ${dmg * 0.45})`;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
  }
  ctx.strokeStyle = mat.edge;
  ctx.lineWidth = 2;
  ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
  ctx.restore();
}

function drawPig(ctx, b, p) {
  const { x, y } = b.position;
  const r = p.r;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(b.angle);

  ctx.fillStyle = '#7ec850';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#559930';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 귀
  ctx.fillStyle = '#7ec850';
  ctx.beginPath();
  ctx.arc(-r * 0.5, -r * 0.85, r * 0.25, 0, Math.PI * 2);
  ctx.arc(r * 0.5, -r * 0.85, r * 0.25, 0, Math.PI * 2);
  ctx.fill();

  // 코
  ctx.fillStyle = '#5faa3c';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.1, r * 0.42, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3d7a24';
  ctx.beginPath();
  ctx.arc(-r * 0.15, r * 0.1, r * 0.08, 0, Math.PI * 2);
  ctx.arc(r * 0.15, r * 0.1, r * 0.08, 0, Math.PI * 2);
  ctx.fill();

  // 눈
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-r * 0.42, -r * 0.35, r * 0.22, 0, Math.PI * 2);
  ctx.arc(r * 0.42, -r * 0.35, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(-r * 0.38, -r * 0.35, r * 0.1, 0, Math.PI * 2);
  ctx.arc(r * 0.46, -r * 0.35, r * 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBird(ctx, b, p) {
  const { x, y } = b.position;
  const r = p.r;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(b.angle);

  ctx.fillStyle = '#d23b2f';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8f2019';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 배
  ctx.fillStyle = '#f2d3a7';
  ctx.beginPath();
  ctx.arc(0, r * 0.4, r * 0.55, 0, Math.PI);
  ctx.fill();

  // 부리
  ctx.fillStyle = '#f5a623';
  ctx.beginPath();
  ctx.moveTo(r * 0.7, -r * 0.05);
  ctx.lineTo(r * 1.35, r * 0.12);
  ctx.lineTo(r * 0.7, r * 0.3);
  ctx.closePath();
  ctx.fill();

  // 눈
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(r * 0.35, -r * 0.3, r * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(r * 0.42, -r * 0.3, r * 0.11, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function slingBirdPos(sling) {
  if (sling.bird) return sling.bird.position;
  return sling.anchor;
}

function drawSlingshotBack(ctx, sling) {
  if (!sling) return;
  const { x, y } = sling.anchor;
  // 기둥(뒤)
  ctx.strokeStyle = '#6b4423';
  ctx.lineCap = 'round';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(x, y + 130);
  ctx.lineTo(x, y + 40);
  ctx.moveTo(x, y + 40);
  ctx.lineTo(x - 18, y);
  ctx.moveTo(x, y + 40);
  ctx.lineTo(x + 18, y);
  ctx.stroke();

  // 밴드(뒤쪽 가닥) — 새가 있으면 새까지
  if (sling.bird) {
    const bp = slingBirdPos(sling);
    ctx.strokeStyle = '#3e2a17';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x + 18, y);
    ctx.lineTo(bp.x, bp.y);
    ctx.stroke();
  }
}

function drawSlingshotFront(ctx, sling) {
  if (!sling || !sling.bird) return;
  const { x, y } = sling.anchor;
  const bp = slingBirdPos(sling);
  ctx.strokeStyle = '#54381f';
  ctx.lineCap = 'round';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x - 18, y);
  ctx.lineTo(bp.x, bp.y);
  ctx.stroke();
}

function drawTrajectory(ctx, sling) {
  if (!sling) return;
  const pts = sling.previewPoints();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  for (const pt of pts) {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
