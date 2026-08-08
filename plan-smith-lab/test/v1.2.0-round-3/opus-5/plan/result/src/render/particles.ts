/**
 * §12 파티클. 물리 바디가 아니다 — {x,y,vx,vy,life,color} 배열을 직접 적분한다.
 * 최대 300개, 초과 시 오래된 것부터 버린다(§17 모바일 완화 시 150).
 */

export const MAX_PARTICLES = 300;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
}

export class ParticleSystem {
  private items: Particle[] = [];
  private cap = MAX_PARTICLES;

  setCap(cap: number): void {
    this.cap = cap;
  }

  count(): number {
    return this.items.length;
  }

  clear(): void {
    this.items.length = 0;
  }

  private push(p: Particle): void {
    this.items.push(p);
    if (this.items.length > this.cap) this.items.splice(0, this.items.length - this.cap);
  }

  /** 파괴 시 파편 8~14개 (§6.1) */
  burst(x: number, y: number, color: string, radius = 16): void {
    const n = 8 + Math.floor(Math.random() * 7);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.2 + Math.random() * 3.2;
      this.push({
        x: x + (Math.random() - 0.5) * radius,
        y: y + (Math.random() - 0.5) * radius,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 1.2,
        life: 30 + Math.random() * 30,
        maxLife: 60,
        size: 2 + Math.random() * 3.5,
        color,
        gravity: 0.16,
      });
    }
  }

  /** 먼지 — 충돌 지점의 옅은 연기 */
  dust(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      this.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -Math.random() * 0.8,
        life: 20 + Math.random() * 18,
        maxLife: 38,
        size: 4 + Math.random() * 6,
        color: 'rgba(220,220,210,0.55)',
        gravity: -0.02,
      });
    }
  }

  /** black bird 폭발 */
  explosion(x: number, y: number): void {
    for (let i = 0; i < 44; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 6;
      this.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 24 + Math.random() * 26,
        maxLife: 50,
        size: 3 + Math.random() * 5,
        color: i % 3 === 0 ? '#ffd166' : i % 3 === 1 ? '#ef6136' : '#6b6b72',
        gravity: 0.08,
      });
    }
  }

  update(): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i]!;
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.99;
      p.life -= 1;
      if (p.life <= 0) this.items.splice(i, 1);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.items) {
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
