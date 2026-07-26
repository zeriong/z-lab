// 파괴 파편 파티클 - 순수 시각 효과, 물리 충돌에는 관여하지 않는다.
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

export class ParticleSystem {
  private items: Particle[] = [];

  spawn(x: number, y: number, color: string, count: number, big: boolean): void {
    const speed = big ? 9 : 5;
    const size = big ? 6 : 4;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const s = Math.random() * speed + 1;
      this.items.push({
        x,
        y,
        vx: Math.cos(angle) * s,
        vy: Math.sin(angle) * s - speed * 0.4,
        life: 0,
        maxLife: 500 + Math.random() * 400,
        color,
        size: Math.random() * size + 2,
      });
    }
  }

  update(dtMs: number): void {
    const dt = dtMs / 16.667;
    for (const p of this.items) {
      p.vy += 0.35 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life += dtMs;
    }
    this.items = this.items.filter((p) => p.life < p.maxLife);
  }

  draw(ctx: CanvasRenderingContext2D, camera: { toScreenX: (x: number) => number }): void {
    for (const p of this.items) {
      const alpha = 1 - p.life / p.maxLife;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = p.color;
      ctx.fillRect(camera.toScreenX(p.x) - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    this.items = [];
  }
}
