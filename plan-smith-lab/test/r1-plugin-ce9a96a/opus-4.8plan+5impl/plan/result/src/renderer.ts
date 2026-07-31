import Matter from 'matter-js';
import { BIRD_RADIUS, GROUND_Y, LOGICAL_H, LOGICAL_W, MATERIALS, MAX_PULL } from './constants';
import { getGameData } from './physics';
import type { StageDef } from './types';

interface Theme {
  skyTop: string;
  skyBottom: string;
  hillFar: string;
  hillNear: string;
  stars: boolean;
}

const THEMES: Record<StageDef['background'], Theme> = {
  day: { skyTop: '#8ed6ff', skyBottom: '#dff2ff', hillFar: '#8fc98a', hillNear: '#5fa860', stars: false },
  dusk: { skyTop: '#3d3565', skyBottom: '#f0a06a', hillFar: '#6a5a7a', hillNear: '#3f3550', stars: false },
  night: { skyTop: '#0c1230', skyBottom: '#26356b', hillFar: '#1b2447', hillNear: '#111830', stars: true },
};

const GROUND_COLORS: Record<StageDef['ground'], { top: string; body: string }> = {
  grass: { top: '#63b258', body: '#7a5230' },
  sand: { top: '#d9bd7a', body: '#9c7c46' },
  snow: { top: '#eaf2f8', body: '#7d8894' },
};

const CLOUDS = [
  { x: 210, y: 120, s: 1.1 },
  { x: 620, y: 80, s: 0.8 },
  { x: 980, y: 150, s: 1.25 },
];

const STARS = Array.from({ length: 60 }, (_, i) => ({
  x: ((i * 137) % LOGICAL_W) + ((i * 41) % 13),
  y: ((i * 89) % 420) + 12,
  r: (i % 3) * 0.5 + 0.6,
}));

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  private scale = 1;

  constructor(readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D 컨텍스트를 만들 수 없습니다.');
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.scale = Math.min(w / LOGICAL_W, h / LOGICAL_H) * dpr;
  }

  /** 논리 좌표계로 변환하고 레터박스를 칠한다. */
  begin(): void {
    const { ctx, canvas } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0d1017';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const offsetX = (canvas.width - LOGICAL_W * this.scale) / 2;
    const offsetY = (canvas.height - LOGICAL_H * this.scale) / 2;
    ctx.setTransform(this.scale, 0, 0, this.scale, offsetX, offsetY);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, LOGICAL_W, LOGICAL_H);
    ctx.clip();
  }

  end(): void {
    this.ctx.restore();
  }

  drawBackground(stage: StageDef | null): void {
    const theme = THEMES[stage?.background ?? 'day'];
    const { ctx } = this;
    const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    grad.addColorStop(0, theme.skyTop);
    grad.addColorStop(1, theme.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, LOGICAL_W, GROUND_Y + 2);

    if (theme.stars) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (const s of STARS) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (const c of CLOUDS) this.cloud(c.x, c.y, c.s);
    }

    // 언덕
    ctx.fillStyle = theme.hillFar;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.quadraticCurveTo(260, GROUND_Y - 170, 540, GROUND_Y);
    ctx.quadraticCurveTo(820, GROUND_Y - 210, 1280, GROUND_Y);
    ctx.lineTo(LOGICAL_W, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = theme.hillNear;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.quadraticCurveTo(400, GROUND_Y - 90, 900, GROUND_Y);
    ctx.lineTo(LOGICAL_W, GROUND_Y);
    ctx.closePath();
    ctx.fill();
  }

  private cloud(x: number, y: number, s: number): void {
    const { ctx } = this;
    ctx.beginPath();
    ctx.arc(x, y, 26 * s, 0, Math.PI * 2);
    ctx.arc(x + 30 * s, y + 8 * s, 20 * s, 0, Math.PI * 2);
    ctx.arc(x - 30 * s, y + 10 * s, 18 * s, 0, Math.PI * 2);
    ctx.arc(x + 4 * s, y - 16 * s, 18 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  drawGround(stage: StageDef | null): void {
    const { ctx } = this;
    const c = GROUND_COLORS[stage?.ground ?? 'grass'];
    ctx.fillStyle = c.body;
    ctx.fillRect(0, GROUND_Y + 12, LOGICAL_W, LOGICAL_H - GROUND_Y);
    ctx.fillStyle = c.top;
    ctx.fillRect(0, GROUND_Y, LOGICAL_W, 14);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let x = 0; x < LOGICAL_W; x += 46) ctx.fillRect(x, GROUND_Y + 14, 22, 5);
  }

  drawSlingshot(anchor: Matter.Vector, birdPos: Matter.Vector | null, pulling: boolean): void {
    const { ctx } = this;
    const baseY = GROUND_Y + 2;
    const forkTop = anchor.y;

    // 뒤쪽 고무줄
    if (birdPos) {
      ctx.strokeStyle = '#3b2412';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(anchor.x - 16, forkTop - 6);
      ctx.lineTo(birdPos.x, birdPos.y);
      ctx.stroke();
    }

    // 기둥
    ctx.strokeStyle = '#7a4a22';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(anchor.x, baseY);
    ctx.lineTo(anchor.x, forkTop + 26);
    ctx.stroke();
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(anchor.x, forkTop + 28);
    ctx.lineTo(anchor.x - 18, forkTop - 8);
    ctx.moveTo(anchor.x, forkTop + 28);
    ctx.lineTo(anchor.x + 18, forkTop - 10);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // 앞쪽 고무줄
    if (birdPos) {
      ctx.strokeStyle = '#4d2f16';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(birdPos.x, birdPos.y);
      ctx.lineTo(anchor.x + 18, forkTop - 10);
      ctx.stroke();
    }

    if (pulling) {
      const power = Math.min(1, Matter.Vector.magnitude(Matter.Vector.sub(birdPos ?? anchor, anchor)) / MAX_PULL);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(anchor.x - 46, baseY + 22, 92, 10);
      ctx.fillStyle = power > 0.8 ? '#ff5a3c' : '#ffb43c';
      ctx.fillRect(anchor.x - 44, baseY + 24, 88 * power, 6);
    }
  }

  drawTrajectory(points: Matter.Vector[]): void {
    const { ctx } = this;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const t = 1 - i / (points.length + 1);
      ctx.fillStyle = `rgba(255,255,255,${0.25 + t * 0.5})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.6 - i * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawBodies(bodies: Matter.Body[]): void {
    for (const body of bodies) {
      const data = getGameData(body);
      if (!data) continue;
      switch (data.gameType) {
        case 'block':
          this.drawBlock(body);
          break;
        case 'pig':
          this.drawPig(body);
          break;
        case 'bird':
          this.drawBird(body);
          break;
        default:
          break;
      }
    }
  }

  private drawBlock(body: Matter.Body): void {
    const data = getGameData(body);
    if (!data?.material) return;
    const spec = MATERIALS[data.material];
    const ratio = data.maxHp > 0 ? data.hp / data.maxHp : 1;
    const { ctx } = this;

    ctx.beginPath();
    const v = body.vertices;
    ctx.moveTo(v[0].x, v[0].y);
    for (let i = 1; i < v.length; i++) ctx.lineTo(v[i].x, v[i].y);
    ctx.closePath();
    ctx.fillStyle = ratio < 0.6 ? spec.fillDamaged : spec.fill;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = spec.edge;
    ctx.stroke();

    if (ratio < 0.75) {
      // 균열 표시
      ctx.save();
      ctx.translate(body.position.x, body.position.y);
      ctx.rotate(body.angle);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-8, -10);
      ctx.lineTo(0, 0);
      ctx.lineTo(-5, 9);
      if (ratio < 0.45) {
        ctx.moveTo(7, -9);
        ctx.lineTo(2, 1);
        ctx.lineTo(9, 8);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawPig(body: Matter.Body): void {
    const data = getGameData(body);
    const r = body.circleRadius ?? 18;
    const ratio = data && data.maxHp > 0 ? Math.max(0, data.hp / data.maxHp) : 1;
    const { ctx } = this;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);

    ctx.fillStyle = ratio > 0.6 ? '#7ec850' : ratio > 0.3 ? '#8fae4a' : '#a58c3d';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.stroke();

    // 귀
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.arc(-r * 0.55, -r * 0.75, r * 0.22, 0, Math.PI * 2);
    ctx.arc(r * 0.55, -r * 0.75, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // 코
    ctx.fillStyle = '#5f9c38';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.18, r * 0.4, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.arc(-r * 0.15, r * 0.18, r * 0.07, 0, Math.PI * 2);
    ctx.arc(r * 0.15, r * 0.18, r * 0.07, 0, Math.PI * 2);
    ctx.fill();

    // 눈
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-r * 0.33, -r * 0.22, r * 0.2, 0, Math.PI * 2);
    ctx.arc(r * 0.33, -r * 0.22, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.2, r * 0.09, 0, Math.PI * 2);
    ctx.arc(r * 0.36, -r * 0.2, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawBird(body: Matter.Body): void {
    const r = body.circleRadius ?? BIRD_RADIUS;
    const { ctx } = this;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);

    ctx.fillStyle = '#e8452f';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#f9d6c2';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.42, r * 0.55, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 부리
    ctx.fillStyle = '#f5a623';
    ctx.beginPath();
    ctx.moveTo(r * 0.55, -r * 0.05);
    ctx.lineTo(r * 1.35, r * 0.12);
    ctx.lineTo(r * 0.55, r * 0.38);
    ctx.closePath();
    ctx.fill();

    // 눈
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.35, r * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.arc(r * 0.38, -r * 0.35, r * 0.11, 0, Math.PI * 2);
    ctx.fill();

    // 눈썹
    ctx.strokeStyle = '#7d1f11';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(r * 0.02, -r * 0.75);
    ctx.lineTo(r * 0.62, -r * 0.5);
    ctx.stroke();
    ctx.restore();
  }

  /** 발사된 새의 비행 잔상 */
  drawFlightTrail(points: Matter.Vector[]): void {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      ctx.globalAlpha = (i / points.length) * 0.55;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawPauseVeil(): void {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(6,8,12,0.35)';
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
  }
}
