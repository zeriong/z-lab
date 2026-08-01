import type { Camera } from '../core/Camera';
import { PERF } from '../data/materials';
import type { StageRunner } from '../game/StageRunner';
import type { ParticleSystem } from './ParticleSystem';

/**
 * Canvas 2D 렌더러 (플랜 §1).
 * Matter.Render는 쓰지 않는다 — 카메라/스프라이트/파티클 확장을 막기 때문.
 * 자산이 없으므로 도형 + 단색 팔레트로 그린다 (R5).
 */
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private cssW = 0;
  private cssH = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: Camera,
    private readonly particles: ParticleSystem,
  ) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D 컨텍스트를 만들 수 없습니다');
    this.ctx = ctx;
    this.resize();
  }

  /** DPR 캡 2 (플랜 R4) */
  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(PERF.dprCap, window.devicePixelRatio || 1);
    if (w === this.cssW && h === this.cssH && dpr === this.dpr) return;
    this.cssW = w;
    this.cssH = h;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.camera.setViewport(w, h);
  }

  draw(runner: StageRunner | null): void {
    this.resize();
    const ctx = this.ctx;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawSky(ctx);

    if (!runner) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      return;
    }

    this.camera.applyTransform(ctx, this.dpr);

    this.drawGround(ctx, runner);
    this.drawSlingshot(ctx, runner);
    this.drawTrajectory(ctx, runner);
    this.drawBlocks(ctx, runner);
    this.drawPigs(ctx, runner);
    this.drawBirds(ctx, runner);
    this.particles.draw(ctx);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawSky(ctx: CanvasRenderingContext2D): void {
    const g = ctx.createLinearGradient(0, 0, 0, this.cssH);
    g.addColorStop(0, '#89c6ea');
    g.addColorStop(0.62, '#cfe8f5');
    g.addColorStop(1, '#e8f1d9');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.cssW, this.cssH);
  }

  private drawGround(ctx: CanvasRenderingContext2D, runner: StageRunner): void {
    const y = runner.stage.ground.y;
    const left = this.camera.x - this.camera.viewWidth;
    const width = this.camera.viewWidth * 3;

    ctx.fillStyle = '#6ba644';
    ctx.fillRect(left, y, width, 40);
    ctx.fillStyle = '#8a6b3f';
    ctx.fillRect(left, y + 40, width, 900);

    // 지면 결
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left, y + 40);
    ctx.lineTo(left + width, y + 40);
    ctx.stroke();
  }

  private drawSlingshot(ctx: CanvasRenderingContext2D, runner: StageRunner): void {
    const a = runner.slingshot.anchor;
    const groundY = runner.stage.ground.y;

    // 기둥
    ctx.strokeStyle = '#6b4526';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, groundY);
    ctx.lineTo(a.x, a.y + 26);
    ctx.stroke();

    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y + 26);
    ctx.lineTo(a.x - 20, a.y - 14);
    ctx.moveTo(a.x, a.y + 26);
    ctx.lineTo(a.x + 20, a.y - 14);
    ctx.stroke();

    // 고무줄: 조준 중이면 새 위치까지
    const bird = runner.activeBird;
    if (bird && runner.phase === 'aiming') {
      const bp = runner.slingshot.pulling ? runner.slingshot.birdPos : a;
      ctx.strokeStyle = '#3b2b1c';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(a.x - 20, a.y - 14);
      ctx.lineTo(bp.x, bp.y);
      ctx.lineTo(a.x + 20, a.y - 14);
      ctx.stroke();
    }
  }

  private drawTrajectory(ctx: CanvasRenderingContext2D, runner: StageRunner): void {
    const pts = runner.trajectoryPoints;
    if (pts.length === 0) return;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < pts.length; i++) {
      const r = 4 - (i / pts.length) * 1.6;
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, Math.max(1.6, r), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawBlocks(ctx: CanvasRenderingContext2D, runner: StageRunner): void {
    for (const b of runner.blocks) {
      if (!b.alive || !runner.world.has(b.ref)) continue;
      const p = runner.world.position(b.ref);
      const ang = runner.world.angle(b.ref);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);
      ctx.fillStyle = b.def.fill;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.strokeStyle = b.def.stroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);

      // 손상 표시: 체력이 낮을수록 어둡게 + 균열선
      const dmg = 1 - b.healthRatio;
      if (dmg > 0.05) {
        ctx.fillStyle = `rgba(0,0,0,${(dmg * 0.35).toFixed(3)})`;
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      }
      if (dmg > 0.4) {
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-b.w / 2, -b.h / 6);
        ctx.lineTo(0, b.h / 8);
        ctx.lineTo(b.w / 2, -b.h / 5);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawPigs(ctx: CanvasRenderingContext2D, runner: StageRunner): void {
    for (const pig of runner.pigs) {
      if (!pig.alive || !runner.world.has(pig.ref)) continue;
      const p = runner.world.position(pig.ref);
      const ang = runner.world.angle(pig.ref);
      const r = pig.r;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);

      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = pig.def.fill;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = pig.def.stroke;
      ctx.stroke();

      // 눈
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-r * 0.32, -r * 0.28, r * 0.2, 0, Math.PI * 2);
      ctx.arc(r * 0.32, -r * 0.28, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1d2b1a';
      ctx.beginPath();
      ctx.arc(-r * 0.28, -r * 0.26, r * 0.08, 0, Math.PI * 2);
      ctx.arc(r * 0.36, -r * 0.26, r * 0.08, 0, Math.PI * 2);
      ctx.fill();

      // 코
      ctx.fillStyle = '#5f9a52';
      ctx.beginPath();
      ctx.ellipse(0, r * 0.22, r * 0.34, r * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();

      // 피해 표시
      const dmg = 1 - pig.healthRatio;
      if (dmg > 0.15) {
        ctx.strokeStyle = `rgba(120,20,20,${(dmg * 0.8).toFixed(2)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.9, 0.4, 1.4);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawBirds(ctx: CanvasRenderingContext2D, runner: StageRunner): void {
    // 대기 중인 새들: 슬링샷 뒤쪽에 줄지어 앉는다
    const anchor = runner.slingshot.anchor;
    const groundY = runner.stage.ground.y;
    const queue = runner.birds.filter((b) => !b.launched);
    const active = runner.activeBird;

    for (let i = 0; i < queue.length; i++) {
      const bird = queue[i];
      if (bird === active) continue;
      const x = anchor.x - 70 - i * 46;
      this.drawBird(ctx, x, groundY - bird.r, bird.r, 0);
    }

    // 조준 중인 새
    if (active && runner.phase === 'aiming') {
      const p = runner.slingshot.birdPos;
      this.drawBird(ctx, p.x, p.y, active.r, 0);
    }

    // 날아가는 새들
    for (const bird of runner.birds) {
      if (!bird.launched || !bird.ref || !runner.world.has(bird.ref)) continue;
      const p = runner.world.position(bird.ref);
      this.drawBird(ctx, p.x, p.y, bird.r, runner.world.angle(bird.ref));
    }
  }

  private drawBird(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    angle: number,
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = '#e2564a';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#94271f';
    ctx.stroke();

    // 배
    ctx.beginPath();
    ctx.ellipse(0, r * 0.3, r * 0.5, r * 0.36, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f5d6a8';
    ctx.fill();

    // 눈
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.3, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.36, -r * 0.3, r * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = '#26160f';
    ctx.fill();

    // 부리
    ctx.beginPath();
    ctx.moveTo(r * 0.75, -r * 0.05);
    ctx.lineTo(r * 1.35, r * 0.12);
    ctx.lineTo(r * 0.75, r * 0.34);
    ctx.closePath();
    ctx.fillStyle = '#f2a52c';
    ctx.fill();

    ctx.restore();
  }
}
