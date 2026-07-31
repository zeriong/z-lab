// Canvas 2D drawing only -- reads current Matter body positions each frame,
// never mutates simulation state. Kept separate from physics so render rate
// (rAF) and simulation rate (Engine.update) stay decoupled per the plan.

const MATERIAL_COLORS = {
  wood: '#b5651d',
  stone: '#8a8f96',
  glass: 'rgba(150, 220, 255, 0.55)',
};

const MATERIAL_STROKE = {
  wood: '#7a4413',
  stone: '#5f6368',
  glass: 'rgba(90, 170, 220, 0.9)',
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
  }

  clear() {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#8fd3ff');
    gradient.addColorStop(1, '#d9f4ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawGround(groundY) {
    const ctx = this.ctx;
    ctx.fillStyle = '#5b8c3a';
    ctx.fillRect(0, groundY, this.width, this.height - groundY);
    ctx.fillStyle = '#3f6b28';
    ctx.fillRect(0, groundY, this.width, 6);
  }

  drawSlingshot(anchor) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#6b4226';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(anchor.x - 16, anchor.y + 60);
    ctx.lineTo(anchor.x - 16, anchor.y - 30);
    ctx.moveTo(anchor.x + 16, anchor.y + 60);
    ctx.lineTo(anchor.x + 16, anchor.y - 30);
    ctx.stroke();
  }

  drawBands(anchor, birdPos) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#3d2a1a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(anchor.x - 16, anchor.y - 26);
    ctx.lineTo(birdPos.x, birdPos.y);
    ctx.lineTo(anchor.x + 16, anchor.y - 26);
    ctx.stroke();
  }

  drawTrajectory(points) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    points.forEach((p, i) => {
      const r = Math.max(2, 4 - i * 0.08);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawBlock(body) {
    const ctx = this.ctx;
    const { material, health, maxHealth } = body.gameData;
    const bounds = body.bounds;
    const w = bounds.max.x - bounds.min.x;
    const h = bounds.max.y - bounds.min.y;

    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.fillStyle = MATERIAL_COLORS[material] || '#999';
    ctx.strokeStyle = MATERIAL_STROKE[material] || '#555';
    ctx.lineWidth = 2;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    if (health < maxHealth * 0.6) {
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawPig(body) {
    const ctx = this.ctx;
    const r = body.circleRadius || 20;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.fillStyle = '#7bc043';
    ctx.strokeStyle = '#4f8a1f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.15, r * 0.28, 0, Math.PI * 2);
    ctx.arc(r * 0.35, -r * 0.15, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.15, r * 0.12, 0, Math.PI * 2);
    ctx.arc(r * 0.35, -r * 0.15, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawBird(body, color) {
    const ctx = this.ctx;
    const r = body.circleRadius || 18;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawPendingBird(pos, radius, color) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawParticles(particles) {
    const ctx = this.ctx;
    particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
}
