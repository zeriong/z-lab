/**
 * Canvas 2D renderer. Purely a view over Physics's current body state —
 * holds no gameplay logic. Debris particles are cosmetic only and use
 * the seeded RNG so their spread is reproducible run-to-run (A3).
 */
window.Render = (function () {
  let ctx = null;
  let particles = [];

  function init(canvasEl) {
    ctx = canvasEl.getContext('2d');
  }

  function spawnDebris(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = window.RNG.range(0, Math.PI * 2);
      const speed = window.RNG.range(1.5, 5.5);
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: window.RNG.range(3, 7),
        color,
        life: 1,
        rot: window.RNG.range(0, Math.PI * 2),
        vrot: window.RNG.range(-0.2, 0.2)
      });
    }
  }

  function updateParticles() {
    const G = window.GAME_CONSTANTS;
    particles = particles.filter((p) => p.life > 0);
    for (const p of particles) {
      p.vy += 0.25;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      if (p.y > G.GROUND_Y) { p.vy *= -0.3; p.y = G.GROUND_Y; }
      p.life -= 0.02;
    }
  }

  function drawBackground() {
    const G = window.GAME_CONSTANTS;
    const grd = ctx.createLinearGradient(0, 0, 0, G.CANVAS_H);
    grd.addColorStop(0, '#8fe0ff');
    grd.addColorStop(1, '#d9f4ff');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, G.CANVAS_W, G.CANVAS_H);

    // sun
    ctx.fillStyle = 'rgba(255,244,180,0.9)';
    ctx.beginPath(); ctx.arc(860, 70, 40, 0, Math.PI * 2); ctx.fill();

    // clouds
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    drawCloud(140, 90); drawCloud(400, 60); drawCloud(650, 110);
  }

  function drawCloud(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.arc(x + 20, y - 8, 22, 0, Math.PI * 2);
    ctx.arc(x + 42, y, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGround() {
    const G = window.GAME_CONSTANTS;
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(0, G.GROUND_Y, G.CANVAS_W, G.CANVAS_H - G.GROUND_Y);
    ctx.fillStyle = '#4c9a3a';
    ctx.fillRect(0, G.GROUND_Y, G.CANVAS_W, 10);
  }

  function drawSlingshot(birdPos) {
    const G = window.GAME_CONSTANTS;
    const pivot = { x: G.SLING_X, y: G.SLING_Y };
    const anchorL = { x: pivot.x - 18, y: pivot.y + 60 };
    const anchorR = { x: pivot.x + 18, y: pivot.y + 60 };
    const bird = birdPos || pivot;

    ctx.strokeStyle = '#6b4423';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';

    // back band (behind bird)
    ctx.beginPath();
    ctx.moveTo(anchorL.x, anchorL.y);
    ctx.lineTo(bird.x, bird.y);
    ctx.strokeStyle = '#3b2a1a';
    ctx.lineWidth = 5;
    ctx.stroke();

    // posts
    ctx.strokeStyle = '#6b4423';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(anchorL.x, anchorL.y + 40);
    ctx.lineTo(anchorL.x, anchorL.y);
    ctx.moveTo(anchorR.x, anchorR.y + 40);
    ctx.lineTo(anchorR.x, anchorR.y);
    ctx.stroke();

    // front band (in front of bird)
    ctx.beginPath();
    ctx.moveTo(anchorR.x, anchorR.y);
    ctx.lineTo(bird.x, bird.y);
    ctx.strokeStyle = '#3b2a1a';
    ctx.lineWidth = 5;
    ctx.stroke();
  }

  function drawBlock(body) {
    const { min, max } = body.bounds;
    const w = body.plugin.w, h = body.plugin.h;
    const mat = window.Physics.MATERIALS[body.plugin.material];
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.fillStyle = mat.color;
    ctx.strokeStyle = mat.stroke;
    ctx.lineWidth = 2;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    const dmgRatio = body.plugin.hp / body.plugin.maxHp;
    if (dmgRatio < 0.5) {
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 3, -h / 2 + 3); ctx.lineTo(w / 2 - 4, h / 2 - 5);
      ctx.moveTo(w / 2 - 3, -h / 2 + 4); ctx.lineTo(-w / 4, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPig(body) {
    const r = body.plugin.r;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.fillStyle = '#6fbf4a';
    ctx.strokeStyle = '#3f7a2a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // snout
    ctx.fillStyle = '#9ee27a';
    ctx.beginPath(); ctx.ellipse(0, r * 0.25, r * 0.45, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3f7a2a';
    ctx.beginPath(); ctx.arc(-r * 0.2, r * 0.25, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.2, r * 0.25, 1.6, 0, Math.PI * 2); ctx.fill();
    // eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.2, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.2, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.2, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.2, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawBird(body) {
    const r = body.plugin.r;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.fillStyle = '#d9382b';
    ctx.strokeStyle = '#7a1d10';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // eyebrows (angry)
    ctx.strokeStyle = '#3a0f08';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.35); ctx.lineTo(-r * 0.05, -r * 0.15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * 0.5, -r * 0.35); ctx.lineTo(r * 0.05, -r * 0.15); ctx.stroke();
    // beak
    ctx.fillStyle = '#f2a53c';
    ctx.beginPath(); ctx.moveTo(-r * 0.3, r * 0.1); ctx.lineTo(r * 0.3, r * 0.1); ctx.lineTo(0, r * 0.5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawTrajectory(points) {
    if (!points || points.length === 0) return;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    points.forEach((p, i) => {
      const alpha = 1 - i / points.length;
      ctx.globalAlpha = Math.max(0.15, alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function frame() {
    updateParticles();
    const G = window.GAME_CONSTANTS;
    ctx.clearRect(0, 0, G.CANVAS_W, G.CANVAS_H);
    drawBackground();
    drawGround();

    const bird = window.Physics.bird;
    drawSlingshot(bird ? bird.position : null);

    for (const b of window.Physics.blocks) drawBlock(b);
    for (const p of window.Physics.pigs) drawPig(p);
    for (const sb of window.Physics.spentBirds) drawBird(sb);
    if (bird) drawBird(bird);

    if (window.Slingshot.isDragging()) drawTrajectory(window.Slingshot.trajectoryPoints);
    drawParticles();
  }

  return { init, frame, spawnDebris };
})();
