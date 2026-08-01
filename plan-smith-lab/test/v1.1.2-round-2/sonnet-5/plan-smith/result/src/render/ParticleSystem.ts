export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

/** Plan §매트릭스 #15: destruction spawns debris/dust particles ("최소"). */
export class ParticleSystem {
  particles: Particle[] = [];

  spawnBurst(x: number, y: number, color: string, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 0,
        maxLife: 30 + Math.random() * 20,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  update() {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life += 1;
    }
    this.particles = this.particles.filter((p) => p.life < p.maxLife);
  }

  clear() {
    this.particles = [];
  }
}
