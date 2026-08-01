import { PERF } from '../data/materials';
import type { Rng } from '../core/Rng';

/**
 * 파편/먼지 (플랜 §5, R4).
 * 파편은 물리 바디가 아니다 — 바디 수 폭발을 막기 위해 순수 시각 파티클로만 처리한다.
 * 상한 120개, 수명 1.2초.
 */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  spin: number;
  angle: number;
}

export class ParticleSystem {
  private items: Particle[] = [];

  constructor(private readonly rng: Rng) {}

  get count(): number {
    return this.items.length;
  }

  clear(): void {
    this.items.length = 0;
  }

  burst(x: number, y: number, color: string, count = 8, speed = 3, size = 6): void {
    for (let i = 0; i < count; i++) {
      if (this.items.length >= PERF.maxParticles) {
        // 상한을 넘으면 가장 오래된 것을 밀어낸다.
        this.items.shift();
      }
      const a = this.rng.range(0, Math.PI * 2);
      const s = this.rng.range(speed * 0.3, speed);
      const life = PERF.debrisLifeMs * this.rng.range(0.6, 1);
      this.items.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - speed * 0.4,
        life,
        maxLife: life,
        size: size * this.rng.range(0.6, 1.3),
        color,
        spin: this.rng.range(-0.2, 0.2),
        angle: this.rng.range(0, Math.PI),
      });
    }
  }

  dust(x: number, y: number): void {
    this.burst(x, y, 'rgba(226, 216, 196, 0.9)', 4, 1.6, 5);
  }

  /** stepMs 단위 업데이트. 중력은 시각용 근사값. */
  update(stepMs: number): void {
    const g = 0.25;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.life -= stepMs;
      if (p.life <= 0) {
        this.items.splice(i, 1);
        continue;
      }
      p.vy += g;
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.spin;
      p.vx *= 0.99;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.items) {
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}
