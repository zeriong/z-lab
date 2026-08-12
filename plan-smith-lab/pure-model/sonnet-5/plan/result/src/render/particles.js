/**
 * 계획서 §6-2: 파괴 파편. 물리 연산 없는 순수 시각 효과(렌더 전용 객체, 물리 바디 아님).
 */
const PARTICLE_LIFETIME_MS = 500;
const PARTICLES_PER_BURST = 8;

export function createParticleSystem() {
  /** @type {{x:number,y:number,vx:number,vy:number,ageMs:number,color:string,size:number}[]} */
  let particles = [];

  /**
   * @param {number} x
   * @param {number} y
   * @param {string} color
   * @param {number} [count]
   */
  function spawn(x, y, color, count = PARTICLES_PER_BURST) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 160; // px/s
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        ageMs: 0,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  /** @param {number} dtMs */
  function update(dtMs) {
    const dtS = dtMs / 1000;
    for (const p of particles) {
      p.x += p.vx * dtS;
      p.y += p.vy * dtS;
      p.vy += 400 * dtS; // 파편은 렌더 전용이라 별도의 간단한 낙하 가속만 흉내낸다
      p.ageMs += dtMs;
    }
    particles = particles.filter((p) => p.ageMs < PARTICLE_LIFETIME_MS);
  }

  /** @param {CanvasRenderingContext2D} ctx */
  function draw(ctx) {
    for (const p of particles) {
      const alpha = 1 - p.ageMs / PARTICLE_LIFETIME_MS;
      ctx.globalAlpha = Math.max(alpha, 0);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function clear() {
    particles = [];
  }

  return { spawn, update, draw, clear };
}
