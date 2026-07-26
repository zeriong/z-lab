// 파괴 파편 + 점수 팝업. 시각 효과 전용 — 물리·판정과 무관.
interface Chip {
  kind: 'chip';
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

interface Popup {
  kind: 'popup';
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
}

type Particle = Chip | Popup;

export class Particles {
  private items: Particle[] = [];

  burst(x: number, y: number, color: string, count = 10): void {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 4;
      this.items.push({
        kind: 'chip',
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 2,
        size: 3 + Math.random() * 5,
        color,
        life: 600,
        maxLife: 600,
      });
    }
  }

  popup(x: number, y: number, text: string): void {
    this.items.push({ kind: 'popup', x, y, text, life: 900, maxLife: 900 });
  }

  // advance=false(일시정지 등)면 시간은 멈추고 그리기만 한다.
  update(dtMs: number): void {
    for (const p of this.items) {
      p.life -= dtMs;
      if (p.kind === 'chip') {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25;
      } else {
        p.y -= 0.7;
      }
    }
    this.items = this.items.filter((p) => p.life > 0);
  }

  clear(): void {
    this.items = [];
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.items) {
      const alpha = Math.max(0, p.life / p.maxLife);
      if (p.kind === 'chip') {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else {
        ctx.globalAlpha = Math.min(1, alpha * 1.5);
        ctx.font = 'bold 26px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.lineWidth = 4;
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = '#ffe066';
        ctx.fillText(p.text, p.x, p.y);
      }
    }
    ctx.globalAlpha = 1;
  }
}
