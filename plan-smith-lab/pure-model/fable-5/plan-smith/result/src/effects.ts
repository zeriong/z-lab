// 파괴 이펙트 (M22) — 파편 파티클 + 점수 팝업.
// update()는 게임 tick에서만 호출되므로 PAUSED 동안 자동으로 동결된다 (M18).

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  size: number;
  color: string;
}

export interface Popup {
  x: number;
  y: number;
  text: string;
  life: number;
  ttl: number;
}

export class Effects {
  particles: Particle[] = [];
  popups: Popup[] = [];

  reset(): void {
    this.particles = [];
    this.popups = [];
  }

  /** 제거 지점에 파편 분출 — 귀속이 보이는 타격감 (§3 파괴 피드백 바닥선) */
  burst(x: number, y: number, color: string, count = 14): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 2,
        life: 600,
        ttl: 600,
        size: 2 + Math.random() * 4,
        color,
      });
    }
  }

  popup(x: number, y: number, text: string): void {
    this.popups.push({ x, y, text, life: 900, ttl: 900 });
  }

  update(dtMs: number): void {
    const n = dtMs / (1000 / 60);
    for (const p of this.particles) {
      p.x += p.vx * n;
      p.y += p.vy * n;
      p.vy += 0.25 * n;
      p.life -= dtMs;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.popups) {
      p.y -= 0.8 * n;
      p.life -= dtMs;
    }
    this.popups = this.popups.filter((p) => p.life > 0);
  }
}
