// 새·새총·고무줄·궤적·안내 손가락 그리기
import { ANCHOR, BIRDS, GROUND_Y, SLING_FORK_BACK, SLING_FORK_FRONT } from '../../config';
import type { BirdType, Vec2 } from '../../types';

export function drawBird(ctx: CanvasRenderingContext2D, type: BirdType, x: number, y: number, angle = 0, radius?: number): void {
  const spec = BIRDS[type];
  const r = radius ?? spec.radius;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.fillStyle = spec.color;
  if (type === 'yellow') {
    ctx.beginPath();
    ctx.moveTo(r * 1.15, 0);
    ctx.lineTo(-r * 0.8, -r * 0.95);
    ctx.lineTo(-r * 0.8, r * 0.95);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  if (type === 'black') {
    // 도화선
    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r * 0.3, -r * 1.35, r * 0.1, -r * 1.5);
    ctx.stroke();
    ctx.fillStyle = '#ffab00';
    ctx.beginPath();
    ctx.arc(r * 0.1, -r * 1.5, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // 배
  if (type === 'red' || type === 'blue') {
    ctx.fillStyle = 'rgba(255,235,220,0.9)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.45, r * 0.6, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 눈과 눈썹
  const ex = type === 'yellow' ? r * 0.05 : r * 0.28;
  for (const sy of [-1, 1]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ex + r * 0.12, sy * r * 0.22 - r * 0.1, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(ex + r * 0.2, sy * r * 0.22 - r * 0.1, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#111';
  ctx.lineWidth = Math.max(2, r * 0.12);
  ctx.beginPath();
  ctx.moveTo(ex - r * 0.1, -r * 0.62);
  ctx.lineTo(ex + r * 0.45, -r * 0.38);
  ctx.stroke();
  // 부리
  ctx.fillStyle = '#ffa000';
  ctx.beginPath();
  ctx.moveTo(ex + r * 0.4, r * 0.05);
  ctx.lineTo(ex + r * 0.85, r * 0.18);
  ctx.lineTo(ex + r * 0.4, r * 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** 새총 뒤 기둥 (새보다 먼저 그림) */
export function drawSlingBack(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = '#5d3a1a';
  ctx.lineCap = 'round';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(ANCHOR.x, GROUND_Y);
  ctx.lineTo(ANCHOR.x, ANCHOR.y + 60);
  ctx.lineTo(SLING_FORK_BACK.x, SLING_FORK_BACK.y);
  ctx.stroke();
}

/** 새총 앞 기둥 (새 다음에 그림) */
export function drawSlingFront(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = '#6d4520';
  ctx.lineCap = 'round';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(ANCHOR.x, ANCHOR.y + 60);
  ctx.lineTo(SLING_FORK_FRONT.x, SLING_FORK_FRONT.y);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

/** 고무줄: 양쪽 기둥에서 새까지 두 줄 (R5) */
export function drawBand(ctx: CanvasRenderingContext2D, from: Vec2, to: Vec2): void {
  ctx.strokeStyle = '#3e2410';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

export function drawDots(ctx: CanvasRenderingContext2D, pts: readonly Vec2[], color: string, radius: number): void {
  ctx.fillStyle = color;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius * (1 - (i / Math.max(1, pts.length)) * 0.4), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 스테이지 1 안내 손가락 (R25): 새를 뒤로 끄는 동작 반복 (물리 스텝 기준) */
export function drawHintFinger(ctx: CanvasRenderingContext2D, step: number, text: string): void {
  const period = 120;
  const t = (step % period) / period;
  const k = t < 0.15 ? 0 : t < 0.7 ? (t - 0.15) / 0.55 : 1;
  const ease = k * k * (3 - 2 * k);
  const x = ANCHOR.x - ease * 90;
  const y = ANCHOR.y + ease * 50;
  const alpha = t > 0.85 ? (1 - t) / 0.15 : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  // 점선 화살표
  ctx.setLineDash([6, 8]);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ANCHOR.x, ANCHOR.y);
  ctx.lineTo(ANCHOR.x - 90, ANCHOR.y + 50);
  ctx.stroke();
  ctx.setLineDash([]);
  // 손가락 (둥근 손 + 검지)
  ctx.translate(x + 6, y + 10);
  ctx.fillStyle = '#ffe0c2';
  ctx.strokeStyle = '#8d5b3a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(-9, -34, 18, 40, 9);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-20, 0, 42, 34, 12);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 5;
  ctx.textAlign = 'center';
  ctx.strokeText(text, ANCHOR.x + 40, ANCHOR.y - 110);
  ctx.fillText(text, ANCHOR.x + 40, ANCHOR.y - 110);
  ctx.restore();
}
