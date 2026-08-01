/**
 * 감각 피드백 (R5): 재료별 파편 파티클 + 큰 붕괴에서만 화면 흔들림.
 * 파티클은 물리 바디가 아니라 시각 전용이며 상한(PARTICLE_CAP)에서 오래된 것부터 밀려난다.
 * 난수는 호출자가 주는 시드 고정 rng 만 사용한다(§7-A 제약 3).
 */

import type { Material, Vec2 } from './types';
import { GRAVITY_ACC, GROUND_Y, MATERIALS, PARTICLE_CAP, SHAKE_MAX, SHAKE_MIN_IMPACT } from './tuning';

type ParticleShape = 'shard' | 'chip' | 'dust';

interface Particle {
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
  shape: ParticleShape;
}

const SHAPE_BY_MATERIAL: Record<Material, ParticleShape> = {
  wood: 'chip', // 길쭉한 나뭇조각
  ice: 'shard', // 삼각 파편
  stone: 'dust', // 둔탁한 덩어리 + 먼지
};

export class Effects {
  private particles: Particle[] = [];
  private shakeMag = 0;
  private shakeSeed = 0;
  private rand: () => number;

  constructor(rand: () => number) {
    this.rand = rand;
  }

  setRandom(rand: () => number): void {
    this.rand = rand;
  }

  reset(): void {
    this.particles.length = 0;
    this.shakeMag = 0;
    this.shakeSeed = 0;
  }

  get particleCount(): number {
    return this.particles.length;
  }

  /** 재료별로 다른 파편 (완성 기준: 나무·얼음·돌이 육안으로 구분된다) */
  burst(at: Vec2, material: Material, strength = 1): void {
    const spec = MATERIALS[material];
    const count = Math.round((material === 'ice' ? 14 : material === 'wood' ? 10 : 8) * strength);
    for (let i = 0; i < count; i += 1) {
      const ang = this.rand() * Math.PI * 2;
      const speed = (material === 'ice' ? 3.4 : 2.2) * (0.4 + this.rand());
      this.push({
        x: at.x,
        y: at.y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed - 1.4,
        rot: this.rand() * Math.PI,
        vrot: (this.rand() - 0.5) * 0.4,
        size: (material === 'stone' ? 7 : 5) * (0.6 + this.rand() * 0.8),
        life: 40 + Math.floor(this.rand() * 40),
        maxLife: 80,
        color: this.rand() < 0.25 ? spec.stroke : spec.debris,
        shape: SHAPE_BY_MATERIAL[material],
      });
    }
  }

  /** 충돌 지점의 작은 스파크 */
  spark(at: Vec2, strength: number): void {
    const n = Math.min(6, 2 + Math.floor(strength / 30));
    for (let i = 0; i < n; i += 1) {
      const ang = this.rand() * Math.PI * 2;
      this.push({
        x: at.x,
        y: at.y,
        vx: Math.cos(ang) * 1.6,
        vy: Math.sin(ang) * 1.6 - 0.6,
        rot: 0,
        vrot: 0,
        size: 3,
        life: 12 + Math.floor(this.rand() * 8),
        maxLife: 20,
        color: 'rgba(255,240,200,0.9)',
        shape: 'dust',
      });
    }
  }

  /** 돼지 제거 연출 */
  pigPop(at: Vec2): void {
    for (let i = 0; i < 16; i += 1) {
      const ang = this.rand() * Math.PI * 2;
      const speed = 1.6 + this.rand() * 2.6;
      this.push({
        x: at.x,
        y: at.y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed - 1.8,
        rot: 0,
        vrot: (this.rand() - 0.5) * 0.3,
        size: 4 + this.rand() * 4,
        life: 30 + Math.floor(this.rand() * 25),
        maxLife: 55,
        color: this.rand() < 0.5 ? '#8ed24a' : '#d7f5a8',
        shape: 'dust',
      });
    }
  }

  /** 큰 붕괴에서만 흔들린다 */
  maybeShake(impact: number): void {
    if (impact < SHAKE_MIN_IMPACT) return;
    const mag = Math.min(SHAKE_MAX, (impact - SHAKE_MIN_IMPACT) * 0.12 + 3);
    if (mag > this.shakeMag) this.shakeMag = mag;
  }

  update(): void {
    this.shakeSeed += 1;
    this.shakeMag *= 0.88;
    if (this.shakeMag < 0.15) this.shakeMag = 0;

    const alive: Particle[] = [];
    for (const p of this.particles) {
      p.life -= 1;
      if (p.life <= 0) continue;
      p.vy += GRAVITY_ACC * 0.8;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      if (p.y > GROUND_Y - 1) {
        p.y = GROUND_Y - 1;
        p.vy *= -0.28;
        p.vx *= 0.7;
      }
      alive.push(p);
    }
    this.particles = alive;
  }

  /** 프레임마다 카메라에 적용할 오프셋 */
  shakeOffset(): Vec2 {
    if (this.shakeMag === 0) return { x: 0, y: 0 };
    const s = this.shakeSeed;
    return {
      x: Math.sin(s * 1.9) * this.shakeMag,
      y: Math.cos(s * 2.7) * this.shakeMag * 0.7,
    };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'chip') {
        ctx.fillRect(-p.size, -p.size * 0.35, p.size * 2, p.size * 0.7);
      } else if (p.shape === 'shard') {
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.8, p.size * 0.7);
        ctx.lineTo(-p.size * 0.8, p.size * 0.7);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private push(p: Particle): void {
    if (this.particles.length >= PARTICLE_CAP) this.particles.shift(); // 오래된 것부터 제거
    this.particles.push(p);
  }
}
