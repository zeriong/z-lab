/**
 * 파괴 파편 파티클 (§8.4, §10.4). 재질 색 사각 파편 8~12개, 0.6초 수명, 중력 적용.
 * 상한 200개, 초과 시 오래된 것부터 제거.
 */
import { GRAVITY_PER_TICK, MAX_PARTICLES } from '../core/config';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

const LIFE_TICKS = 36; // 0.6초

export class Particles {
  list: Particle[] = [];

  spawn(x: number, y: number, color: string, count = 10, spread = 6): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1 + Math.random() * spread;
      this.list.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 2,
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 0.4,
        size: 4 + Math.random() * 6,
        life: LIFE_TICKS,
        maxLife: LIFE_TICKS,
        color,
      });
    }
    if (this.list.length > MAX_PARTICLES) {
      this.list.splice(0, this.list.length - MAX_PARTICLES);
    }
  }

  /** 틱마다 호출 */
  update(): void {
    let w = 0;
    for (let i = 0; i < this.list.length; i++) {
      const p = this.list[i];
      p.vy += GRAVITY_PER_TICK;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      p.life -= 1;
      if (p.life > 0) this.list[w++] = p;
    }
    this.list.length = w;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.list) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }
  }

  clear(): void {
    this.list.length = 0;
  }
}
