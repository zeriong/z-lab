(function() {
  window.AB = window.AB || {};

  const C = window.AB.CONFIG;
  let particles = [];
  let texts = [];
  let rings = [];

  function reset() {
    particles = [];
    texts = [];
    rings = [];
  }

  function spawnDebris(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 400,
        vy: -Math.random() * 350 - 50,
        size: 4 + Math.random() * 5,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 0.6 + Math.random() * 0.4,
        color
      });
    }
  }

  function spawnText(x, y, text, color) {
    texts.push({
      x,
      y,
      text,
      color,
      life: 1.0
    });
  }

  function spawnRing(x, y, radius) {
    rings.push({
      x,
      y,
      radius,
      life: 0.35
    });
  }

  function update(dt) {
    // Update particles
    particles = particles.filter(p => {
      p.vy += C.GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      return p.life > 0;
    });

    // Update texts
    texts = texts.filter(t => {
      t.y -= 40 * dt;
      t.life -= dt;
      return t.life > 0;
    });

    // Update rings
    rings = rings.filter(r => {
      r.life -= dt;
      return r.life > 0;
    });
  }

  function draw(ctx) {
    // Draw particles
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.restore();
    }

    // Draw texts
    for (const t of texts) {
      ctx.save();
      ctx.globalAlpha = t.life;
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 3;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }

    // Draw rings
    for (const r of rings) {
      ctx.save();
      ctx.globalAlpha = r.life / 0.35;
      ctx.strokeStyle = '#FF8C1A';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius * (1 - r.life / 0.35), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  window.AB.Effects = {
    reset,
    spawnDebris,
    spawnText,
    spawnRing,
    update,
    draw
  };
})();
