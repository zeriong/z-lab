// 배경·지형·블록·돼지 그리기 (절차적 도형, A4). entity.kind → draw 함수.
import type { Body } from 'matter-js';
import { CRACK_1, CRACK_2, GROUND_Y, MATERIALS, WORLD_H, WORLD_W } from '../../config';
import type { Entity, MaterialId, PigType } from '../../types';

export function drawBackground(ctx: CanvasRenderingContext2D): void {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#6ec6ff');
  sky.addColorStop(1, '#d9f3ff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WORLD_W, GROUND_Y);

  // 구름
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [cx, cy, s] of [
    [260, 140, 1],
    [700, 90, 1.3],
    [1180, 170, 0.9],
    [1460, 80, 1.1],
  ] as const) {
    ctx.beginPath();
    ctx.arc(cx, cy, 34 * s, 0, Math.PI * 2);
    ctx.arc(cx + 38 * s, cy - 12 * s, 42 * s, 0, Math.PI * 2);
    ctx.arc(cx + 82 * s, cy, 32 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // 먼 언덕
  ctx.fillStyle = '#9ccc65';
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  for (let x = 0; x <= WORLD_W; x += 40) {
    ctx.lineTo(x, GROUND_Y - 60 - Math.sin(x / 180) * 30 - Math.sin(x / 67) * 8);
  }
  ctx.lineTo(WORLD_W, GROUND_Y);
  ctx.closePath();
  ctx.fill();
}

export function drawGround(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#6d4c41';
  ctx.fillRect(-400, GROUND_Y, WORLD_W + 800, WORLD_H - GROUND_Y + 200);
  ctx.fillStyle = '#7cb342';
  ctx.fillRect(-400, GROUND_Y, WORLD_W + 800, 14);
}

function polygonPath(ctx: CanvasRenderingContext2D, body: Body): void {
  const v = body.vertices;
  ctx.beginPath();
  const first = v[0];
  if (!first) return;
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < v.length; i++) ctx.lineTo(v[i]!.x, v[i]!.y);
  ctx.closePath();
}

export function drawStatic(ctx: CanvasRenderingContext2D, body: Body): void {
  if (body.label === 'ground') return;
  polygonPath(ctx, body);
  ctx.fillStyle = '#78797d';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#4a4b4f';
  ctx.stroke();
}

/** body.id로 고정된 의사 난수 (균열 모양이 프레임마다 바뀌지 않게) */
function hashRand(id: number, i: number): number {
  const x = Math.sin(id * 12.9898 + i * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function drawCracks(ctx: CanvasRenderingContext2D, body: Body, ratio: number, halfW: number, halfH: number): void {
  const level = ratio < CRACK_2 ? 2 : ratio < CRACK_1 ? 1 : 0;
  if (level === 0) return;
  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle);
  ctx.strokeStyle = 'rgba(30,20,10,0.75)';
  ctx.lineWidth = 2;
  const lines = level === 1 ? 2 : 5;
  for (let i = 0; i < lines; i++) {
    const sx = (hashRand(body.id, i) - 0.5) * halfW * 1.6;
    const sy = (hashRand(body.id, i + 10) - 0.5) * halfH * 1.6;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    let x = sx;
    let y = sy;
    for (let j = 0; j < 3; j++) {
      x += (hashRand(body.id, i * 7 + j) - 0.5) * halfW;
      y += (hashRand(body.id, i * 13 + j) - 0.5) * halfH;
      ctx.lineTo(Math.max(-halfW, Math.min(halfW, x)), Math.max(-halfH, Math.min(halfH, y)));
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawMaterialDetail(ctx: CanvasRenderingContext2D, body: Body, material: MaterialId, halfW: number, halfH: number): void {
  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle);
  if (material === 'wood') {
    ctx.strokeStyle = 'rgba(90,50,15,0.35)';
    ctx.lineWidth = 1.5;
    const horizontal = halfW >= halfH;
    const n = 2;
    for (let i = 1; i <= n; i++) {
      ctx.beginPath();
      if (horizontal) {
        const y = -halfH + (2 * halfH * i) / (n + 1);
        ctx.moveTo(-halfW + 4, y);
        ctx.lineTo(halfW - 4, y);
      } else {
        const x = -halfW + (2 * halfW * i) / (n + 1);
        ctx.moveTo(x, -halfH + 4);
        ctx.lineTo(x, halfH - 4);
      }
      ctx.stroke();
    }
  } else if (material === 'glass') {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-halfW * 0.6, -halfH * 0.2);
    ctx.lineTo(-halfW * 0.2, -halfH * 0.6);
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(60,60,60,0.25)';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc((hashRand(body.id, i + 30) - 0.5) * halfW * 1.5, (hashRand(body.id, i + 40) - 0.5) * halfH * 1.5, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawBlock(ctx: CanvasRenderingContext2D, body: Body, e: Extract<Entity, { kind: 'block' }>): void {
  const m = MATERIALS[e.material];
  const ratio = e.hp / e.maxHp;
  const isCircle = !!body.circleRadius;
  let halfW: number;
  let halfH: number;
  if (isCircle) {
    halfW = halfH = body.circleRadius! * 0.7;
    ctx.beginPath();
    ctx.arc(body.position.x, body.position.y, body.circleRadius!, 0, Math.PI * 2);
  } else {
    // 회전 전 크기: 꼭짓점 0-1, 1-2 변 길이
    const v = body.vertices;
    const a = v[0]!;
    const b = v[1]!;
    const c = v[2]!;
    halfW = Math.hypot(b.x - a.x, b.y - a.y) / 2;
    halfH = Math.hypot(c.x - b.x, c.y - b.y) / 2;
    polygonPath(ctx, body);
  }
  ctx.globalAlpha = e.material === 'glass' ? 0.8 : 1;
  ctx.fillStyle = m.color;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = m.edge;
  ctx.stroke();
  drawMaterialDetail(ctx, body, e.material, halfW, halfH);
  drawCracks(ctx, body, ratio, halfW, halfH);
}

const PIG_COLOR: Record<PigType, string> = { small: '#7cc242', large: '#6ab334', helmet: '#76bd3e' };

export function drawPig(ctx: CanvasRenderingContext2D, body: Body, e: Extract<Entity, { kind: 'pig' }>): void {
  const r = body.circleRadius ?? 20;
  const { x, y } = body.position;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(body.angle);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = PIG_COLOR[e.pigType];
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#3e7a1c';
  ctx.stroke();
  // 코
  ctx.beginPath();
  ctx.ellipse(0, r * 0.15, r * 0.34, r * 0.24, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#9ad86a';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2f5d14';
  ctx.beginPath();
  ctx.arc(-r * 0.12, r * 0.15, r * 0.06, 0, Math.PI * 2);
  ctx.arc(r * 0.12, r * 0.15, r * 0.06, 0, Math.PI * 2);
  ctx.fill();
  // 눈
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sx * r * 0.38, -r * 0.25, r * 0.17, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sx * r * 0.34, -r * 0.24, r * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = '#111';
    ctx.fill();
  }
  // 멍 (HP 감소)
  if (e.hp / e.maxHp < CRACK_1) {
    ctx.fillStyle = 'rgba(80,60,120,0.45)';
    ctx.beginPath();
    ctx.arc(r * 0.4, r * 0.35, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // 철모
  if (e.pigType === 'helmet') {
    ctx.beginPath();
    ctx.arc(0, -r * 0.1, r * 1.02, Math.PI * 1.05, Math.PI * 1.95);
    ctx.lineTo(r * 0.95, -r * 0.3);
    ctx.lineTo(-r * 0.95, -r * 0.3);
    ctx.closePath();
    ctx.fillStyle = e.hp / e.maxHp < CRACK_1 ? '#8d8f94' : '#a7a9ad';
    ctx.fill();
    ctx.strokeStyle = '#55575b';
    ctx.stroke();
  }
  ctx.restore();
}
