import type { CanvasRenderer } from './canvas';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export class EffectsManager {
  private particles: Particle[] = [];

  createExplosion(x: number, y: number, color: string = '#FF8C00'): void {
    const count = 8; // 파편 개수
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 2 + Math.random();
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6,
        maxLife: 0.6,
        color,
        size: 4 + Math.random() * 2
      });
    }
  }

  update(dt: number): void {
    const toRemove: number[] = [];
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life -= dt / 1000;
      p.x += p.vx * dt / 1000;
      p.y += p.vy * dt / 1000;
      p.vy += 0.3 * dt / 1000; // gravity

      if (p.life <= 0) {
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.particles.splice(toRemove[i], 1);
    }
  }

  render(canvas: CanvasRenderer): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      const ctx = canvas.getContext();
      ctx.globalAlpha = alpha;
      canvas.drawCircle(p.x, p.y, p.size, p.color);
      ctx.globalAlpha = 1;
    }
  }

  clear(): void {
    this.particles = [];
  }
}
