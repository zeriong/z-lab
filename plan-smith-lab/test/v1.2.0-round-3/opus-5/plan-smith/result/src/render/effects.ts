// B21 — 파괴 피드백(파편 파티클·화면 흔들림)
//
// 무엇이 왜 부서졌는지 화면만 보고 알 수 있게 한다.
// 물리 스텝이 아니라 프레임 시간으로 갱신된다(결정성에 영향을 주지 않는다).

export interface Particle {
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

const MAX_PARTICLES = 260;
const SHAKE_MAX_MS = 120;

export class Effects {
  particles: Particle[] = [];
  private shakeMs = 0;
  private shakeAmp = 0;
  private seed = 20240101;

  private rand(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  burst(x: number, y: number, color: string, count = 12, power = 320): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      const a = this.rand() * Math.PI * 2;
      const sp = power * (0.35 + this.rand() * 0.85);
      const life = 0.35 + this.rand() * 0.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - power * 0.35,
        life,
        maxLife: life,
        size: 4 + this.rand() * 9,
        color,
        spin: (this.rand() - 0.5) * 12,
        angle: this.rand() * Math.PI,
      });
    }
  }

  shake(ms: number, amplitude = 10): void {
    this.shakeMs = Math.min(SHAKE_MAX_MS, Math.max(this.shakeMs, ms));
    this.shakeAmp = Math.max(this.shakeAmp, amplitude);
  }

  update(dtSec: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dtSec;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += 1400 * dtSec;
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.angle += p.spin * dtSec;
      p.vx *= 1 - 0.9 * dtSec;
    }
    if (this.shakeMs > 0) {
      this.shakeMs -= dtSec * 1000;
      if (this.shakeMs <= 0) {
        this.shakeMs = 0;
        this.shakeAmp = 0;
      }
    }
  }

  /** 현재 프레임의 화면 흔들림 오프셋. */
  shakeOffset(): { x: number; y: number } {
    if (this.shakeMs <= 0) return { x: 0, y: 0 };
    const k = this.shakeMs / SHAKE_MAX_MS;
    return {
      x: (this.rand() - 0.5) * 2 * this.shakeAmp * k,
      y: (this.rand() - 0.5) * 2 * this.shakeAmp * k,
    };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    this.particles = [];
    this.shakeMs = 0;
    this.shakeAmp = 0;
  }
}
