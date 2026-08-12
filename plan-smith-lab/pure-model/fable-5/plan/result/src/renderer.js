// 자체 Canvas 렌더러 — Matter 내장 Render 미사용 (§1.1, §1.2).
// 월드(하늘/지면/슬링샷/바디) + 궤적 점선 + 파편 파티클. HUD/오버레이는 DOM 담당 (§1.2).

import { WIDTH, HEIGHT, GROUND_TOP } from './physics.js';
import { MATERIALS, PIG_SPEC } from './entities.js';

const { Composite } = window.Matter;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  // game이 null이면 배경만 그린다(MAIN — 실제로는 오버레이가 덮는다).
  draw(game) {
    const ctx = this.ctx;
    this.drawBackground(ctx);
    if (!game) return;

    this.drawSlingPost(ctx, game.slingshot.anchor);
    for (const body of Composite.allBodies(game.engine.world)) {
      this.drawBody(ctx, body);
    }
    this.drawSlingBand(ctx, game.slingshot);
    this.drawTrajectory(ctx, game.slingshot.getTrajectory());
    this.drawParticles(ctx, game.particles);
  }

  // ---------- 배경 ----------

  drawBackground(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_TOP);
    sky.addColorStop(0, '#4ea8de');
    sky.addColorStop(1, '#cfeffd');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, GROUND_TOP);

    // 지면: 흙 + 잔디 띠
    ctx.fillStyle = '#8d6e4a';
    ctx.fillRect(0, GROUND_TOP, WIDTH, HEIGHT - GROUND_TOP);
    ctx.fillStyle = '#7cb342';
    ctx.fillRect(0, GROUND_TOP, WIDTH, 12);
  }

  // ---------- 바디 ----------

  drawBody(ctx, body) {
    const data = body.gameData || {};
    switch (data.kind) {
      case 'bird':
        this.drawBird(ctx, body);
        break;
      case 'pig':
        this.drawPig(ctx, body);
        break;
      case 'block':
        this.drawBlock(ctx, body, data);
        break;
      case 'static':
        this.drawStatic(ctx, body, data);
        break;
      default:
        // ground는 drawBackground가 담당
        break;
    }
  }

  drawBlock(ctx, body, data) {
    const spec = MATERIALS[data.material];
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.fillStyle = spec.color;
    ctx.strokeStyle = spec.edge;
    ctx.lineWidth = 2;
    ctx.fillRect(-data.w / 2, -data.h / 2, data.w, data.h);
    ctx.strokeRect(-data.w / 2, -data.h / 2, data.w, data.h);
    // 손상 표시: HP가 깎이면 균열 선
    if (data.hp < data.maxHp) {
      ctx.strokeStyle = spec.edge;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-data.w * 0.3, -data.h * 0.35);
      ctx.lineTo(data.w * 0.1, 0);
      ctx.lineTo(-data.w * 0.15, data.h * 0.35);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawStatic(ctx, body, data) {
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.fillStyle = '#6d4c33';
    ctx.strokeStyle = '#4e3524';
    ctx.lineWidth = 2;
    ctx.fillRect(-data.w / 2, -data.h / 2, data.w, data.h);
    ctx.strokeRect(-data.w / 2, -data.h / 2, data.w, data.h);
    // 상단 잔디
    ctx.fillStyle = '#7cb342';
    ctx.fillRect(-data.w / 2, -data.h / 2, data.w, 8);
    ctx.restore();
  }

  drawBird(ctx, body) {
    const r = body.circleRadius;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    // 몸통
    ctx.fillStyle = '#e63946';
    ctx.strokeStyle = '#a4161a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 배
    ctx.fillStyle = '#f8d5c2';
    ctx.beginPath();
    ctx.arc(r * 0.1, r * 0.45, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    // 눈
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(r * 0.35, -r * 0.25, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(r * 0.45, -r * 0.25, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    // 부리
    ctx.fillStyle = '#f4a261';
    ctx.beginPath();
    ctx.moveTo(r * 0.85, -r * 0.05);
    ctx.lineTo(r * 1.35, r * 0.12);
    ctx.lineTo(r * 0.8, r * 0.35);
    ctx.closePath();
    ctx.fill();
    // 눈썹
    ctx.strokeStyle = '#5c0a0e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(r * 0.05, -r * 0.55);
    ctx.lineTo(r * 0.6, -r * 0.45);
    ctx.stroke();
    ctx.restore();
  }

  drawPig(ctx, body) {
    const r = body.circleRadius;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    // 귀
    ctx.fillStyle = PIG_SPEC.color;
    ctx.strokeStyle = PIG_SPEC.edge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-r * 0.55, -r * 0.85, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(r * 0.55, -r * 0.85, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 몸통
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 눈
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-r * 0.4, -r * 0.3, r * 0.2, 0, Math.PI * 2);
    ctx.arc(r * 0.4, -r * 0.3, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-r * 0.4, -r * 0.3, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.4, -r * 0.3, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    // 코
    ctx.fillStyle = '#5da532';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.15, r * 0.42, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#3f7a1e';
    ctx.beginPath();
    ctx.arc(-r * 0.15, r * 0.15, r * 0.07, 0, Math.PI * 2);
    ctx.arc(r * 0.15, r * 0.15, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---------- 슬링샷 ----------

  drawSlingPost(ctx, anchor) {
    ctx.strokeStyle = '#5d4037';
    ctx.lineCap = 'round';
    // 기둥
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(anchor.x, GROUND_TOP);
    ctx.lineTo(anchor.x, anchor.y + 14);
    ctx.stroke();
    // Y자 갈래
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y + 14);
    ctx.lineTo(anchor.x - 16, anchor.y - 14);
    ctx.moveTo(anchor.x, anchor.y + 14);
    ctx.lineTo(anchor.x + 16, anchor.y - 14);
    ctx.stroke();
  }

  drawSlingBand(ctx, sling) {
    if (!sling.bird || !sling.dragging) return;
    const b = sling.bird.position;
    const a = sling.anchor;
    ctx.strokeStyle = '#4e2a14';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x - 16, a.y - 14);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(a.x + 16, a.y - 14);
    ctx.stroke();
  }

  // ---------- 궤적 점선 (§3.3) ----------

  drawTrajectory(ctx, points) {
    if (!points.length) return;
    ctx.fillStyle = '#ffffff';
    points.forEach((p, i) => {
      const t = i / points.length;
      ctx.globalAlpha = 0.85 - t * 0.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5 - t * 2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  // ---------- 파편 파티클 ----------

  drawParticles(ctx, particles) {
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(p.life / 1000, 0);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }
  }
}
