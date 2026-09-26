/** 블록·지형 드로잉: 재질 색 + 테두리 + 균열 단계별 검은 선 (§8.4). 바디의 vertices 를 그대로 쓴다. */
import { DAMAGE } from '../core/config';
import { crackStage, type Entity } from '../entities/Entity';
import { MATERIALS } from '../physics/Materials';

function tracePolygon(ctx: CanvasRenderingContext2D, e: Entity): void {
  const v = e.body.vertices;
  ctx.beginPath();
  ctx.moveTo(v[0].x, v[0].y);
  for (let i = 1; i < v.length; i++) ctx.lineTo(v[i].x, v[i].y);
  ctx.closePath();
}

function drawCracks(ctx: CanvasRenderingContext2D, e: Entity, stage: 1 | 2): void {
  const b = e.body;
  const r = e.r ?? Math.max(e.w ?? 20, e.h ?? 20) / 2;
  ctx.save();
  ctx.translate(b.position.x, b.position.y);
  ctx.rotate(b.angle);
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  // 단계 1: 지그재그 1개, 단계 2: 2개 (엔티티 id 로 방향을 고정해 프레임마다 흔들리지 않게)
  const seed = e.id % 7;
  const w = (e.w ?? r * 2) * 0.4;
  const h = (e.h ?? r * 2) * 0.4;
  ctx.moveTo(-w * 0.6, -h * 0.9);
  ctx.lineTo(-w * 0.2 + seed, -h * 0.2);
  ctx.lineTo(w * 0.3, h * 0.1);
  ctx.lineTo(w * 0.1, h * 0.9);
  if (stage === 2) {
    ctx.moveTo(w * 0.8, -h * 0.8);
    ctx.lineTo(w * 0.2 - seed, -h * 0.1);
    ctx.lineTo(-w * 0.5, h * 0.3);
    ctx.lineTo(-w * 0.9, h * 0.8);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawBlock(ctx: CanvasRenderingContext2D, e: Entity): void {
  const b = e.body;
  const m = e.material ? MATERIALS[e.material] : null;
  const fill = m?.color ?? '#b0a080';
  const edge = m?.edge ?? '#5a4a30';

  if (e.shape === 'circle' && e.r !== undefined) {
    ctx.beginPath();
    ctx.arc(b.position.x, b.position.y, e.r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 2;
    ctx.stroke();
    // 회전이 보이도록 반지름 선
    ctx.beginPath();
    ctx.moveTo(b.position.x, b.position.y);
    ctx.lineTo(b.position.x + Math.cos(b.angle) * e.r, b.position.y + Math.sin(b.angle) * e.r);
    ctx.stroke();
  } else {
    tracePolygon(ctx, e);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (e.material === 'wood' && e.shape === 'rect') {
      // 나뭇결
      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);
      ctx.strokeStyle = 'rgba(90, 50, 20, 0.35)';
      ctx.lineWidth = 1;
      const w = e.w ?? 20;
      const h = e.h ?? 80;
      const along = w >= h ? 'x' : 'y';
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) {
        if (along === 'x') {
          ctx.moveTo(-w / 2 + 4, (i * h) / 4);
          ctx.lineTo(w / 2 - 4, (i * h) / 4);
        } else {
          ctx.moveTo((i * w) / 4, -h / 2 + 4);
          ctx.lineTo((i * w) / 4, h / 2 - 4);
        }
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  const stage = crackStage(e, DAMAGE.crackStage1, DAMAGE.crackStage2);
  if (stage > 0) drawCracks(ctx, e, stage);
}

export function drawTerrain(ctx: CanvasRenderingContext2D, e: Entity): void {
  tracePolygon(ctx, e);
  ctx.fillStyle = '#6e4b2a';
  ctx.fill();
  ctx.strokeStyle = '#3e2a15';
  ctx.lineWidth = 2;
  ctx.stroke();
  // 윗면 잔디
  const v = e.body.vertices;
  const top = Math.min(...v.map((p) => p.y));
  const left = Math.min(...v.map((p) => p.x));
  const right = Math.max(...v.map((p) => p.x));
  ctx.fillStyle = '#5faa3c';
  ctx.fillRect(left, top - 4, right - left, 8);
}
