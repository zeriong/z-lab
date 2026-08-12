interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
}

export class EffectsSystem {
  private particles: Particle[] = []

  createBreakParticles(x: number, y: number, color: string, count: number = 5) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count
      const speed = 2 + Math.random() * 3
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6,
        maxLife: 0.6,
        size: 4 + Math.random() * 4,
        color
      })
    }
  }

  createDustParticles(x: number, y: number, count: number = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 2
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2, // Rise up
        life: 0.8,
        maxLife: 0.8,
        size: 2 + Math.random() * 2,
        color: 'rgba(100, 100, 100, 0.5)'
      })
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life -= dt
      p.x += p.vx * dt * 60
      p.y += p.vy * dt * 60
      p.vy += 9.8 * dt * 60 // Gravity

      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife
      const rgbaColor = p.color.replace(/rgba?\([^,]+,\s*[^,]+,\s*[^,]+,\s*[\d.]+\)/, `rgba(100, 100, 100, ${alpha})`)
      ctx.fillStyle = rgbaColor
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
    }
  }

  clear() {
    this.particles = []
  }
}
