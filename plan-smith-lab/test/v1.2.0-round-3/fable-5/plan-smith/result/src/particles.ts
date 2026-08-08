// 파괴 파티클 (L23) — 도형 파편 6~10개, 수명 0.5초 내외.
// 업데이트는 PLAYING일 때만 호출되므로 PAUSED 중에는 얼어 있다(L20과 일관).

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  size: number;
  color: string;
  angle: number;
  spin: number;
}

const parts: Particle[] = [];

export function burst(x: number, y: number, color: string): void {
  const n = 6 + Math.floor(Math.random() * 5); // 6~10개
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    parts.push({
      x,
      y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed - 2,
      life: 0,
      ttl: 24 + Math.floor(Math.random() * 12), // 약 0.4~0.6초 @60fps
      size: 3 + Math.random() * 5,
      color,
      angle: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.4,
    });
  }
}

export function updateParticles(): void {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life++;
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.angle += p.spin;
    if (p.life > p.ttl) parts.splice(i, 1);
  }
}

export function drawParticles(ctx: CanvasRenderingContext2D): void {
  for (const p of parts) {
    const alpha = Math.max(0, 1 - p.life / p.ttl);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    ctx.restore();
  }
}

export function clearParticles(): void {
  parts.length = 0;
}
