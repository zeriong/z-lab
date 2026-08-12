export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export class EffectManager {
  private particles: Particle[] = [];

  createDebris(
    x: number,
    y: number,
    count: number,
    speed: number,
    color: string,
    size: number = 4
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const v = speed * (0.5 + Math.random() * 0.5);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: 0.6,
        maxLife: 0.6,
        size,
        color,
      });
    }
  }

  createDust(x: number, y: number, count: number = 8): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const v = 20 + Math.random() * 30;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - 20,
        life: 0.6,
        maxLife: 0.6,
        size: 2 + Math.random() * 2,
        color: 'rgba(200, 200, 200, 0.8)',
      });
    }
  }

  update(dt: number): void {
    const gravity = 500; // pixels/s²

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += gravity * dt;
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      const oldGlobalAlpha = ctx.globalAlpha;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = oldGlobalAlpha;
    }
  }

  clear(): void {
    this.particles = [];
  }
}
