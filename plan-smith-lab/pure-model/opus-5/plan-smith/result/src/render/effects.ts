/**
 * 파편·먼지 파티클 (R17).
 *
 * **전부 비물리다.** 물리 바디로 만들면 스테이지 9·10에서 바디 수가 예산을
 * 넘고(§12), 리플레이 결정성도 깨진다. 그래서 Math.random()도 여기서만 쓴다 —
 * 시뮬레이션 계층(damage/settle/loop)은 난수를 쓰지 않는다.
 */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  kind: 'shard' | 'dust' | 'spark';
  rot: number;
  spin: number;
}

const GRAVITY = 0.0009; // px/ms² — 파편이 0.6초 안에 시야에서 내려가는 값
const MAX_PARTICLES = 420; // 프레임 예산 방어. 넘으면 오래된 것부터 버린다.

export class Effects {
  private particles: Particle[] = [];
  /** 점수 팝업(파티클과 수명 관리를 공유한다) */
  private popups: Array<{ x: number; y: number; life: number; maxLife: number; text: string }> = [];

  get count(): number {
    return this.particles.length;
  }

  clear(): void {
    this.particles.length = 0;
    this.popups.length = 0;
  }

  /** 블록 파괴: 재질 색 파편 3~5조각 + 먼지 (§3-17) */
  burst(x: number, y: number, color: string, scale = 1): void {
    const shards = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < shards; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.08 + Math.random() * 0.14) * scale;
      this.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.06,
        life: 600,
        maxLife: 600,
        size: (4 + Math.random() * 5) * scale,
        color,
        kind: 'shard',
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.01,
      });
    }
    this.dust(x, y, 4, scale);
  }

  dust(x: number, y: number, n = 4, scale = 1): void {
    for (let i = 0; i < n; i += 1) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const speed = (0.02 + Math.random() * 0.05) * scale;
      this.push({
        x: x + (Math.random() - 0.5) * 14,
        y: y + (Math.random() - 0.5) * 14,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 600,
        maxLife: 600,
        size: (10 + Math.random() * 14) * scale,
        color: 'rgba(214, 206, 190, 0.5)',
        kind: 'dust',
        rot: 0,
        spin: 0,
      });
    }
  }

  /** 폭발: 불꽃 링 + 먼지. 반경은 damage.ts가 주는 실제 폭발 반경. */
  explosion(x: number, y: number, radius: number): void {
    const n = 18;
    for (let i = 0; i < n; i += 1) {
      const angle = (i / n) * Math.PI * 2 + Math.random() * 0.2;
      const speed = 0.18 + Math.random() * 0.16;
      this.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 420,
        maxLife: 420,
        size: 6 + Math.random() * 8,
        color: i % 3 === 0 ? '#ffd76a' : '#ff8b3d',
        kind: 'spark',
        rot: 0,
        spin: 0,
      });
    }
    this.dust(x, y, 8, radius / 120);
  }

  /** 피격 스파크 — 파괴되지 않은 타격에도 피드백을 준다 */
  hit(x: number, y: number, color: string): void {
    this.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.1,
      vy: -0.05 - Math.random() * 0.05,
      life: 220,
      maxLife: 220,
      size: 4,
      color,
      kind: 'spark',
      rot: 0,
      spin: 0,
    });
  }

  popup(x: number, y: number, text: string): void {
    this.popups.push({ x, y, life: 900, maxLife: 900, text });
    if (this.popups.length > 24) this.popups.shift();
  }

  private push(p: Particle): void {
    if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
    this.particles.push(p);
  }

  update(dtMs: number): void {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.life -= dtMs;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += GRAVITY * dtMs * (p.kind === 'dust' ? 0.15 : 1);
      p.x += p.vx * dtMs;
      p.y += p.vy * dtMs;
      p.rot += p.spin * dtMs;
      if (p.kind === 'dust') p.size += 0.02 * dtMs;
    }

    for (let i = this.popups.length - 1; i >= 0; i -= 1) {
      const q = this.popups[i];
      q.life -= dtMs;
      q.y -= 0.03 * dtMs;
      if (q.life <= 0) this.popups.splice(i, 1);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.save();
      ctx.globalAlpha = p.kind === 'dust' ? alpha * 0.55 : alpha;
      ctx.translate(p.x, p.y);
      if (p.kind === 'shard') {
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    for (const q of this.popups) {
      const alpha = Math.max(0, Math.min(1, q.life / q.maxLife));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff3c4';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 3;
      ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeText(q.text, q.x, q.y);
      ctx.fillText(q.text, q.x, q.y);
      ctx.restore();
    }
  }
}
