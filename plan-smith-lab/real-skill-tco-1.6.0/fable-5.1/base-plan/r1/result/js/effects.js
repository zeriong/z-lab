window.AB = window.AB || {};

// 파티클·떠오르는 점수·폭발 링 (계획서 §8.8). 시간 단위는 초(프레임 dt).
AB.Effects = (function () {
  'use strict';

  // 이펙트 전용 표현 상수(게임 규칙과 무관)
  const FX = {
    speedMin: 120, speedMax: 320,       // px/s
    upBias: 110,                         // 위쪽 편향 px/s
    gravity: 900,                        // px/s²
    lifeMin: 0.5, lifeMax: 0.8,          // s
    sizeMin: 3, sizeMax: 8,
    spinMax: 10,                         // rad/s
    maxParticles: 600,
    textLife: 1.0, textRise: 40,
    textFont: 'bold 22px "Apple SD Gothic Neo","Malgun Gothic",sans-serif',
    ringLife: 0.35, ringColor: '#ff8c1a', ringWidth: 6
  };

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  class Effects {
    constructor() {
      this.particles = [];   // {x,y,vx,vy,size,color,life,maxLife,rot,vrot}
      this.texts = [];       // {x,y,str,life,maxLife}
      this.rings = [];       // {x,y,r,maxR,life,maxLife}
    }

    clear() {
      this.particles.length = 0;
      this.texts.length = 0;
      this.rings.length = 0;
    }

    burst(x, y, color, count) {
      const n = (count == null) ? 8 : count;
      for (let i = 0; i < n; i++) {
        const ang = rand(0, Math.PI * 2);
        const sp = rand(FX.speedMin, FX.speedMax);
        const life = rand(FX.lifeMin, FX.lifeMax);
        this.particles.push({
          x: x, y: y,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp - FX.upBias,
          size: rand(FX.sizeMin, FX.sizeMax),
          color: color || '#ffffff',
          life: life, maxLife: life,
          rot: rand(0, Math.PI * 2),
          vrot: rand(-FX.spinMax, FX.spinMax)
        });
      }
      if (this.particles.length > FX.maxParticles) {
        this.particles.splice(0, this.particles.length - FX.maxParticles);
      }
    }

    text(x, y, str) {
      this.texts.push({ x: x, y: y, str: String(str), life: FX.textLife, maxLife: FX.textLife });
    }

    ring(x, y, maxR) {
      this.rings.push({ x: x, y: y, r: 0, maxR: maxR, life: FX.ringLife, maxLife: FX.ringLife });
    }

    update(dt) {
      if (!(dt > 0)) return;
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.vy += FX.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vrot * dt;
        p.life -= dt;
        if (p.life <= 0) this.particles.splice(i, 1);
      }
      for (let i = this.texts.length - 1; i >= 0; i--) {
        const t = this.texts[i];
        t.life -= dt;
        if (t.life <= 0) this.texts.splice(i, 1);
      }
      for (let i = this.rings.length - 1; i >= 0; i--) {
        const r = this.rings[i];
        r.life -= dt;
        r.r = r.maxR * (1 - Math.max(0, r.life) / r.maxLife);
        if (r.life <= 0) this.rings.splice(i, 1);
      }
    }

    draw(ctx) {
      if (!this.particles.length && !this.texts.length && !this.rings.length) return;
      ctx.save();

      for (const p of this.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife));
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }

      for (const r of this.rings) {
        ctx.globalAlpha = Math.max(0, Math.min(1, r.life / r.maxLife));
        ctx.strokeStyle = FX.ringColor;
        ctx.lineWidth = FX.ringWidth;
        ctx.beginPath();
        ctx.arc(r.x, r.y, Math.max(0.1, r.r), 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.font = FX.textFont;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      for (const t of this.texts) {
        const k = 1 - t.life / t.maxLife;
        ctx.globalAlpha = Math.max(0, Math.min(1, t.life / t.maxLife));
        const y = t.y - FX.textRise * k;
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.strokeText(t.str, t.x, y);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(t.str, t.x, y);
      }

      ctx.restore();
    }
  }

  return Effects;
})();
