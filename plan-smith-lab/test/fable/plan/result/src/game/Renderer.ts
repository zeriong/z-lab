import type Matter from 'matter-js';
import {
  BIRD_SPECS,
  GROUND_Y,
  MATERIALS,
  SLING_X,
  SLING_Y,
  VIRTUAL_H,
  VIRTUAL_W,
} from '../core/constants.ts';
import type { Particles } from './Particles.ts';
import type { Slingshot } from './Slingshot.ts';
import type { Stage } from './Stage.ts';

// 물리는 Matter가 계산하고, 매 프레임 body의 position/angle을 읽어 Canvas 2D에 그린다.
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private dpr: number;

  constructor(
    canvas: HTMLCanvasElement,
    private stage: Stage,
    private slingshot: Slingshot,
    private particles: Particles,
  ) {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = VIRTUAL_W * this.dpr;
    canvas.height = VIRTUAL_H * this.dpr;
    this.ctx = canvas.getContext('2d')!;
  }

  draw(): void {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawBackground(ctx);
    this.drawSlingshotBack(ctx);
    this.drawWaitingBirds(ctx);

    for (const block of this.stage.blocks) {
      if (!block.destroyed) this.drawBlock(ctx, block);
    }
    for (const pig of this.stage.pigs) {
      if (!pig.dead) this.drawPig(ctx, pig);
    }

    const aim = this.slingshot.getAimInfo();
    if (aim) this.drawBand(ctx, aim.birdPos, 'back');

    const bird = this.stage.currentBird;
    if (bird) {
      this.drawBird(ctx, bird.body.position.x, bird.body.position.y, bird.body.angle, bird.type);
    }

    if (aim) {
      this.drawBand(ctx, aim.birdPos, 'front');
      this.drawTrajectory(ctx, aim.trajectory);
    }
    this.drawSlingshotFront(ctx);
    this.particles.draw(ctx);
  }

  // --- 배경 -------------------------------------------------------------------
  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#6fc3ef');
    sky.addColorStop(1, '#d8f3ff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);

    // 구름
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    this.cloud(ctx, 180, 110, 1);
    this.cloud(ctx, 620, 70, 0.8);
    this.cloud(ctx, 1050, 140, 1.15);

    // 원경 언덕
    ctx.fillStyle = '#a8d878';
    ctx.beginPath();
    ctx.ellipse(250, GROUND_Y + 40, 420, 120, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#96cc66';
    ctx.beginPath();
    ctx.ellipse(1000, GROUND_Y + 60, 520, 150, 0, Math.PI, 0);
    ctx.fill();

    // 지면
    ctx.fillStyle = '#8a6b3f';
    ctx.fillRect(0, GROUND_Y, VIRTUAL_W, VIRTUAL_H - GROUND_Y);
    ctx.fillStyle = '#6cb536';
    ctx.fillRect(0, GROUND_Y, VIRTUAL_W, 14);

    // 추가 플랫폼
    for (const p of this.stage.def?.ground.platforms ?? []) {
      ctx.fillStyle = '#7d7d84';
      ctx.fillRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h);
      ctx.fillStyle = '#6cb536';
      ctx.fillRect(p.x - p.w / 2, p.y - p.h / 2, p.w, 6);
    }
  }

  private cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
    ctx.beginPath();
    ctx.ellipse(x, y, 55 * s, 24 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 40 * s, y - 12 * s, 40 * s, 20 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 40 * s, y - 6 * s, 34 * s, 17 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- 슬링샷 ------------------------------------------------------------------
  private drawSlingshotBack(ctx: CanvasRenderingContext2D): void {
    // 뒤쪽 갈래(새 뒤에 그려짐)
    ctx.strokeStyle = '#5d3a1e';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(SLING_X, GROUND_Y - 5);
    ctx.lineTo(SLING_X, SLING_Y + 45);
    ctx.stroke();
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(SLING_X, SLING_Y + 45);
    ctx.lineTo(SLING_X + 20, SLING_Y - 12);
    ctx.stroke();
  }

  private drawSlingshotFront(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = '#7a4c27';
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(SLING_X, SLING_Y + 45);
    ctx.lineTo(SLING_X - 20, SLING_Y - 12);
    ctx.stroke();
  }

  private drawBand(ctx: CanvasRenderingContext2D, birdPos: { x: number; y: number }, side: 'back' | 'front'): void {
    ctx.strokeStyle = '#3a2317';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (side === 'back') {
      ctx.moveTo(SLING_X + 20, SLING_Y - 12);
    } else {
      ctx.moveTo(SLING_X - 20, SLING_Y - 12);
    }
    ctx.lineTo(birdPos.x, birdPos.y);
    ctx.stroke();
  }

  private drawTrajectory(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]): void {
    for (let i = 0; i < pts.length; i++) {
      const r = 5 - (i / pts.length) * 2.5;
      ctx.globalAlpha = 0.75 - (i / pts.length) * 0.45;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // --- 엔티티 ------------------------------------------------------------------
  private drawWaitingBirds(ctx: CanvasRenderingContext2D): void {
    this.stage.queue.forEach((type, i) => {
      const r = BIRD_SPECS[type].radius;
      this.drawBird(ctx, 140 - i * 50, GROUND_Y - r, 0, type);
    });
  }

  private drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, type: keyof typeof BIRD_SPECS): void {
    const spec = BIRD_SPECS[type];
    const r = spec.radius;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    // 몸통
    ctx.fillStyle = spec.color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // 배
    ctx.fillStyle = '#f6e3c3';
    ctx.beginPath();
    ctx.arc(0, r * 0.45, r * 0.55, 0, Math.PI);
    ctx.fill();
    // 눈
    const er = r * 0.22;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.28, er, 0, Math.PI * 2);
    ctx.arc(r * 0.72, -r * 0.28, er, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(r * 0.38, -r * 0.28, er * 0.45, 0, Math.PI * 2);
    ctx.arc(r * 0.8, -r * 0.28, er * 0.45, 0, Math.PI * 2);
    ctx.fill();
    // 부리
    ctx.fillStyle = '#f2a71b';
    ctx.beginPath();
    ctx.moveTo(r * 0.85, -r * 0.05);
    ctx.lineTo(r * 1.35, r * 0.12);
    ctx.lineTo(r * 0.8, r * 0.3);
    ctx.closePath();
    ctx.fill();
    // 눈썹
    ctx.strokeStyle = '#3d1a0e';
    ctx.lineWidth = r * 0.14;
    ctx.beginPath();
    ctx.moveTo(r * 0.08, -r * 0.5);
    ctx.lineTo(r * 0.95, -r * 0.42);
    ctx.stroke();
    ctx.restore();
  }

  private drawPig(ctx: CanvasRenderingContext2D, pig: { body: Matter.Body; radius: number; hp: number; maxHp: number }): void {
    const { x, y } = pig.body.position;
    const r = pig.radius;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(pig.body.angle);
    const hurt = pig.hp < pig.maxHp;
    // 귀
    ctx.fillStyle = hurt ? '#58a13c' : '#6fbf49';
    ctx.beginPath();
    ctx.arc(-r * 0.5, -r * 0.85, r * 0.28, 0, Math.PI * 2);
    ctx.arc(r * 0.5, -r * 0.85, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    // 얼굴
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // 눈
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-r * 0.42, -r * 0.3, r * 0.2, 0, Math.PI * 2);
    ctx.arc(r * 0.42, -r * 0.3, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-r * 0.42, -r * 0.3, r * 0.09, 0, Math.PI * 2);
    ctx.arc(r * 0.42, -r * 0.3, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
    // 코
    ctx.fillStyle = hurt ? '#4c8c34' : '#5fae3b';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.15, r * 0.45, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3f7328';
    ctx.beginPath();
    ctx.arc(-r * 0.16, r * 0.15, r * 0.08, 0, Math.PI * 2);
    ctx.arc(r * 0.16, r * 0.15, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawBlock(
    ctx: CanvasRenderingContext2D,
    block: { body: Matter.Body; w: number; h: number; material: keyof typeof MATERIALS; hp: number; maxHp: number },
  ): void {
    const spec = MATERIALS[block.material];
    const { x, y } = block.body.position;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(block.body.angle);
    const w = block.w;
    const h = block.h;
    ctx.fillStyle = spec.fill;
    if (block.material === 'ice') ctx.globalAlpha = 0.88;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = spec.stroke;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-w / 2, -h / 2, w, h);

    // 재질 텍스처
    if (block.material === 'wood') {
      ctx.strokeStyle = 'rgba(120,75,30,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (w >= h) {
        ctx.moveTo(-w / 2 + 6, 0);
        ctx.lineTo(w / 2 - 6, 0);
      } else {
        ctx.moveTo(0, -h / 2 + 6);
        ctx.lineTo(0, h / 2 - 6);
      }
      ctx.stroke();
    } else if (block.material === 'ice') {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 4, -h / 2 + 8);
      ctx.lineTo(-w / 2 + Math.min(w, 22), -h / 2 + 4);
      ctx.stroke();
    }

    // 손상도에 따른 균열
    const frac = block.hp / block.maxHp;
    if (frac < 0.66) {
      ctx.strokeStyle = 'rgba(40,25,10,0.55)';
      ctx.lineWidth = 1.5;
      this.crack(ctx, -w * 0.25, -h * 0.3, w * 0.2, h * 0.5);
      if (frac < 0.33) this.crack(ctx, w * 0.1, h * 0.25, -w * 0.15, -h * 0.45);
    }
    ctx.restore();
  }

  private crack(ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number): void {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx * 0.4, y + dy * 0.35);
    ctx.lineTo(x + dx * 0.25, y + dy * 0.6);
    ctx.lineTo(x + dx, y + dy);
    ctx.stroke();
  }
}
