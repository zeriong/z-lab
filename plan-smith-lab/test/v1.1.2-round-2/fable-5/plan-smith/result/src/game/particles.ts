// 파괴 파티클 — "사라짐"이 아니라 "부서짐" (플랜 I-1, 품질 바닥)

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // ms 남은 수명
  maxLife: number;
  size: number;
  color: string;
}

export class Particles {
  private list: Particle[] = [];

  burst(x: number, y: number, color: string, count = 12): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.08 + Math.random() * 0.25; // px/ms
      this.list.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.15,
        life: 500 + Math.random() * 300,
        maxLife: 800,
        size: 3 + Math.random() * 5,
        color,
      });
    }
  }

  update(dtMs: number): void {
    const gravity = 0.0009; // px/ms^2
    for (const p of this.list) {
      p.vy += gravity * dtMs;
      p.x += p.vx * dtMs;
      p.y += p.vy * dtMs;
      p.life -= dtMs;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.list) {
      ctx.globalAlpha = Math.max(p.life / p.maxLife, 0);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}
