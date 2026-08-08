// 월드 렌더러 — Canvas 2D 직접 draw 루프.
//
// 원작 에셋을 쓸 수 없으므로(가정 A4) 전부 도형으로 그린다. 스프라이트로 갈아끼울 때
// 손댈 곳이 한 곳이 되도록 "바디 종류 → 그리기 함수" 매핑을 이 파일 한 곳에 모은다.

import { GROUND_Y, MAX_DRAG_PX, VIRTUAL_H, VIRTUAL_W, clampDrag } from '../physics/units';
import type { PhysicsBody } from '../physics/PhysicsAdapter';
import { predictTrajectory } from '../game/trajectory';
import { birdRestPosition } from '../game/world';
import type { World } from '../game/world';

export interface AimView {
  active: boolean;
  dragX: number;
  dragY: number;
}

const MATERIAL_FILL: Record<string, string> = {
  wood: 'rgb(168, 112, 58)',
  ice: 'rgba(176, 226, 246, 0.88)',
  stone: 'rgb(138, 141, 149)',
  barrel: 'rgb(208, 126, 42)',
};

const MATERIAL_STROKE: Record<string, string> = {
  wood: 'rgb(104, 66, 30)',
  ice: 'rgba(120, 186, 214, 0.95)',
  stone: 'rgb(92, 95, 102)',
  barrel: 'rgb(126, 70, 18)',
};

export function drawWorld(ctx: CanvasRenderingContext2D, world: World, aim: AimView): void {
  drawSky(ctx);
  drawParallax(ctx, world.camera.x);

  const shake = world.effects.shakeOffset();
  ctx.save();
  ctx.translate(-world.camera.x + shake.x, shake.y);

  drawGround(ctx, world);
  drawSlingBack(ctx, world);

  for (const body of world.adapter.bodies()) {
    if (!body.alive || body.kind === 'ground') continue;
    drawBody(ctx, body);
  }

  drawSlingFront(ctx, world);
  if (aim.active) drawAim(ctx, world, aim);
  world.effects.draw(ctx);

  ctx.restore();
}

/** 바디 종류 → 그리기 함수 매핑(교체 지점은 여기 하나). */
function drawBody(ctx: CanvasRenderingContext2D, body: PhysicsBody): void {
  switch (body.kind) {
    case 'block':
      drawBlock(ctx, body);
      return;
    case 'pig':
      drawPig(ctx, body);
      return;
    case 'bird':
      drawBird(ctx, body);
      return;
    default:
      return;
  }
}

function drawSky(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, VIRTUAL_H);
  g.addColorStop(0, 'rgb(96, 168, 226)');
  g.addColorStop(0.62, 'rgb(168, 214, 240)');
  g.addColorStop(1, 'rgb(226, 238, 226)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
}

function drawParallax(ctx: CanvasRenderingContext2D, cameraX: number): void {
  ctx.save();
  ctx.translate(-cameraX * 0.3, 0);
  ctx.fillStyle = 'rgba(120, 176, 140, 0.55)';
  for (let i = -1; i < 6; i++) {
    const x = i * 620 + 120;
    ctx.beginPath();
    ctx.moveTo(x - 320, GROUND_Y);
    ctx.quadraticCurveTo(x, GROUND_Y - 300, x + 320, GROUND_Y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(-cameraX * 0.55, 0);
  ctx.fillStyle = 'rgba(86, 146, 108, 0.7)';
  for (let i = -1; i < 8; i++) {
    const x = i * 420 + 260;
    ctx.beginPath();
    ctx.moveTo(x - 220, GROUND_Y);
    ctx.quadraticCurveTo(x, GROUND_Y - 180, x + 220, GROUND_Y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawGround(ctx: CanvasRenderingContext2D, world: World): void {
  for (const g of world.def.ground) {
    ctx.fillStyle = 'rgb(104, 152, 76)';
    ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.fillStyle = 'rgb(126, 92, 56)';
    ctx.fillRect(g.x, g.y + 26, g.w, Math.max(0, g.h - 26));
    ctx.strokeStyle = 'rgba(60, 44, 26, 0.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(g.x, g.y, g.w, g.h);
  }
}

function drawBlock(ctx: CanvasRenderingContext2D, b: PhysicsBody): void {
  const mat = b.material ?? 'wood';
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle);

  ctx.fillStyle = MATERIAL_FILL[mat] ?? 'rgb(180, 180, 180)';
  ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
  ctx.strokeStyle = MATERIAL_STROKE[mat] ?? 'rgb(90, 90, 90)';
  ctx.lineWidth = 3;
  ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);

  if (mat === 'barrel') {
    ctx.fillStyle = 'rgb(60, 40, 16)';
    ctx.fillRect(-b.w / 2, -6, b.w, 12);
    ctx.fillStyle = 'rgb(255, 216, 120)';
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(b.w, b.h) * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  // 손상 표시 — hp 가 깎일수록 균열이 늘어난다.
  if (b.maxHp > 0 && b.hp < b.maxHp) {
    const dmg = 1 - Math.max(0, b.hp) / b.maxHp;
    ctx.strokeStyle = `rgba(30, 20, 12, ${0.25 + dmg * 0.55})`;
    ctx.lineWidth = 2;
    const cracks = 1 + Math.floor(dmg * 3);
    for (let i = 0; i < cracks; i++) {
      const t = (i + 1) / (cracks + 1);
      ctx.beginPath();
      ctx.moveTo(-b.w / 2 + b.w * t, -b.h / 2);
      ctx.lineTo(-b.w / 2 + b.w * t + (i % 2 === 0 ? 8 : -8), b.h / 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawPig(ctx: CanvasRenderingContext2D, p: PhysicsBody): void {
  const r = p.r;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);

  const hurt = p.maxHp > 0 ? 1 - Math.max(0, p.hp) / p.maxHp : 0;
  ctx.fillStyle = hurt > 0.5 ? 'rgb(150, 190, 110)' : 'rgb(126, 200, 96)';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgb(74, 132, 58)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = 'rgb(255, 255, 255)';
  ctx.beginPath();
  ctx.arc(-r * 0.34, -r * 0.26, r * 0.22, 0, Math.PI * 2);
  ctx.arc(r * 0.34, -r * 0.26, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgb(24, 24, 24)';
  ctx.beginPath();
  ctx.arc(-r * 0.3, -r * 0.26, r * 0.1, 0, Math.PI * 2);
  ctx.arc(r * 0.38, -r * 0.26, r * 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgb(104, 176, 78)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.24, r * 0.34, r * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgb(66, 122, 50)';
  ctx.beginPath();
  ctx.arc(-r * 0.13, r * 0.24, r * 0.07, 0, Math.PI * 2);
  ctx.arc(r * 0.13, r * 0.24, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBird(ctx: CanvasRenderingContext2D, b: PhysicsBody): void {
  const r = b.r;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle);

  ctx.fillStyle = 'rgb(214, 62, 54)';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgb(126, 28, 24)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = 'rgb(255, 255, 255)';
  ctx.beginPath();
  ctx.arc(r * 0.28, -r * 0.28, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgb(24, 24, 24)';
  ctx.beginPath();
  ctx.arc(r * 0.36, -r * 0.28, r * 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgb(248, 176, 40)';
  ctx.beginPath();
  ctx.moveTo(r * 0.6, 0);
  ctx.lineTo(r * 1.32, r * 0.16);
  ctx.lineTo(r * 0.6, r * 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawSlingBack(ctx: CanvasRenderingContext2D, world: World): void {
  const s = world.def.sling;
  ctx.save();
  ctx.fillStyle = 'rgb(102, 68, 38)';
  ctx.fillRect(s.x - 26, s.y - 10, 16, GROUND_Y - s.y + 12);
  ctx.fillRect(s.x + 10, s.y - 10, 16, GROUND_Y - s.y + 12);
  ctx.fillRect(s.x - 26, s.y + 40, 52, 18);
  ctx.restore();
}

function drawSlingFront(ctx: CanvasRenderingContext2D, world: World): void {
  const bird = world.birdOnSling;
  if (!bird) return;
  const s = world.def.sling;
  ctx.save();
  ctx.strokeStyle = 'rgb(58, 38, 22)';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(s.x - 18, s.y - 6);
  ctx.lineTo(bird.x, bird.y);
  ctx.lineTo(s.x + 18, s.y - 6);
  ctx.stroke();
  ctx.restore();
}

function drawAim(ctx: CanvasRenderingContext2D, world: World, aim: AimView): void {
  const rest = birdRestPosition(world.def);
  const c = clampDrag(aim.dragX, aim.dragY);
  const originX = rest.x + c.x;
  const originY = rest.y + c.y;

  // 당김 상한 표시
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.setLineDash([8, 10]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(rest.x, rest.y, MAX_DRAG_PX, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  const pts = predictTrajectory(originX, originY, c.x, c.y, world.gravity);
  ctx.save();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const k = 1 - i / (pts.length + 2);
    ctx.globalAlpha = 0.25 + 0.6 * k;
    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5.5 * k + 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 당긴 거리·각도 수치
  const power = Math.round((c.len / MAX_DRAG_PX) * 100);
  const angle = Math.round((Math.atan2(-c.y, -c.x) * 180) / Math.PI);
  ctx.save();
  ctx.font = 'bold 26px "Apple SD Gothic Neo", sans-serif';
  ctx.fillStyle = 'rgb(255, 255, 255)';
  ctx.textAlign = 'center';
  ctx.fillText(`힘 ${power}%  각 ${angle}°`, rest.x, rest.y - MAX_DRAG_PX - 26);
  ctx.restore();
}
