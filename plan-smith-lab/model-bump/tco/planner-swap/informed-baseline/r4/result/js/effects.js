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
      particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 400,
        vy: -Math.random() * 350 - 50,
        size: 4 + Math.random() * 5,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4,
        color: color
      });
    }
  }

  function spawnText(x, y, text, color) {
    texts.push({
      x: x,
      y: y,
      text: text,
      color: color,
      life: 1.0
    });
  }

  function spawnRing(x, y, radius) {
    rings.push({
      x: x,
      y: y,
      radius: radius,
      life: 0.35
    });
  }

  function update(dt) {
    // Update particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.vy += 900 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life += dt;
    }

    // Filter particles
    const newParticles = [];
    for (let i = 0; i < particles.length; i++) {
      if (particles[i].life <= particles[i].maxLife) {
        newParticles.push(particles[i]);
      }
    }
    particles.length = 0;
    for (let i = 0; i < newParticles.length; i++) {
      particles.push(newParticles[i]);
    }

    // Update texts
    for (let i = 0; i < texts.length; i++) {
      texts[i].y -= 40 * dt;
      texts[i].life -= dt;
    }

    // Filter texts
    const newTexts = [];
    for (let i = 0; i < texts.length; i++) {
      if (texts[i].life > 0) {
        newTexts.push(texts[i]);
      }
    }
    texts.length = 0;
    for (let i = 0; i < newTexts.length; i++) {
      texts.push(newTexts[i]);
    }

    // Update rings
    for (let i = 0; i < rings.length; i++) {
      rings[i].life -= dt;
    }

    // Filter rings
    const newRings = [];
    for (let i = 0; i < rings.length; i++) {
      if (rings[i].life > 0) {
        newRings.push(rings[i]);
      }
    }
    rings.length = 0;
    for (let i = 0; i < newRings.length; i++) {
      rings.push(newRings[i]);
    }
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
    for (let i = 0; i < texts.length; i++) {
      const t = texts[i];
      ctx.save();
      ctx.globalAlpha = t.life;
      ctx.fillStyle = t.color;
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 4;
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }

    // Draw rings
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i];
      ctx.save();
      ctx.globalAlpha = r.life / 0.35;
      ctx.strokeStyle = '#FF8C1A';
      ctx.lineWidth = 6;
      const currentRadius = r.radius * (1 - r.life / 0.35);
      ctx.beginPath();
      ctx.arc(r.x, r.y, currentRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  AB.Effects = {
    reset: reset,
    spawnDebris: spawnDebris,
    spawnText: spawnText,
    spawnRing: spawnRing,
    update: update,
    draw: draw
  };
})();
