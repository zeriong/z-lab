import type { Particle } from './types';

/** 파편/먼지 파티클 — 외부 애셋 없이 Canvas 2D로만 그린다. */
export class Effects {
  private particles: Particle[] = [];
  private floaters: { x: number; y: number; text: string; life: number }[] = [];

  burst(x: number, y: number, color: string, count = 14, spread = 6): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = Math.random() * spread;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 2,
        life: 1,
        maxLife: 0.5 + Math.random() * 0.5,
        size: 2 + Math.random() * 4,
        color,
      });
    }
    if (this.particles.length > 600) this.particles.splice(0, this.particles.length - 600);
  }

  dust(x: number, y: number): void {
    this.burst(x, y, 'rgba(230, 225, 210, 0.75)', 5, 2.5);
  }

  score(x: number, y: number, amount: number): void {
    this.floaters.push({ x, y, text: `+${amount}`, life: 1 });
    if (this.floaters.length > 40) this.floaters.shift();
  }

  clear(): void {
    this.particles.length = 0;
    this.floaters.length = 0;
  }

  /** dt: 초 단위 */
  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += 22 * dt;
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.life -= dt / p.maxLife;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.y -= 34 * dt;
      f.life -= dt / 1.1;
      if (f.life <= 0) this.floaters.splice(i, 1);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = '#fff3c4';
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 3;
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}
