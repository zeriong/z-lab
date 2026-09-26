/**
 * Canvas 2D 월드 렌더러 (§3.2, §8.2, §8.4).
 * 렌더 순서: 배경 → 지면 → 새총 뒤 가지 → 지형·블록·돼지 → 새 → 새총 앞 가지·고무줄
 *            → 이전 샷 흔적 → 예측 궤적 → 파티클. (HUD·오버레이는 DOM)
 * 캔버스 백버퍼 = CSS 크기 × DPR(최대 2). 논리 좌표는 항상 1280×720.
 */
import { WORLD_W } from '../core/config';
import type { Vec } from '../core/math';
import type { Entity } from '../entities/Entity';
import { BIRD } from '../physics/Materials';
import { drawBackground, drawGround } from './drawBackground';
import { drawBird } from './drawBird';
import { drawBlock, drawTerrain } from './drawBlock';
import { drawPig } from './drawPig';
import { drawSlingshotBack, drawSlingshotFront } from './drawSlingshot';
import type { Particles } from './Particles';

export interface RenderSnapshot {
  entities: Iterable<Entity>;
  /** 새총 위(ready/dragging) 새 위치. 고무줄의 끝점 */
  slingBird: Vec | null;
  trajectory: readonly Vec[];
  prevTrail: readonly Vec[];
  particles: Particles | null;
  debug: boolean;
}

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private cssW = WORLD_W;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly container: HTMLElement,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.resize();
  }

  /** 컨테이너 크기에 맞춰 백버퍼를 재설정한다. 리사이즈마다 호출. */
  resize(): void {
    const rect = this.container.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cssW = w;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
  }

  /** 논리 px → 실제 캔버스 px 배율 */
  get scale(): number {
    return (this.cssW * this.dpr) / WORLD_W;
  }

  render(snap: RenderSnapshot | null): void {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const s = this.scale;
    ctx.setTransform(s, 0, 0, s, 0, 0);

    drawBackground(ctx);
    drawGround(ctx);
    if (!snap) return;

    // 이터레이터는 한 번만 소비한다 (디버그 패스에서 재사용)
    const entities = Array.from(snap.entities).filter((e) => e.alive);

    drawSlingshotBack(ctx);

    const birds: Entity[] = [];
    for (const e of entities) {
      switch (e.kind) {
        case 'terrain':
          drawTerrain(ctx, e);
          break;
        case 'block':
          drawBlock(ctx, e);
          break;
        case 'pig':
          drawPig(ctx, e);
          break;
        case 'bird':
          birds.push(e);
          break;
        default:
          break;
      }
    }
    for (const b of birds) drawBird(ctx, b);

    drawSlingshotFront(ctx, snap.slingBird, BIRD.r);

    // 이전 샷 흔적
    if (snap.prevTrail.length > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < snap.prevTrail.length; i += 3) {
        const p = snap.prevTrail[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 예측 궤적: 멀어질수록 작고 옅게
    const n = snap.trajectory.length;
    for (let i = 0; i < n; i++) {
      const p = snap.trajectory[i];
      const t = i / Math.max(1, n - 1);
      ctx.fillStyle = `rgba(255,255,255,${0.9 - t * 0.7})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5 - t * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    snap.particles?.draw(ctx);

    if (snap.debug) this.drawDebug(entities);
  }

  private drawDebug(entities: readonly Entity[]): void {
    const ctx = this.ctx;
    ctx.lineWidth = 1;
    for (const e of entities) {
      const b = e.body;
      ctx.strokeStyle = b.isSleeping ? 'rgba(80,80,255,0.9)' : 'rgba(255,0,0,0.9)';
      const v = b.vertices;
      ctx.beginPath();
      ctx.moveTo(v[0].x, v[0].y);
      for (let i = 1; i < v.length; i++) ctx.lineTo(v[i].x, v[i].y);
      ctx.closePath();
      ctx.stroke();
      if (!b.isStatic && !b.isSleeping) {
        ctx.strokeStyle = 'rgba(255,255,0,0.9)';
        ctx.beginPath();
        ctx.moveTo(b.position.x, b.position.y);
        ctx.lineTo(b.position.x + b.velocity.x * 6, b.position.y + b.velocity.y * 6);
        ctx.stroke();
      }
      if (isFinite(e.maxHealth)) {
        ctx.fillStyle = '#000';
        ctx.font = '10px monospace';
        ctx.fillText(e.health.toFixed(1), b.position.x - 10, b.position.y + 3);
      }
    }
  }
}
