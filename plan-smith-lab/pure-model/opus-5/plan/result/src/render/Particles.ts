import { hashRandom, TAU } from '../core/math';

type ParticleKind = 'shard' | 'dust' | 'spark' | 'text';

interface Particle {
  active: boolean;
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  angle: number;
  spin: number;
  color: string;
  text: string;
}

/**
 * Pure render particles — never physics bodies (plan §6.2). Debris that
 * collides would double the body count during exactly the frames where the
 * frame budget is tightest.
 *
 * Fixed-size pool: allocation during a collapse is what turns a 60fps collapse
 * into a 40fps one.
 */
export class Particles {
  private readonly pool: Particle[] = [];
  private cursor = 0;
  private seed = 1;
  private gravity = 0.28;

  constructor(capacity = 700) {
    for (let i = 0; i < capacity; i += 1) {
      this.pool.push({
        active: false,
        kind: 'dust',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 1,
        angle: 0,
        spin: 0,
        color: '#fff',
        text: '',
      });
    }
  }

  setGravity(gravityPerStep: number): void {
    this.gravity = gravityPerStep;
  }

  get activeCount(): number {
    let n = 0;
    for (const p of this.pool) if (p.active) n += 1;
    return n;
  }

  clear(): void {
    for (const p of this.pool) p.active = false;
    this.cursor = 0;
  }

  private rand(): number {
    this.seed = (this.seed + 1) | 0;
    return hashRandom(this.seed);
  }

  /** Oldest-first reuse: a burst never fails, it just recycles. */
  private take(): Particle {
    const p = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % this.pool.length;
    return p;
  }

  spawnDebris(x: number, y: number, color: string, extent: number, count = 10): void {
    for (let i = 0; i < count; i += 1) {
      const p = this.take();
      const a = this.rand() * TAU;
      const speed = 1.4 + this.rand() * 4.2;
      p.active = true;
      p.kind = 'shard';
      p.x = x + (this.rand() - 0.5) * extent;
      p.y = y + (this.rand() - 0.5) * extent;
      p.vx = Math.cos(a) * speed;
      p.vy = Math.sin(a) * speed - 1.5;
      p.maxLife = 42 + this.rand() * 34;
      p.life = p.maxLife;
      p.size = 3 + this.rand() * (extent * 0.22 + 3);
      p.angle = this.rand() * TAU;
      p.spin = (this.rand() - 0.5) * 0.4;
      p.color = color;
    }
  }

  spawnDust(x: number, y: number, count = 6, color = 'rgba(224, 214, 196, 0.75)'): void {
    for (let i = 0; i < count; i += 1) {
      const p = this.take();
      p.active = true;
      p.kind = 'dust';
      p.x = x + (this.rand() - 0.5) * 26;
      p.y = y + (this.rand() - 0.5) * 18;
      p.vx = (this.rand() - 0.5) * 1.6;
      p.vy = -0.4 - this.rand() * 1.2;
      p.maxLife = 34 + this.rand() * 26;
      p.life = p.maxLife;
      p.size = 8 + this.rand() * 16;
      p.angle = 0;
      p.spin = 0;
      p.color = color;
    }
  }

  spawnSparks(x: number, y: number, count = 14, color = '#ffd257'): void {
    for (let i = 0; i < count; i += 1) {
      const p = this.take();
      const a = this.rand() * TAU;
      const speed = 3 + this.rand() * 7;
      p.active = true;
      p.kind = 'spark';
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * speed;
      p.vy = Math.sin(a) * speed;
      p.maxLife = 20 + this.rand() * 20;
      p.life = p.maxLife;
      p.size = 2 + this.rand() * 3;
      p.angle = a;
      p.spin = 0;
      p.color = color;
    }
  }

  /** Floating score popup, drawn in world space next to what was destroyed. */
  spawnText(x: number, y: number, text: string, color = '#ffffff'): void {
    const p = this.take();
    p.active = true;
    p.kind = 'text';
    p.x = x;
    p.y = y;
    p.vx = 0;
    p.vy = -0.9;
    p.maxLife = 70;
    p.life = p.maxLife;
    p.size = 22;
    p.angle = 0;
    p.spin = 0;
    p.color = color;
    p.text = text;
  }

  update(): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= 1;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      switch (p.kind) {
        case 'shard':
          p.vy += this.gravity;
          p.vx *= 0.995;
          p.angle += p.spin;
          break;
        case 'dust':
          p.vx *= 0.96;
          p.vy *= 0.96;
          break;
        case 'spark':
          p.vy += this.gravity * 0.4;
          p.vx *= 0.94;
          p.vy *= 0.94;
          break;
        case 'text':
          p.vy *= 0.97;
          break;
      }
      p.x += p.vx;
      p.y += p.vy;
    }
  }

  /** Draws in WORLD space; the caller has already applied the camera. */
  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      const t = p.life / p.maxLife;
      ctx.globalAlpha = p.kind === 'text' ? Math.min(1, t * 2) : t;

      switch (p.kind) {
        case 'shard': {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
          ctx.restore();
          break;
        }
        case 'dust': {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1.4 - t * 0.4), 0, TAU);
          ctx.fill();
          break;
        }
        case 'spark': {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * 0.6;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 1.6, p.y - p.vy * 1.6);
          ctx.stroke();
          break;
        }
        case 'text': {
          ctx.fillStyle = p.color;
          ctx.font = `800 ${p.size}px 'Trebuchet MS', sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = 4;
          ctx.strokeStyle = 'rgba(0,0,0,0.55)';
          ctx.strokeText(p.text, p.x, p.y);
          ctx.fillText(p.text, p.x, p.y);
          break;
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}
