/**
 * §12 renderBody — 도형/스프라이트 단일 진입점.
 * 나중에 WebGL이나 스프라이트로 갈아탈 때 이 파일만 바꾸면 되도록 렌더 진입점을 하나로 좁혔다.
 */

import type { Body } from 'matter-js';
import { BIRD, MATERIAL, getGame } from '../game/entities';

function tracePolygon(ctx: CanvasRenderingContext2D, body: Body): void {
  const v = body.vertices;
  if (v.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(v[0]!.x, v[0]!.y);
  for (let i = 1; i < v.length; i++) ctx.lineTo(v[i]!.x, v[i]!.y);
  ctx.closePath();
}

/** hp/maxHp < 0.5면 균열선 2~4개를 알파 0.3으로 얹는다(§12 레이어 4). */
function drawCracks(ctx: CanvasRenderingContext2D, body: Body, ratio: number): void {
  const r =
    Math.max(body.bounds.max.x - body.bounds.min.x, body.bounds.max.y - body.bounds.min.y) / 2;
  const n = ratio < 0.25 ? 4 : 2;
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2;
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.6;
    ctx.moveTo(-Math.cos(a) * r * 0.7, -Math.sin(a) * r * 0.7);
    ctx.lineTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.55);
  }
  ctx.stroke();
  ctx.restore();
}

function drawPig(ctx: CanvasRenderingContext2D, body: Body, radius: number, ratio: number): void {
  const { x, y } = body.position;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(body.angle);

  ctx.fillStyle = ratio < 0.5 ? '#66a336' : MATERIAL.pig.color;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.stroke();

  // 코
  ctx.fillStyle = '#5aa02c';
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.15, radius * 0.42, radius * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3d7a1c';
  ctx.beginPath();
  ctx.arc(-radius * 0.16, radius * 0.15, radius * 0.09, 0, Math.PI * 2);
  ctx.arc(radius * 0.16, radius * 0.15, radius * 0.09, 0, Math.PI * 2);
  ctx.fill();

  // 눈
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-radius * 0.35, -radius * 0.3, radius * 0.26, 0, Math.PI * 2);
  ctx.arc(radius * 0.35, -radius * 0.3, radius * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#12160f';
  ctx.beginPath();
  ctx.arc(-radius * 0.32, -radius * 0.3, radius * 0.12, 0, Math.PI * 2);
  ctx.arc(radius * 0.38, -radius * 0.3, radius * 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBird(ctx: CanvasRenderingContext2D, body: Body, radius: number, type: string): void {
  const spec = BIRD[type as 'red'];
  const { x, y } = body.position;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(body.angle);

  ctx.fillStyle = spec?.color ?? '#e2402f';
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 배
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.35, radius * 0.5, radius * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // 눈
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(radius * 0.28, -radius * 0.28, radius * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#101014';
  ctx.beginPath();
  ctx.arc(radius * 0.36, -radius * 0.28, radius * 0.13, 0, Math.PI * 2);
  ctx.fill();

  // 부리
  ctx.fillStyle = '#f0a026';
  ctx.beginPath();
  ctx.moveTo(radius * 0.85, -radius * 0.05);
  ctx.lineTo(radius * 1.5, radius * 0.12);
  ctx.lineTo(radius * 0.8, radius * 0.35);
  ctx.closePath();
  ctx.fill();

  if (type === 'black') {
    // 퓨즈
    ctx.strokeStyle = '#d8c8a0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.quadraticCurveTo(radius * 0.3, -radius * 1.5, radius * 0.1, -radius * 1.8);
    ctx.stroke();
  }

  ctx.restore();
}

function drawGround(ctx: CanvasRenderingContext2D, body: Body): void {
  tracePolygon(ctx, body);
  ctx.fillStyle = MATERIAL.ground.color;
  ctx.fill();

  // 잔디 상단 띠
  const top = body.bounds.min.y;
  ctx.fillStyle = '#6aa84f';
  ctx.fillRect(body.bounds.min.x, top, body.bounds.max.x - body.bounds.min.x, 14);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(body.bounds.min.x, top + 14, body.bounds.max.x - body.bounds.min.x, 4);
}

/** 단일 진입점 */
export function renderBody(ctx: CanvasRenderingContext2D, body: Body): void {
  const g = getGame(body);
  if (!g) {
    tracePolygon(ctx, body);
    ctx.fillStyle = '#888';
    ctx.fill();
    return;
  }

  const ratio = g.maxHp === Infinity ? 1 : Math.max(0, g.hp / g.maxHp);

  switch (g.kind) {
    case 'ground':
      drawGround(ctx, body);
      return;

    case 'pig':
      drawPig(ctx, body, g.radius ?? 16, ratio);
      return;

    case 'bird':
      drawBird(ctx, body, g.radius ?? 14, g.birdType ?? 'red');
      return;

    case 'block': {
      const spec = MATERIAL[g.material];
      if (g.round && g.radius) {
        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);
        ctx.beginPath();
        ctx.arc(0, 0, g.radius, 0, Math.PI * 2);
        ctx.fillStyle = spec.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.stroke();
        ctx.restore();
      } else {
        tracePolygon(ctx, body);
        ctx.fillStyle = spec.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.stroke();

        // 결/광택
        ctx.save();
        ctx.clip();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(body.bounds.min.x, body.bounds.min.y, body.bounds.max.x - body.bounds.min.x, 5);
        ctx.restore();
      }
      if (ratio < 0.5) drawCracks(ctx, body, ratio);
      return;
    }
  }
}
