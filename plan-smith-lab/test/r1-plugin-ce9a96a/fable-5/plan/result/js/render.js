// Canvas 2D 직접 렌더 (Matter.Render 미사용).
// 매 프레임 body들의 position/angle을 읽어 도형+그라디언트로 그린다.

import { VW, VH, GROUND_TOP, SLING } from './constants.js';
import { MATERIALS } from './game/entities.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  draw(stage, slingshot) {
    const ctx = this.ctx;
    this.drawBackground(ctx);

    if (stage.def) {
      this.drawSlingshotBack(ctx);
      this.drawBands(ctx, stage, slingshot, true);
      this.drawBlocks(ctx, stage);
      this.drawPigs(ctx, stage);
      this.drawPlatforms(ctx, stage);
      this.drawBird(ctx, stage);
      this.drawBands(ctx, stage, slingshot, false);
      this.drawSlingshotFront(ctx);
      this.drawTrajectory(ctx, slingshot);
      this.drawParticles(ctx, stage);
      this.drawWaitingBirds(ctx, stage);
    }
  }

  // ---------- 배경 ----------

  drawBackground(ctx) {
    // 하늘
    const sky = ctx.createLinearGradient(0, 0, 0, VH);
    sky.addColorStop(0, '#7ec8f0');
    sky.addColorStop(0.75, '#cdeefb');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VW, VH);

    // 해
    ctx.fillStyle = 'rgba(255, 236, 150, 0.9)';
    ctx.beginPath();
    ctx.arc(1160, 90, 46, 0, Math.PI * 2);
    ctx.fill();

    // 구름
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [cx, cy, s] of [[240, 110, 1], [640, 70, 0.8], [980, 150, 0.65]]) {
      ctx.beginPath();
      ctx.arc(cx, cy, 26 * s, 0, Math.PI * 2);
      ctx.arc(cx + 28 * s, cy - 8 * s, 20 * s, 0, Math.PI * 2);
      ctx.arc(cx + 54 * s, cy, 24 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    // 먼 언덕
    ctx.fillStyle = '#a8d68a';
    ctx.beginPath();
    ctx.ellipse(300, GROUND_TOP + 10, 380, 90, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#94c877';
    ctx.beginPath();
    ctx.ellipse(1000, GROUND_TOP + 14, 420, 70, 0, Math.PI, 0);
    ctx.fill();

    // 지면 (흙 + 잔디)
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(0, GROUND_TOP, VW, VH - GROUND_TOP);
    ctx.fillStyle = '#5cab3c';
    ctx.fillRect(0, GROUND_TOP, VW, 14);
  }

  // ---------- 슬링샷 ----------

  drawSlingshotBack(ctx) {
    ctx.strokeStyle = '#6b4423';
    ctx.lineCap = 'round';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(SLING.x + 14, GROUND_TOP);
    ctx.quadraticCurveTo(SLING.x + 20, SLING.y + 40, SLING.x + 16, SLING.y - 8);
    ctx.stroke();
  }

  drawSlingshotFront(ctx) {
    ctx.strokeStyle = '#7d5330';
    ctx.lineCap = 'round';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(SLING.x - 6, GROUND_TOP);
    ctx.lineTo(SLING.x - 4, SLING.y + 60);
    ctx.stroke();
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(SLING.x - 4, SLING.y + 60);
    ctx.quadraticCurveTo(SLING.x - 22, SLING.y + 30, SLING.x - 16, SLING.y - 8);
    ctx.stroke();
  }

  drawBands(ctx, stage, slingshot, back) {
    if (!slingshot.dragging || !stage.currentBird) return;
    const b = stage.currentBird.position;
    ctx.strokeStyle = back ? '#3d2413' : '#54331c';
    ctx.lineWidth = back ? 7 : 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (back) {
      ctx.moveTo(SLING.x + 16, SLING.y - 8);
    } else {
      ctx.moveTo(SLING.x - 16, SLING.y - 8);
    }
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  drawTrajectory(ctx, slingshot) {
    if (!slingshot.dragging) return;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    let r = 5;
    for (const p of slingshot.trajectory) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1.6, r), 0, Math.PI * 2);
      ctx.fill();
      r -= 0.22;
    }
  }

  // ---------- 엔티티 ----------

  drawPlatforms(ctx, stage) {
    for (const p of stage.def.platforms || []) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = '#7d5330';
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.fillStyle = '#5cab3c';
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, 6);
      ctx.restore();
    }
  }

  drawBlocks(ctx, stage) {
    for (const body of stage.blocks) {
      const ab = body.plugin.ab;
      const m = MATERIALS[ab.material];
      ctx.save();
      ctx.translate(body.position.x, body.position.y);
      ctx.rotate(body.angle);

      ctx.fillStyle = m.color;
      ctx.fillRect(-ab.w / 2, -ab.h / 2, ab.w, ab.h);
      ctx.strokeStyle = m.edge;
      ctx.lineWidth = 3;
      ctx.strokeRect(-ab.w / 2 + 1.5, -ab.h / 2 + 1.5, ab.w - 3, ab.h - 3);

      // 하이라이트
      ctx.fillStyle = m.shine;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(-ab.w / 2 + 4, -ab.h / 2 + 4, ab.w - 8, Math.max(3, ab.h * 0.18));
      ctx.globalAlpha = 1;

      // 손상도 표시 (어두워짐)
      const dmgRatio = 1 - ab.hp / ab.maxHp;
      if (dmgRatio > 0.05) {
        ctx.fillStyle = `rgba(0,0,0,${(dmgRatio * 0.45).toFixed(3)})`;
        ctx.fillRect(-ab.w / 2, -ab.h / 2, ab.w, ab.h);
      }
      ctx.restore();
    }
  }

  drawPigs(ctx, stage) {
    for (const body of stage.pigs) {
      const { r } = body.plugin.ab;
      const { x, y } = body.position;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(body.angle);

      // 몸통
      ctx.fillStyle = '#67c04d';
      ctx.strokeStyle = '#3f7a2e';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 귀
      ctx.fillStyle = '#58a83f';
      ctx.beginPath();
      ctx.arc(-r * 0.5, -r * 0.85, r * 0.28, 0, Math.PI * 2);
      ctx.arc(r * 0.5, -r * 0.85, r * 0.28, 0, Math.PI * 2);
      ctx.fill();

      // 눈
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-r * 0.42, -r * 0.25, r * 0.24, 0, Math.PI * 2);
      ctx.arc(r * 0.42, -r * 0.25, r * 0.24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(-r * 0.38, -r * 0.25, r * 0.1, 0, Math.PI * 2);
      ctx.arc(r * 0.46, -r * 0.25, r * 0.1, 0, Math.PI * 2);
      ctx.fill();

      // 코
      ctx.fillStyle = '#8fd97a';
      ctx.strokeStyle = '#3f7a2e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, r * 0.15, r * 0.42, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#3f7a2e';
      ctx.beginPath();
      ctx.arc(-r * 0.15, r * 0.15, r * 0.07, 0, Math.PI * 2);
      ctx.arc(r * 0.15, r * 0.15, r * 0.07, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  drawBird(ctx, stage) {
    const bird = stage.currentBird;
    if (!bird) return;
    this.drawBirdShape(ctx, bird.position.x, bird.position.y, bird.plugin.ab.r, bird.angle);
  }

  /** 대기 중인 새들을 슬링샷 왼쪽 바닥에 표시. */
  drawWaitingBirds(ctx, stage) {
    const n = stage.birdQueue.length;
    for (let i = 0; i < n; i++) {
      this.drawBirdShape(ctx, 110 - i * 44, GROUND_TOP - 16, 16, 0);
    }
  }

  drawBirdShape(ctx, x, y, r, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // 몸통
    ctx.fillStyle = '#d64541';
    ctx.strokeStyle = '#8f2b28';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 배
    ctx.fillStyle = '#f2d8b0';
    ctx.beginPath();
    ctx.arc(0, r * 0.45, r * 0.55, 0, Math.PI);
    ctx.fill();

    // 눈썹
    ctx.fillStyle = '#3a1c1a';
    ctx.fillRect(-r * 0.75, -r * 0.55, r * 0.65, r * 0.22);
    ctx.fillRect(r * 0.1, -r * 0.55, r * 0.65, r * 0.22);

    // 눈
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.2, r * 0.26, 0, Math.PI * 2);
    ctx.arc(r * 0.35, -r * 0.2, r * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-r * 0.28, -r * 0.2, r * 0.11, 0, Math.PI * 2);
    ctx.arc(r * 0.42, -r * 0.2, r * 0.11, 0, Math.PI * 2);
    ctx.fill();

    // 부리
    ctx.fillStyle = '#f5a623';
    ctx.strokeStyle = '#c47d0e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(r * 0.15, r * 0.05);
    ctx.lineTo(r * 1.05, r * 0.22);
    ctx.lineTo(r * 0.15, r * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  drawParticles(ctx, stage) {
    for (const p of stage.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}
