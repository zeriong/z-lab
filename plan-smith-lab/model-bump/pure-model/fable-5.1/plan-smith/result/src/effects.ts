// B9: 파괴 파편 파티클 + 화면 흔들림. 물리 엔진과 무관한 순수 상태라 유닛 테스트가 쉽다.
import type { Vec2 } from './types';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
}

export const PARTICLE_GRAVITY = 0.35;
export const MAX_PARTICLES = 400;

export class Effects {
  particles: Particle[] = [];
  shakeFrames = 0;
  shakeStrength = 0;
  shakeOffset: Vec2 = { x: 0, y: 0 };

  constructor(private readonly rng: () => number = Math.random) {}

  /** 파편 8~16개(count 기본 12). 초과분은 오래된 것부터 버린다. */
  burst(x: number, y: number, color: string, count = 12, speed = 7): void {
    const n = Math.max(8, Math.min(16, Math.round(count)));
    for (let i = 0; i < n; i++) {
      const a = this.rng() * Math.PI * 2;
      const s = speed * (0.4 + this.rng() * 0.8);
      const life = 28 + Math.floor(this.rng() * 22);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - speed * 0.5,
        life,
        maxLife: life,
        size: 5 + this.rng() * 9,
        color,
        rot: this.rng() * Math.PI,
        vr: (this.rng() - 0.5) * 0.4,
      });
    }
    if (this.particles.length > MAX_PARTICLES) {
      this.particles.splice(0, this.particles.length - MAX_PARTICLES);
    }
  }

  /** 흔들림 n프레임(돼지 제거 시 6). */
  shake(frames = 6, strength = 8): void {
    this.shakeFrames = Math.max(this.shakeFrames, frames);
    this.shakeStrength = Math.max(this.shakeStrength, strength);
  }

  update(): void {
    for (const p of this.particles) {
      p.vy += PARTICLE_GRAVITY;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.rot += p.vr;
      p.life -= 1;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    if (this.shakeFrames > 0) {
      this.shakeFrames -= 1;
      const k = this.shakeStrength * (this.shakeFrames / 6);
      this.shakeOffset = { x: (this.rng() - 0.5) * 2 * k, y: (this.rng() - 0.5) * 2 * k };
      if (this.shakeFrames === 0) this.shakeStrength = 0;
    } else {
      this.shakeOffset = { x: 0, y: 0 };
    }
  }

  clear(): void {
    this.particles = [];
    this.shakeFrames = 0;
    this.shakeStrength = 0;
    this.shakeOffset = { x: 0, y: 0 };
  }
}
