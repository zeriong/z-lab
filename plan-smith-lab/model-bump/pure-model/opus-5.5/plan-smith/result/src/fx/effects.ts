// 파티클·점수 팝업·화면 흔들림 (§4.13). 모두 물리 스텝 기준으로 진행 → 일시정지하면 같이 멈춘다.
import {
  DEBRIS_LIFE,
  G_PER_STEP,
  PARTICLE_CAP,
  POPUP_LIFE,
  SHAKE_AMP,
  SHAKE_STEPS,
  SMOKE_LIFE,
} from '../config';

export type ParticleKind = 'debris' | 'smoke' | 'spark';

export interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vrot: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface Popup {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

/** 결정적 난수 (mulberry32) — 같은 입력이면 같은 이펙트 */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Effects {
  readonly particles: Particle[] = [];
  readonly popups: Popup[] = [];
  shakeSteps = 0;
  shakeAmp = 0;
  private readonly rng: () => number;

  constructor(seed = 1) {
    this.rng = makeRng(seed);
  }

  private push(p: Particle): void {
    if (this.particles.length >= PARTICLE_CAP) {
      // 풀이 꽉 차면 가장 오래된 것을 버린다
      this.particles.shift();
    }
    this.particles.push(p);
  }

  /** 블록 파괴: 재질 색 파편 8–12개 */
  debris(x: number, y: number, color: string): void {
    const n = 8 + Math.floor(this.rng() * 5);
    for (let i = 0; i < n; i++) {
      const ang = this.rng() * Math.PI * 2;
      const sp = 1.5 + this.rng() * 4;
      this.push({
        kind: 'debris',
        x: x + (this.rng() - 0.5) * 20,
        y: y + (this.rng() - 0.5) * 20,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 2,
        size: 4 + this.rng() * 7,
        rot: this.rng() * Math.PI,
        vrot: (this.rng() - 0.5) * 0.4,
        color,
        life: DEBRIS_LIFE,
        maxLife: DEBRIS_LIFE,
      });
    }
  }

  /** 돼지 제거·새 소멸: 연기 */
  smoke(x: number, y: number, color = '#8bc34a', count = 10): void {
    for (let i = 0; i < count; i++) {
      const ang = this.rng() * Math.PI * 2;
      const sp = 0.3 + this.rng() * 1.2;
      this.push({
        kind: 'smoke',
        x: x + (this.rng() - 0.5) * 16,
        y: y + (this.rng() - 0.5) * 16,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 0.6,
        size: 10 + this.rng() * 12,
        rot: 0,
        vrot: 0,
        color,
        life: SMOKE_LIFE,
        maxLife: SMOKE_LIFE,
      });
    }
  }

  /** 폭발 불꽃 */
  blast(x: number, y: number): void {
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2 + this.rng() * 0.2;
      const sp = 3 + this.rng() * 5;
      this.push({
        kind: 'spark',
        x,
        y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        size: 6 + this.rng() * 8,
        rot: 0,
        vrot: 0,
        color: i % 2 === 0 ? '#ffb300' : '#ff5722',
        life: 24,
        maxLife: 24,
      });
    }
    this.smoke(x, y, '#555555', 12);
  }

  popup(x: number, y: number, text: string, color = '#ffffff'): void {
    this.popups.push({ x, y, text, color, life: POPUP_LIFE, maxLife: POPUP_LIFE });
    if (this.popups.length > 40) this.popups.shift();
  }

  shake(amp = SHAKE_AMP, steps = SHAKE_STEPS): void {
    this.shakeAmp = Math.max(this.shakeAmp * (this.shakeSteps / SHAKE_STEPS), amp);
    this.shakeSteps = steps;
  }

  /** 현재 흔들림 오프셋 (감쇠) */
  shakeOffset(): { x: number; y: number } {
    if (this.shakeSteps <= 0) return { x: 0, y: 0 };
    const k = this.shakeSteps / SHAKE_STEPS;
    const a = this.shakeAmp * k;
    return { x: Math.sin(this.shakeSteps * 2.3) * a, y: Math.cos(this.shakeSteps * 3.1) * a };
  }

  step(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.life--;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      if (p.kind === 'debris') {
        p.vy += G_PER_STEP;
      } else {
        p.vx *= 0.94;
        p.vy *= 0.94;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i]!;
      p.life--;
      p.y -= 0.8;
      if (p.life <= 0) this.popups.splice(i, 1);
    }
    if (this.shakeSteps > 0) this.shakeSteps--;
  }

  clear(): void {
    this.particles.length = 0;
    this.popups.length = 0;
    this.shakeSteps = 0;
    this.shakeAmp = 0;
  }
}
