import { Vector } from '../core/types';

export interface Particle {
  position: Vector;
  velocity: Vector;
  life: number; // 0 to 1
  maxLife: number;
  size: number;
  color: string;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private gravity: number = 0.5;

  addExplosion(center: Vector, count: number = 10): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 100 + Math.random() * 200;
      const particle: Particle = {
        position: { ...center },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        },
        life: 1,
        maxLife: 0.5 + Math.random() * 0.5,
        size: 2 + Math.random() * 4,
        color: ['#FFD700', '#FF6B6B', '#FFA500', '#FF4500'][Math.floor(Math.random() * 4)],
      };
      this.particles.push(particle);
    }
  }

  addDust(center: Vector, count: number = 5): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 60;
      const particle: Particle = {
        position: { ...center },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed - 30,
        },
        life: 1,
        maxLife: 0.3 + Math.random() * 0.4,
        size: 1 + Math.random() * 2,
        color: '#999',
      };
      this.particles.push(particle);
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt / p.maxLife;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.velocity.y += this.gravity;
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
    }
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  clear(): void {
    this.particles = [];
  }
}
