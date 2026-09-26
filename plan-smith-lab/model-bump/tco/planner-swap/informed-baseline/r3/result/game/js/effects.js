(function() {
  window.AB = window.AB || {};

  const particles = [];
  const texts = [];
  const rings = [];

  AB.Effects = {
    reset: function() {
      particles.length = 0;
      texts.length = 0;
      rings.length = 0;
    },

    spawnDebris: function(x, y, color, count) {
      for (let i = 0; i < count; i++) {
        particles.push({
          x: x,
          y: y,
          vx: (Math.random() - 0.5) * 400,
          vy: -Math.random() * 350 - 50,
          size: 4 + Math.random() * 5,
          color: color,
          life: 0,
          maxLife: 0.6 + Math.random() * 0.4
        });
      }
    },

    spawnText: function(x, y, text, color) {
      texts.push({
        x: x,
        y: y,
        text: text,
        color: color,
        life: 1.0
      });
    },

    spawnRing: function(x, y, radius) {
      rings.push({
        x: x,
        y: y,
        radius: radius,
        life: 0.35
      });
    },

    update: function(dt) {
      const cfg = AB.CONFIG;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.vy += cfg.GRAVITY * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life += dt;
      }

      for (let i = 0; i < texts.length; i++) {
        const t = texts[i];
        t.y -= 40 * dt;
        t.life -= dt;
      }

      for (let i = 0; i < rings.length; i++) {
        rings[i].life -= dt;
      }

      // Filter dead particles
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life >= particles[i].maxLife) {
          particles.splice(i, 1);
        }
      }

      // Filter dead texts
      for (let i = texts.length - 1; i >= 0; i--) {
        if (texts[i].life <= 0) {
          texts.splice(i, 1);
        }
      }

      // Filter dead rings
      for (let i = rings.length - 1; i >= 0; i--) {
        if (rings[i].life <= 0) {
          rings.splice(i, 1);
        }
      }
    },

    draw: function(ctx) {
      // Draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.save();
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.restore();
      }

      // Draw text
      for (let i = 0; i < texts.length; i++) {
        const t = texts[i];
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
      for (let i = 0; i < rings.length; i++) {
        const r = rings[i];
        ctx.save();
        ctx.globalAlpha = r.life / 0.35;
        ctx.strokeStyle = '#FF8C1A';
        ctx.lineWidth = 6;
        const displayRadius = r.radius * (1 - r.life / 0.35);
        ctx.beginPath();
        ctx.arc(r.x, r.y, displayRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  };
})();
