// 공용 캔버스 위젯 — 버튼·패널·별. 오버레이와 HUD가 같은 히트 테스트를 쓴다.

export type Tone = 'primary' | 'ghost' | 'danger';

export interface UIButton {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  tone?: Tone;
  disabled?: boolean;
}

const TONE_FILL: Record<Tone, string> = {
  primary: 'rgb(232, 168, 44)',
  ghost: 'rgb(58, 70, 88)',
  danger: 'rgb(198, 76, 62)',
};

const TONE_TEXT: Record<Tone, string> = {
  primary: 'rgb(38, 26, 8)',
  ghost: 'rgb(236, 240, 246)',
  danger: 'rgb(255, 244, 240)',
};

export function hitButton(b: UIButton, x: number, y: number): boolean {
  if (b.disabled) return false;
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}

export function pickButton(list: readonly UIButton[], x: number, y: number): UIButton | null {
  for (const b of list) if (hitButton(b, x, y)) return b;
  return null;
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function drawButton(ctx: CanvasRenderingContext2D, b: UIButton, hovered = false): void {
  const tone = b.tone ?? 'primary';
  ctx.save();
  ctx.globalAlpha = b.disabled ? 0.4 : 1;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  roundRect(ctx, b.x + 4, b.y + 6, b.w, b.h, 16);
  ctx.fill();

  ctx.fillStyle = TONE_FILL[tone];
  roundRect(ctx, b.x, b.y, b.w, b.h, 16);
  ctx.fill();

  if (hovered && !b.disabled) {
    ctx.strokeStyle = 'rgb(255, 255, 255)';
    ctx.lineWidth = 3;
    roundRect(ctx, b.x + 2, b.y + 2, b.w - 4, b.h - 4, 14);
    ctx.stroke();
  }

  ctx.fillStyle = TONE_TEXT[tone];
  ctx.font = 'bold 34px "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 2);
  ctx.restore();
}

export function drawPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(16, 22, 34, 0.94)';
  roundRect(ctx, x, y, w, h, 28);
  ctx.fill();
  ctx.strokeStyle = 'rgba(232, 168, 44, 0.85)';
  ctx.lineWidth = 4;
  roundRect(ctx, x, y, w, h, 28);
  ctx.stroke();

  ctx.fillStyle = 'rgb(245, 240, 230)';
  ctx.font = 'bold 54px "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, x + w / 2, y + 62);
  ctx.restore();
}

export function dimScreen(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = 'rgba(6, 10, 18, 0.62)';
  ctx.fillRect(0, 0, w, h);
}

export function drawStars(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  earned: number,
  size = 46,
): void {
  const gap = size * 2.4;
  for (let i = 0; i < 3; i++) {
    const x = cx + (i - 1) * gap;
    const filled = i < earned;
    drawStar(ctx, x, cy, size, filled);
  }
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  filled: boolean,
): void {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? 'rgb(255, 208, 66)' : 'rgba(120, 128, 142, 0.5)';
  ctx.fill();
  ctx.strokeStyle = filled ? 'rgb(180, 128, 20)' : 'rgba(70, 78, 92, 0.8)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

export function text(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  font: string,
  color: string,
  align: CanvasTextAlign = 'left',
): void {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
  ctx.restore();
}
