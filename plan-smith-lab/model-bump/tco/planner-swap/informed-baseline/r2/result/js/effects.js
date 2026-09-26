window.AB = window.AB || {};

(function() {
  'use strict';

  const particles = [];
  const texts = [];
  const rings = [];

  function reset() {
    particles.length = 0;
    texts.length = 0;
    rings.length = 0;
  }

  function spawnDebris(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const vx = (Math.random() - 0.5) * 400;
      const vy = -Math.random() * 350 - 50;
      const size = 4 + Math.random() * 5;
      const maxLife = 0.6 + Math.random() * 0.4;
      particles.push({
        x, y, vx, vy, size, color,
        life: maxLife,
        maxLife
      });
    }
  }

  function spawnText(x, y, text, color) {
    texts.push({ x, y, text, color, life: 1.0 });
  }

  function spawnRing(x, y, radius) {
    rings.push({ x, y, radius, life: 0.35 });
  }

  function update(dt) {
    // Update particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.vy += 900 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }

    // Update texts
    for (let i = 0; i < texts.length; i++) {
      const t = texts[i];
      t.y -= 40 * dt;
      t.life -= dt;
    }

    // Update rings
    for (let i = 0; i < rings.length; i++) {
      rings[i].life -= dt;
    }

    // Filter out dead particles
    let j = 0;
    for (let i = 0; i < particles.length; i++) {
      if (particles[i].life > 0) {
        particles[j++] = particles[i];
      }
    }
    particles.length = j;

    // Filter out dead texts
    j = 0;
    for (let i = 0; i < texts.length; i++) {
      if (texts[i].life > 0) {
        texts[j++] = texts[i];
      }
    }
    texts.length = j;

    // Filter out dead rings
    j = 0;
    for (let i = 0; i < rings.length; i++) {
      if (rings[i].life > 0) {
        rings[j++] = rings[i];
      }
    }
    rings.length = j;
  }

  function draw(ctx) {
    // Draw particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.save();
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.restore();
    }

    // Draw texts
    ctx.save();
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < texts.length; i++) {
      const t = texts[i];
      ctx.globalAlpha = t.life;
      ctx.fillStyle = t.color;
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 4;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.textAlign = 'left';
    ctx.restore();

    // Draw rings
    ctx.save();
    ctx.strokeStyle = '#FF8C1A';
    ctx.lineWidth = 6;
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i];
      ctx.globalAlpha = r.life / 0.35;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius * (1 - r.life / 0.35), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  AB.Effects = {
    reset,
    spawnDebris,
    spawnText,
    spawnRing,
    update,
    draw
  };
})();
