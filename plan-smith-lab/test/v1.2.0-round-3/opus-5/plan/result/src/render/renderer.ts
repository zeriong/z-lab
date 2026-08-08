/**
 * §12 렌더링. 레이어 순서는 고정이다.
 *  1 하늘 → 2 배경(패럴랙스 2겹) → 3 지형 → 4 블록/돼지 → 5 새·슬링샷 → 6 궤적 → 7 파티클 → (DOM) HUD
 */

import { Composite } from 'matter-js';
import type { Vector } from 'matter-js';
import type { GameWorld } from '../game/world';
import type { AimState } from '../game/slingshot';
import { getGame } from '../game/entities';
import { renderBody } from './shapes';
import type { ParticleSystem } from './particles';
import { LOGICAL_H, LOGICAL_W } from '../core/input';

export interface RenderInput {
  gw: GameWorld | null;
  cameraX: number;
  aim: AimState | null;
  trajectory: Vector[];
  particles: ParticleSystem;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D 컨텍스트를 만들 수 없다');
    this.ctx = ctx;
    this.applyDpr();
  }

  /** §1.5 DPR: canvas.width = 1280 * min(devicePixelRatio, 2) */
  applyDpr(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.canvas.width = Math.round(LOGICAL_W * dpr);
    this.canvas.height = Math.round(LOGICAL_H * dpr);
  }

  draw(input: RenderInput): void {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);

    this.drawSky(ctx);
    this.drawParallax(ctx, input.cameraX);

    const gw = input.gw;
    if (!gw) return;

    ctx.save();
    ctx.translate(-input.cameraX, 0);

    const minX = input.cameraX - 80;
    const maxX = input.cameraX + LOGICAL_W + 80;

    const bodies = Composite.allBodies(gw.engine.world);

    // 3 지형
    for (const b of bodies) {
      if (!b.isStatic) continue;
      if (b.bounds.max.x < minX || b.bounds.min.x > maxX) continue;
      renderBody(ctx, b);
    }

    // 4 블록 → 돼지
    for (const b of bodies) {
      const g = getGame(b);
      if (!g || g.kind !== 'block') continue;
      if (b.bounds.max.x < minX || b.bounds.min.x > maxX) continue;
      renderBody(ctx, b);
    }
    for (const b of bodies) {
      const g = getGame(b);
      if (!g || g.kind !== 'pig') continue;
      if (b.bounds.max.x < minX || b.bounds.min.x > maxX) continue;
      renderBody(ctx, b);
    }

    // 5 슬링샷 뒤쪽 기둥 → 새 → 앞쪽 고무줄
    this.drawSlingBack(ctx, gw, input.aim);
    if (gw.bird) renderBody(ctx, gw.bird);
    this.drawSlingFront(ctx, gw, input.aim);

    // 6 궤적 예측 점 (DRAGGING일 때만)
    this.drawTrajectory(ctx, input.trajectory);

    // 7 파티클
    input.particles.render(ctx);

    ctx.restore();
  }

  ctx2d(): CanvasRenderingContext2D {
    return this.ctx;
  }

  private drawSky(ctx: CanvasRenderingContext2D): void {
    const g = ctx.createLinearGradient(0, 0, 0, LOGICAL_H);
    g.addColorStop(0, '#5fa8dd');
    g.addColorStop(0.55, '#9fd0ec');
    g.addColorStop(1, '#dbeecd');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
  }

  /** 원경 0.2, 근경 0.6 (§11) */
  private drawParallax(ctx: CanvasRenderingContext2D, cameraX: number): void {
    ctx.save();
    ctx.translate(-cameraX * 0.2, 0);
    ctx.fillStyle = '#8fbf86';
    for (let i = -1; i < 8; i++) {
      const x = i * 420;
      ctx.beginPath();
      ctx.moveTo(x, 620);
      ctx.quadraticCurveTo(x + 210, 380, x + 420, 620);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(-cameraX * 0.6, 0);
    ctx.fillStyle = '#79ad6b';
    for (let i = -1; i < 10; i++) {
      const x = i * 320;
      ctx.beginPath();
      ctx.moveTo(x, 640);
      ctx.quadraticCurveTo(x + 160, 480, x + 320, 640);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private slingPoints(gw: GameWorld): { back: Vector; front: Vector; base: Vector } {
    const s = gw.stage.sling;
    return {
      base: { x: s.x, y: s.y + 130 },
      back: { x: s.x - 12, y: s.y },
      front: { x: s.x + 14, y: s.y + 6 },
    };
  }

  private drawSlingBack(
    ctx: CanvasRenderingContext2D,
    gw: GameWorld,
    aim: AimState | null,
  ): void {
    const { base, back } = this.slingPoints(gw);

    // Y자 기둥
    ctx.strokeStyle = '#6b4a2b';
    ctx.lineCap = 'round';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(base.x, back.y + 26);
    ctx.stroke();

    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(base.x, back.y + 26);
    ctx.lineTo(back.x, back.y);
    ctx.moveTo(base.x, back.y + 26);
    ctx.lineTo(base.x + 14, back.y + 6);
    ctx.stroke();

    // 뒤쪽 고무줄
    const target = aim && gw.bird ? gw.bird.position : { x: base.x + 2, y: back.y + 6 };
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(back.x, back.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
  }

  private drawSlingFront(
    ctx: CanvasRenderingContext2D,
    gw: GameWorld,
    aim: AimState | null,
  ): void {
    const { front } = this.slingPoints(gw);
    const target = aim && gw.bird ? gw.bird.position : { x: front.x - 12, y: front.y };
    ctx.strokeStyle = '#4a3421';
    ctx.lineCap = 'round';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(front.x, front.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
  }

  /** 반지름 3px 흰 원, 알파를 거리에 따라 0.9 → 0.25로 감쇠 (§5.2) */
  private drawTrajectory(ctx: CanvasRenderingContext2D, points: Vector[]): void {
    if (points.length === 0) return;
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const p = points[i]!;
      const t = n === 1 ? 0 : i / (n - 1);
      ctx.globalAlpha = 0.9 - t * 0.65;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
