import { DEBRIS_SECONDS, MAX_PARTICLES } from '../config/constants';
import { MATERIAL_SPECS } from '../config/catalog';
import type { Emitter, SessionEventMap } from '../core/events';

/**
 * 파편, 점수 팝업, 폭발 링, 새 제거 연기 (§8.2-9).
 * 시각 전용이다. 물리 바디가 아니고 세션 상태를 바꾸지 않으므로 결정론에 영향이 없다.
 */

interface Particle {
  x: number; y: number; vx: number; vy: number;
  rot: number; vr: number; size: number;
  life: number; maxLife: number; color: string;
}
interface Popup { x: number; y: number; text: string; life: number; maxLife: number; color: string }
interface Ring { x: number; y: number; radius: number; life: number; maxLife: number }
interface Puff { x: number; y: number; life: number; maxLife: number; seed: number }

const GRAVITY = 1400; // px/s², 시각 전용

export class Effects {
  private particles: Particle[] = [];
  private popups: Popup[] = [];
  private rings: Ring[] = [];
  private puffs: Puff[] = [];

  /** 세션 이벤트에 구독한다. 세션 destroy() 시 구독은 함께 해제된다. */
  bind(events: Emitter<SessionEventMap>): void {
    events.on('blockDestroyed', (e) => {
      const color = e.material === 'tnt' ? '#c62828' : MATERIAL_SPECS[e.material].fill;
      this.debris(e.x, e.y, color, Math.min(14, 4 + Math.round((e.w * e.h) / 800)));
    });
    events.on('pigKilled', (e) => {
      this.debris(e.x, e.y, '#7bd23f', 10);
      this.puff(e.x, e.y);
    });
    events.on('scoreChanged', (e) => {
      if (e.delta <= 0) return;
      this.popups.push({
        x: e.x, y: e.y - 20, text: `+${e.delta.toLocaleString('ko-KR')}`,
        life: 0, maxLife: 1.1, color: e.delta >= 5000 ? '#fff176' : '#ffffff',
      });
    });
    events.on('explosion', (e) => {
      this.rings.push({ x: e.x, y: e.y, radius: e.radius, life: 0, maxLife: 0.45 });
      this.debris(e.x, e.y, '#ffb74d', 12);
    });
    events.on('birdRemoved', (e) => this.puff(e.x, e.y));
  }

  clear(): void {
    this.particles = [];
    this.popups = [];
    this.rings = [];
    this.puffs = [];
  }

  private debris(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 150 + Math.random() * 350;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 200,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 12,
        size: 4 + Math.random() * 7,
        life: 0, maxLife: DEBRIS_SECONDS * (0.7 + Math.random() * 0.6), color,
      });
    }
  }

  private puff(x: number, y: number): void {
    this.puffs.push({ x, y, life: 0, maxLife: 0.7, seed: Math.random() * 10 });
  }

  update(dt: number): void {
    if (dt <= 0) return;
    for (const p of this.particles) {
      p.life += dt;
      p.vy += GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    this.particles = this.particles.filter((p) => p.life < p.maxLife);
    for (const p of this.popups) {
      p.life += dt;
      p.y -= 50 * dt;
    }
    this.popups = this.popups.filter((p) => p.life < p.maxLife);
    for (const r of this.rings) r.life += dt;
    this.rings = this.rings.filter((r) => r.life < r.maxLife);
    for (const p of this.puffs) p.life += dt;
    this.puffs = this.puffs.filter((p) => p.life < p.maxLife);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const r of this.rings) {
      const t = r.life / r.maxLife;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      const g = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.radius * (0.4 + 0.6 * t));
      g.addColorStop(0, 'rgba(255, 250, 200, 0.95)');
      g.addColorStop(0.5, 'rgba(255, 170, 60, 0.6)');
      g.addColorStop(1, 'rgba(255, 90, 20, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius * (0.4 + 0.6 * t), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 4 * (1 - t) + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius * t, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    for (const p of this.puffs) {
      const t = p.life / p.maxLife;
      ctx.fillStyle = `rgba(235, 235, 235, ${0.8 * (1 - t)})`;
      for (let i = 0; i < 5; i++) {
        const a = p.seed + i * 1.256;
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(a) * 26 * t, p.y + Math.sin(a) * 26 * t - 10 * t, 10 + 14 * t, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 34px sans-serif';
    for (const p of this.popups) {
      const a = 1 - p.life / p.maxLife;
      ctx.lineWidth = 5;
      ctx.strokeStyle = `rgba(40, 40, 40, ${a})`;
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = a;
      ctx.fillText(p.text, p.x, p.y);
      ctx.globalAlpha = 1;
    }
  }
}
