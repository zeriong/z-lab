/**
 * 렌더 (§3: Canvas 2D 단일 캔버스, 즉시모드).
 * 좌표계는 호출자가 이미 논리 좌표(1280x720, DPR·화면흔들림 적용)로 맞춰 놓은 상태를 가정한다.
 * 아트는 전부 코드 생성 도형/그라디언트 — 외부 에셋 없음(§1-B R10).
 */

import type Matter from 'matter-js';
import type { BirdKind, StageDef, Vec2 } from './types';
import { metaOf } from './physics';
import type { Effects } from './effects';
import {
  BIRD_RADIUS,
  GROUND_Y,
  LOGICAL_H,
  LOGICAL_W,
  MATERIALS,
  MAX_PULL,
  PIG_RADIUS,
  PRED_DOT_R,
} from './tuning';

export interface AimVisual {
  anchor: Vec2;
  birdPos: Vec2;
  kind: BirdKind;
  pulling: boolean;
  power: number; // 0..1
  predicted: Vec2[];
}

export interface RenderScene {
  stage: StageDef | null;
  bodies: Matter.Body[];
  aim: AimVisual | null;
  /** 대기 중인 새 종류(발사 순서) */
  waiting: BirdKind[];
  effects: Effects;
}

// ---------- 배경 (2레이어 + 지면) ----------

export function drawBackdrop(ctx: CanvasRenderingContext2D, drift = 0): void {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#4da3d6');
  sky.addColorStop(0.55, '#8fd0ea');
  sky.addColorStop(1, '#d9f0f7');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  // 원경: 느리게 흐르는 언덕 (레이어 1)
  ctx.save();
  ctx.translate(-drift * 0.25, 0);
  ctx.fillStyle = '#7fb59a';
  hill(ctx, 180, GROUND_Y + 10, 320, 150);
  hill(ctx, 640, GROUND_Y + 10, 420, 190);
  hill(ctx, 1120, GROUND_Y + 10, 360, 160);
  ctx.restore();

  // 근경: 진한 언덕 (레이어 2)
  ctx.save();
  ctx.translate(-drift * 0.6, 0);
  ctx.fillStyle = '#5c9b7d';
  hill(ctx, 60, GROUND_Y + 16, 260, 90);
  hill(ctx, 480, GROUND_Y + 16, 300, 110);
  hill(ctx, 980, GROUND_Y + 16, 280, 96);
  ctx.restore();

  // 구름
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  cloud(ctx, 220 - drift * 0.1, 120, 1.1);
  cloud(ctx, 760 - drift * 0.14, 90, 0.85);
  cloud(ctx, 1080 - drift * 0.18, 160, 1);

  // 지면
  const soil = ctx.createLinearGradient(0, GROUND_Y, 0, LOGICAL_H);
  soil.addColorStop(0, '#6ea54f');
  soil.addColorStop(0.12, '#4f7a37');
  soil.addColorStop(1, '#3a5a29');
  ctx.fillStyle = soil;
  ctx.fillRect(0, GROUND_Y, LOGICAL_W, LOGICAL_H - GROUND_Y);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(0, GROUND_Y, LOGICAL_W, 4);
}

function hill(ctx: CanvasRenderingContext2D, cx: number, baseY: number, w: number, h: number): void {
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, baseY);
  ctx.quadraticCurveTo(cx, baseY - h * 2, cx + w / 2, baseY);
  ctx.closePath();
  ctx.fill();
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.beginPath();
  ctx.arc(x, y, 26 * s, 0, Math.PI * 2);
  ctx.arc(x + 30 * s, y + 8 * s, 20 * s, 0, Math.PI * 2);
  ctx.arc(x - 28 * s, y + 10 * s, 18 * s, 0, Math.PI * 2);
  ctx.fill();
}

/** 메인/선택 화면 뒤에 깔리는 정적 배경 */
export function drawMenuBackdrop(ctx: CanvasRenderingContext2D): void {
  drawBackdrop(ctx, 0);
}

// ---------- 월드 ----------

export function drawWorld(ctx: CanvasRenderingContext2D, scene: RenderScene): void {
  drawBackdrop(ctx, 0);

  for (const body of scene.bodies) {
    const meta = metaOf(body);
    if (!meta) continue;
    switch (meta.kind) {
      case 'ground':
        break; // 배경으로 이미 그렸다
      case 'terrain':
        drawPolygon(ctx, body, '#5a7f3c', '#3d5a28');
        break;
      case 'block':
        drawBlock(ctx, body);
        break;
      case 'debris':
        drawDebris(ctx, body);
        break;
      case 'pig':
        drawPig(ctx, body);
        break;
      case 'bird':
        drawBird(ctx, body.position, meta.birdKind ?? 'basic', body.angle);
        break;
    }
  }

  if (scene.stage) drawSlingshot(ctx, scene.stage.slingshot, scene.aim);
  if (scene.aim) {
    drawAim(ctx, scene.aim);
    drawBird(ctx, scene.aim.birdPos, scene.aim.kind, 0);
  }
  if (scene.stage) drawWaitingBirds(ctx, scene.stage.slingshot, scene.waiting);

  scene.effects.draw(ctx);
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  body: Matter.Body,
  fill: string,
  stroke: string,
): void {
  const v = body.vertices;
  ctx.beginPath();
  ctx.moveTo(v[0].x, v[0].y);
  for (let i = 1; i < v.length; i += 1) ctx.lineTo(v[i].x, v[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function drawBlock(ctx: CanvasRenderingContext2D, body: Matter.Body): void {
  const meta = metaOf(body);
  if (!meta || !meta.material) return;
  const spec = MATERIALS[meta.material];
  drawPolygon(ctx, body, spec.fill, spec.stroke);

  // 데미지 표시: HP 비율에 따라 균열선을 겹친다 (재료별로 색이 달라 육안 구분 가능)
  const ratio = meta.hp / meta.maxHp;
  if (ratio < 0.98) {
    const v = body.vertices;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(v[0].x, v[0].y);
    for (let i = 1; i < v.length; i += 1) ctx.lineTo(v[i].x, v[i].y);
    ctx.closePath();
    ctx.clip();
    ctx.globalAlpha = Math.min(0.85, (1 - ratio) * 1.1);
    ctx.strokeStyle = meta.material === 'ice' ? '#ffffff' : '#2c1b09';
    ctx.lineWidth = 1.6;
    const c = body.position;
    const cracks = 3;
    for (let i = 0; i < cracks; i += 1) {
      const a = body.angle + (i * Math.PI * 2) / cracks;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x + Math.cos(a) * 40, c.y + Math.sin(a) * 40);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawDebris(ctx: CanvasRenderingContext2D, body: Matter.Body): void {
  const meta = metaOf(body);
  const material = meta?.material ?? 'wood';
  const spec = MATERIALS[material];
  ctx.beginPath();
  ctx.arc(body.position.x, body.position.y, body.circleRadius ?? 5, 0, Math.PI * 2);
  ctx.fillStyle = spec.debris;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = spec.stroke;
  ctx.stroke();
}

function drawPig(ctx: CanvasRenderingContext2D, body: Matter.Body): void {
  const meta = metaOf(body);
  const hurt = meta ? 1 - meta.hp / meta.maxHp : 0;
  const { x, y } = body.position;
  const r = body.circleRadius ?? PIG_RADIUS;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(body.angle);
  // 몸통
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.2, 0, 0, r);
  g.addColorStop(0, hurt > 0.5 ? '#b8d97a' : '#a8e05f');
  g.addColorStop(1, hurt > 0.5 ? '#5f8a35' : '#6cb02f');
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#3f6b1c';
  ctx.stroke();
  // 눈
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-r * 0.34, -r * 0.28, r * 0.26, 0, Math.PI * 2);
  ctx.arc(r * 0.34, -r * 0.28, r * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#12200a';
  ctx.beginPath();
  ctx.arc(-r * 0.3, -r * 0.26, r * 0.11, 0, Math.PI * 2);
  ctx.arc(r * 0.38, -r * 0.26, r * 0.11, 0, Math.PI * 2);
  ctx.fill();
  // 코
  ctx.fillStyle = '#8ecb45';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.22, r * 0.38, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4d7a22';
  ctx.beginPath();
  ctx.arc(-r * 0.14, r * 0.22, r * 0.07, 0, Math.PI * 2);
  ctx.arc(r * 0.14, r * 0.22, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
  // 피해 표시
  if (hurt > 0.25) {
    ctx.strokeStyle = 'rgba(90,40,20,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, r * 0.55);
    ctx.lineTo(r * 0.5, r * 0.42);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawBird(
  ctx: CanvasRenderingContext2D,
  pos: Vec2,
  kind: BirdKind,
  angle: number,
  scale = 1,
): void {
  const r = (kind === 'dash' ? BIRD_RADIUS - 1 : BIRD_RADIUS) * scale;
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(angle);
  const body = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.2, 0, 0, r);
  if (kind === 'dash') {
    body.addColorStop(0, '#ffe08a');
    body.addColorStop(1, '#f2b21c');
  } else {
    body.addColorStop(0, '#ff8a7a');
    body.addColorStop(1, '#d32f26');
  }
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = kind === 'dash' ? '#9a6a00' : '#8c1912';
  ctx.stroke();
  // 부리
  ctx.beginPath();
  ctx.moveTo(r * 0.75, -r * 0.1);
  ctx.lineTo(r * 1.5, r * 0.1);
  ctx.lineTo(r * 0.75, r * 0.35);
  ctx.closePath();
  ctx.fillStyle = '#ffb800';
  ctx.fill();
  // 눈
  ctx.beginPath();
  ctx.arc(r * 0.3, -r * 0.35, r * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.38, -r * 0.35, r * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1008';
  ctx.fill();
  if (kind === 'dash') {
    // 대시새 표식: 등의 화살 무늬
    ctx.strokeStyle = '#fff8dc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, r * 0.1);
    ctx.lineTo(-r * 0.2, -r * 0.3);
    ctx.lineTo(-r * 0.5, r * 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSlingshot(ctx: CanvasRenderingContext2D, anchor: Vec2, aim: AimVisual | null): void {
  const baseY = GROUND_Y;
  const x = anchor.x;
  const forkY = anchor.y;
  ctx.save();
  ctx.lineCap = 'round';
  // 기둥
  ctx.strokeStyle = '#7a4a1c';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x, forkY + 26);
  ctx.stroke();
  // Y 가지
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(x, forkY + 30);
  ctx.lineTo(x - 20, forkY - 6);
  ctx.moveTo(x, forkY + 30);
  ctx.lineTo(x + 20, forkY - 6);
  ctx.stroke();

  // 고무줄: 조준 중에는 새를 따라간다
  const left = { x: x - 20, y: forkY - 6 };
  const right = { x: x + 20, y: forkY - 6 };
  const hold = aim ? aim.birdPos : { x, y: forkY };
  ctx.strokeStyle = '#3c2a1a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(left.x, left.y);
  ctx.lineTo(hold.x, hold.y);
  ctx.moveTo(right.x, right.y);
  ctx.lineTo(hold.x, hold.y);
  ctx.stroke();
  ctx.restore();
}

function drawAim(ctx: CanvasRenderingContext2D, aim: AimVisual): void {
  if (!aim.pulling) return;

  // 예측 점선
  ctx.save();
  for (let i = 0; i < aim.predicted.length; i += 1) {
    const p = aim.predicted[i];
    ctx.globalAlpha = 0.85 - i * 0.05;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PRED_DOT_R, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  ctx.restore();

  // 파워 게이지 + 당김 벡터
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(aim.anchor.x, aim.anchor.y);
  ctx.lineTo(aim.birdPos.x, aim.birdPos.y);
  ctx.stroke();
  ctx.setLineDash([]);

  const gx = aim.anchor.x - 46;
  const gy = aim.anchor.y - 120;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(gx, gy, 92, 12);
  ctx.fillStyle = aim.power > 0.85 ? '#ff5f45' : '#ffd23f';
  ctx.fillRect(gx + 2, gy + 2, 88 * aim.power, 8);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1;
  ctx.strokeRect(gx, gy, 92, 12);
  // 최대 당김 원(시각적으로 멈추는 지점)
  ctx.setLineDash([4, 8]);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.arc(aim.anchor.x, aim.anchor.y, MAX_PULL, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** 대기 중인 새들을 새총 뒤에 줄 세운다 (남은 새를 월드에서도 읽을 수 있게) */
function drawWaitingBirds(ctx: CanvasRenderingContext2D, anchor: Vec2, waiting: BirdKind[]): void {
  for (let i = 0; i < waiting.length; i += 1) {
    const x = anchor.x - 56 - i * 34;
    const y = GROUND_Y - 12;
    drawBird(ctx, { x, y }, waiting[i], 0, 0.85);
  }
}
