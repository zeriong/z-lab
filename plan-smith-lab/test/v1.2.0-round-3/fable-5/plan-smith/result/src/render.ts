// 커스텀 Canvas 2D 렌더 (플랜: Matter.Render는 출하 금지 — 디버그 전용 기각).
// 하늘 그라데이션 + 지면 띠(L26), 바디 도형 렌더(가정 1: 아트 자산 없음), 궤적(L7), 파티클(L23).

import type Matter from 'matter-js';
import {
  WORLD_W,
  WORLD_H,
  GROUND_Y,
  ANCHOR,
  GRAVITY_PER_STEP,
  MATERIAL_COLORS,
  MATERIAL_STROKES,
  BIRD_R,
} from './constants';
import type { Session, BodyMeta } from './world';
import { drawParticles } from './particles';

const FORK_L = { x: ANCHOR.x - 14, y: ANCHOR.y - 10 };
const FORK_R = { x: ANCHOR.x + 14, y: ANCHOR.y - 10 };

export function drawFrame(ctx: CanvasRenderingContext2D, session: Session | null): void {
  // 하늘 (L26)
  const sky = ctx.createLinearGradient(0, 0, 0, WORLD_H);
  sky.addColorStop(0, '#6fc3ef');
  sky.addColorStop(1, '#d9f2fd');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  // 지면 띠 (L26)
  ctx.fillStyle = '#8a5a33';
  ctx.fillRect(0, GROUND_Y, WORLD_W, WORLD_H - GROUND_Y);
  ctx.fillStyle = '#6abf4b';
  ctx.fillRect(0, GROUND_Y, WORLD_W, 10);

  if (!session) return;

  drawSlingshot(ctx);

  // 대기 중인 새들 (슬링샷 뒤)
  for (let i = 0; i < session.waiting; i++) {
    drawBird(ctx, 108 - i * 30, GROUND_Y - BIRD_R, BIRD_R, 0);
  }

  // 바디들
  for (const body of session.bodies()) {
    const m = session.getMeta(body.id);
    if (!m || m.kind === 'static') continue;
    if (m.kind === 'block') drawBlock(ctx, body, m);
    else if (m.kind === 'pig') drawPig(ctx, body.position.x, body.position.y, m.r ?? 16);
    else drawBird(ctx, body.position.x, body.position.y, m.r ?? BIRD_R, body.angle);
  }

  drawBand(ctx, session);
  drawTrajectory(ctx, session);
  drawParticles(ctx);
}

function drawSlingshot(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = '#7a4a21';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ANCHOR.x, GROUND_Y);
  ctx.lineTo(ANCHOR.x, ANCHOR.y + 50);
  ctx.moveTo(ANCHOR.x, ANCHOR.y + 50);
  ctx.lineTo(FORK_L.x, FORK_L.y);
  ctx.moveTo(ANCHOR.x, ANCHOR.y + 50);
  ctx.lineTo(FORK_R.x, FORK_R.y);
  ctx.stroke();
}

/** 고무줄 — 장착된 새가 있을 때만 (조준 중이면 당겨진 위치로) */
function drawBand(ctx: CanvasRenderingContext2D, session: Session): void {
  const p = session.loadedBirdPos;
  if (!p) return;
  ctx.strokeStyle = '#5a2d12';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(FORK_L.x, FORK_L.y);
  ctx.lineTo(p.x, p.y);
  ctx.moveTo(FORK_R.x, FORK_R.y);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
}

/** 궤적 예측 (L7) — 발사 공식과 같은 등가속 시뮬레이션, 점 10개 내외 */
function drawTrajectory(ctx: CanvasRenderingContext2D, session: Session): void {
  const v = session.launchVelocity();
  const p0 = session.loadedBirdPos;
  if (!v || !p0) return;
  let x = p0.x;
  let y = p0.y;
  let vx = v.x;
  let vy = v.y;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  for (let i = 1; i <= 66; i++) {
    vy += GRAVITY_PER_STEP;
    x += vx;
    y += vy;
    if (y > GROUND_Y) break;
    if (i % 6 === 0) {
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBlock(ctx: CanvasRenderingContext2D, body: Matter.Body, m: BodyMeta): void {
  const mat = m.material ?? 'wood';
  const verts = body.vertices;
  ctx.beginPath();
  ctx.moveTo(verts[0].x, verts[0].y);
  for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
  ctx.closePath();
  ctx.fillStyle = MATERIAL_COLORS[mat];
  ctx.fill();
  ctx.strokeStyle = MATERIAL_STROKES[mat];
  ctx.lineWidth = 2;
  ctx.stroke();
  // 손상 표시: 내구도가 깎였으면 X자 균열
  if (m.hp !== undefined && m.hp0 !== undefined && m.hp < m.hp0 && verts.length >= 4) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#3a2a18';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(verts[0].x, verts[0].y);
    ctx.lineTo(verts[2].x, verts[2].y);
    ctx.moveTo(verts[1].x, verts[1].y);
    ctx.lineTo(verts[3].x, verts[3].y);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPig(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#7ac74f';
  ctx.fill();
  ctx.strokeStyle = '#4e8c33';
  ctx.lineWidth = 2;
  ctx.stroke();
  // 눈
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.3, r * 0.22, 0, Math.PI * 2);
  ctx.arc(x + r * 0.35, y - r * 0.3, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#222222';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.3, r * 0.09, 0, Math.PI * 2);
  ctx.arc(x + r * 0.35, y - r * 0.3, r * 0.09, 0, Math.PI * 2);
  ctx.fill();
  // 코
  ctx.fillStyle = '#5fae3c';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.15, r * 0.42, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3f7a26';
  ctx.beginPath();
  ctx.arc(x - r * 0.15, y + r * 0.15, r * 0.07, 0, Math.PI * 2);
  ctx.arc(x + r * 0.15, y + r * 0.15, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
}

function drawBird(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  angle: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // 몸통
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#d64541';
  ctx.fill();
  ctx.strokeStyle = '#8f231a';
  ctx.lineWidth = 2;
  ctx.stroke();
  // 부리
  ctx.fillStyle = '#f5a623';
  ctx.beginPath();
  ctx.moveTo(r * 0.55, -r * 0.18);
  ctx.lineTo(r * 1.3, 0);
  ctx.lineTo(r * 0.55, r * 0.25);
  ctx.closePath();
  ctx.fill();
  // 눈
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(r * 0.3, -r * 0.3, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#222222';
  ctx.beginPath();
  ctx.arc(r * 0.38, -r * 0.3, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
