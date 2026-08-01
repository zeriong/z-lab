// Canvas 2D 렌더러 (플랜 §전달 스택 — WebGL 기각). 에셋 없이 도형+파티클 (가정 A4 축소 경로).

import type { Game } from '../game/game';
import { GROUND_TOP, WORLD_W, WORLD_H, BIRD_R, MATERIAL_COLOR } from '../game/game';
import type { PhysBody } from '../physics/adapter';

const MATERIAL_STROKE: Record<string, string> = {
  wood: '#7a3f0e',
  glass: '#5aa8c9',
  stone: '#5a5a5a',
};

export class Renderer {
  constructor(private ctx: CanvasRenderingContext2D) {}

  /** 메인 화면 등 게임이 없을 때의 배경 */
  drawBackground(): void {
    const { ctx } = this;
    const sky = ctx.createLinearGradient(0, 0, 0, WORLD_H);
    sky.addColorStop(0, '#7ec8f0');
    sky.addColorStop(1, '#cfeefc');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    // 지면
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0, GROUND_TOP, WORLD_W, WORLD_H - GROUND_TOP);
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(0, GROUND_TOP, WORLD_W, 10);
  }

  draw(game: Game | null): void {
    this.drawBackground();
    if (!game) return;
    const { ctx } = this;

    this.drawSlingshotBack(game);

    // 블록
    for (const block of game.blocks) this.drawBlock(block);
    // 돼지
    for (const pig of game.pigs) this.drawPig(pig);

    // 궤적 예측 점선 (R2-c)
    const traj = game.trajectory();
    if (traj) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (const p of traj) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 새 (장전·비행 중)
    if (game.birdOnSling) this.drawBird(game.birdOnSling.position.x, game.birdOnSling.position.y);
    if (game.activeBird) this.drawBird(game.activeBird.position.x, game.activeBird.position.y);

    // 대기 중인 새들 (R2-g 시각 표기)
    for (let i = 0; i < game.birdsQueued; i++) {
      this.drawBird(game.anchor.x - 60 - i * 36, GROUND_TOP - BIRD_R);
    }

    this.drawSlingshotFront(game);

    game.particles.draw(ctx);
  }

  // ── 슬링샷: 새 뒤 기둥 + 새 앞 고무줄 ──

  private drawSlingshotBack(game: Game): void {
    const { ctx } = this;
    const a = game.anchor;
    ctx.strokeStyle = '#5d3a1a';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    // Y자 기둥
    ctx.beginPath();
    ctx.moveTo(a.x, GROUND_TOP);
    ctx.lineTo(a.x, a.y + 20);
    ctx.moveTo(a.x, a.y + 20);
    ctx.lineTo(a.x - 14, a.y - 8);
    ctx.moveTo(a.x, a.y + 20);
    ctx.lineTo(a.x + 14, a.y - 8);
    ctx.stroke();

    // 뒤쪽 고무줄
    if (game.birdOnSling) {
      const b = game.birdOnSling.position;
      ctx.strokeStyle = '#3e2712';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(a.x + 14, a.y - 8);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  private drawSlingshotFront(game: Game): void {
    if (!game.birdOnSling) return;
    const { ctx } = this;
    const a = game.anchor;
    const b = game.birdOnSling.position;
    ctx.strokeStyle = '#2b1a0c';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(a.x - 14, a.y - 8);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // ── 개체 ──

  private drawBlock(block: PhysBody): void {
    const { ctx } = this;
    const m = block.meta;
    const w = m.w ?? 20;
    const h = m.h ?? 20;
    const mat = m.material ?? 'wood';
    ctx.save();
    ctx.translate(block.position.x, block.position.y);
    ctx.rotate(block.angle);
    ctx.globalAlpha = mat === 'glass' ? 0.75 : 1;
    ctx.fillStyle = MATERIAL_COLOR[mat];
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = MATERIAL_STROKE[mat];
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2, -h / 2, w, h);

    // 내구도 60% 미만이면 균열 표시
    const ratio = m.maxHp ? (m.hp ?? 0) / m.maxHp : 1;
    if (ratio < 0.6) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-w / 4, -h / 2);
      ctx.lineTo(0, 0);
      ctx.lineTo(-w / 6, h / 2);
      ctx.moveTo(0, 0);
      ctx.lineTo(w / 3, h / 6);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawPig(pig: PhysBody): void {
    const { ctx } = this;
    const r = pig.meta.r ?? 18;
    const { x, y } = pig.position;
    ctx.fillStyle = '#5cb85c';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3d8b3d';
    ctx.lineWidth = 2;
    ctx.stroke();
    // 코
    ctx.fillStyle = '#4a9e4a';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.15, r * 0.38, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2d6e2d';
    ctx.beginPath();
    ctx.arc(x - r * 0.14, y + r * 0.15, r * 0.07, 0, Math.PI * 2);
    ctx.arc(x + r * 0.14, y + r * 0.15, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
    // 눈
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - r * 0.4, y - r * 0.35, r * 0.2, 0, Math.PI * 2);
    ctx.arc(x + r * 0.4, y - r * 0.35, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(x - r * 0.36, y - r * 0.35, r * 0.09, 0, Math.PI * 2);
    ctx.arc(x + r * 0.44, y - r * 0.35, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawBird(x: number, y: number): void {
    const { ctx } = this;
    const r = BIRD_R;
    ctx.fillStyle = '#d9342b';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8f1f1a';
    ctx.lineWidth = 2;
    ctx.stroke();
    // 부리
    ctx.fillStyle = '#f5a623';
    ctx.beginPath();
    ctx.moveTo(x + r * 0.7, y - r * 0.1);
    ctx.lineTo(x + r * 1.5, y + r * 0.1);
    ctx.lineTo(x + r * 0.7, y + r * 0.35);
    ctx.closePath();
    ctx.fill();
    // 눈
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + r * 0.3, y - r * 0.35, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(x + r * 0.38, y - r * 0.35, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
  }
}
