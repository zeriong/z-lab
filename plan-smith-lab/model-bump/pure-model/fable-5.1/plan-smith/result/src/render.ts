// Canvas 2D 렌더. 도형/색상만 사용(원작 스프라이트 없음, §4 가정 4). 카메라·흔들림 오프셋 적용.
import Matter from 'matter-js';
import type { Effects } from './effects';
import type { DragState } from './input';
import { getMeta, predictTrajectory, type MBody, type StageWorld } from './physics';
import type { GameState } from './state';
import { BIRD, MATERIAL, SLINGSHOT, TUNING, VIEW, WORLD } from './types';

const { Composite } = Matter;

export interface RenderFrame {
  world: StageWorld | null;
  cameraX: number;
  drag: DragState;
  effects: Effects;
  state: GameState;
}

const SKY_TOP = '#7ec8ff';
const SKY_BOTTOM = '#dff3ff';
const GROUND = '#6b4a2a';
const GRASS = '#5fbf4a';
const WOOD_POST = '#5a3a1c';
const BAND = '#3b2a1a';

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly getDpr: () => number,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    this.ctx = ctx;
  }

  render(frame: RenderFrame): void {
    const ctx = this.ctx;
    const dpr = this.getDpr();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, VIEW.w, VIEW.h);

    this.drawSky(frame.cameraX);

    const shake = frame.effects.shakeOffset;
    ctx.save();
    ctx.translate(-frame.cameraX + shake.x, shake.y);

    this.drawGround();
    this.drawSlingshotBack();

    if (frame.world) {
      const world = frame.world;
      if (frame.drag.active && world.currentBird) this.drawBandBack(world.currentBird);
      this.drawBodies(world);
      if (frame.drag.active && Math.hypot(frame.drag.vector.x, frame.drag.vector.y) > TUNING.minPull) {
        this.drawTrajectory(world, frame.drag);
      }
      if (frame.drag.active && world.currentBird) this.drawBandFront(world.currentBird);
    }

    this.drawSlingshotFront();
    this.drawParticles(frame.effects);
    ctx.restore();
  }

  private drawSky(cameraX: number): void {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, VIEW.h);
    g.addColorStop(0, SKY_TOP);
    g.addColorStop(1, SKY_BOTTOM);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);

    // 원경 언덕(패럴랙스 0.3)
    ctx.fillStyle = '#a7dba0';
    const px = -cameraX * 0.3;
    for (let i = -1; i < 6; i++) {
      const cx = px + i * 700 + 300;
      ctx.beginPath();
      ctx.ellipse(cx, WORLD.groundY + 40, 520, 220, 0, Math.PI, 0);
      ctx.fill();
    }
    // 구름(패럴랙스 0.15)
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    const cx0 = -cameraX * 0.15;
    for (let i = -1; i < 5; i++) {
      const x = cx0 + i * 620 + 200;
      const y = 140 + (i % 2) * 90;
      ctx.beginPath();
      ctx.arc(x, y, 46, 0, Math.PI * 2);
      ctx.arc(x + 50, y - 22, 58, 0, Math.PI * 2);
      ctx.arc(x + 110, y, 44, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawGround(): void {
    const ctx = this.ctx;
    ctx.fillStyle = GROUND;
    ctx.fillRect(-WORLD.wallThickness, WORLD.groundY, WORLD.w + WORLD.wallThickness * 2, VIEW.h - WORLD.groundY + 200);
    ctx.fillStyle = GRASS;
    ctx.fillRect(-WORLD.wallThickness, WORLD.groundY - 6, WORLD.w + WORLD.wallThickness * 2, 18);
  }

  private drawSlingshotBack(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = WOOD_POST;
    ctx.lineCap = 'round';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(SLINGSHOT.x, WORLD.groundY);
    ctx.lineTo(SLINGSHOT.x, SLINGSHOT.y + 60);
    ctx.lineTo(SLINGSHOT.x + SLINGSHOT.forkHalf, SLINGSHOT.y - 10);
    ctx.stroke();
  }

  private drawSlingshotFront(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = '#7a4f26';
    ctx.lineCap = 'round';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(SLINGSHOT.x, SLINGSHOT.y + 60);
    ctx.lineTo(SLINGSHOT.x - SLINGSHOT.forkHalf, SLINGSHOT.y - 10);
    ctx.stroke();
  }

  private drawBandBack(bird: MBody): void {
    const ctx = this.ctx;
    ctx.strokeStyle = BAND;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(SLINGSHOT.x + SLINGSHOT.forkHalf, SLINGSHOT.y - 10);
    ctx.lineTo(bird.position.x, bird.position.y);
    ctx.stroke();
  }

  private drawBandFront(bird: MBody): void {
    const ctx = this.ctx;
    ctx.strokeStyle = BAND;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(SLINGSHOT.x - SLINGSHOT.forkHalf, SLINGSHOT.y - 10);
    ctx.lineTo(bird.position.x, bird.position.y);
    ctx.stroke();
  }

  private drawBodies(world: StageWorld): void {
    for (const body of Composite.allBodies(world.engine.world)) {
      const meta = getMeta(body);
      if (!meta) continue;
      switch (meta.kind) {
        case 'block':
          this.drawBlock(body, meta.material ?? 'wood', meta.hp / meta.maxHp);
          break;
        case 'pig':
          this.drawPig(body, meta.hp / meta.maxHp);
          break;
        case 'bird':
          this.drawBird(body);
          break;
        default:
          break;
      }
    }
  }

  private drawBlock(body: MBody, material: keyof typeof MATERIAL, hpRatio: number): void {
    const ctx = this.ctx;
    const spec = MATERIAL[material];
    const v = body.vertices;
    if (v.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(v[0]!.x, v[0]!.y);
    for (let i = 1; i < v.length; i++) ctx.lineTo(v[i]!.x, v[i]!.y);
    ctx.closePath();
    ctx.fillStyle = spec.color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = spec.edge;
    ctx.stroke();

    // 손상 표현: HP 비율에 따라 균열 선
    if (hpRatio < 0.66) {
      ctx.save();
      ctx.translate(body.position.x, body.position.y);
      ctx.rotate(body.angle);
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 2;
      const hw = (body.bounds.max.x - body.bounds.min.x) * 0.3;
      const hh = (body.bounds.max.y - body.bounds.min.y) * 0.3;
      ctx.beginPath();
      ctx.moveTo(-hw, -hh * 0.6);
      ctx.lineTo(-hw * 0.2, hh * 0.1);
      ctx.lineTo(hw * 0.3, -hh * 0.3);
      if (hpRatio < 0.33) {
        ctx.moveTo(hw * 0.6, hh * 0.8);
        ctx.lineTo(0, hh * 0.2);
        ctx.lineTo(-hw * 0.5, hh * 0.9);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawPig(body: MBody, hpRatio: number): void {
    const ctx = this.ctx;
    const r = body.circleRadius ?? 26;
    const { x, y } = body.position;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);
    ctx.fillStyle = hpRatio < 0.5 ? '#9bd66a' : '#6fcf4a';
    ctx.strokeStyle = '#3f8a2a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 코
    ctx.fillStyle = '#5cb63c';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.2, r * 0.42, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2f6a1f';
    ctx.beginPath();
    ctx.arc(-r * 0.15, r * 0.2, r * 0.08, 0, Math.PI * 2);
    ctx.arc(r * 0.15, r * 0.2, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    // 눈
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.3, r * 0.18, 0, Math.PI * 2);
    ctx.arc(r * 0.35, -r * 0.3, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-r * 0.32, -r * 0.3, r * 0.08, 0, Math.PI * 2);
    ctx.arc(r * 0.38, -r * 0.3, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawBird(body: MBody): void {
    const ctx = this.ctx;
    const r = body.circleRadius ?? BIRD.r;
    const { x, y } = body.position;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);
    ctx.fillStyle = '#e8402f';
    ctx.strokeStyle = '#8f1f14';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 배
    ctx.fillStyle = '#f7d9c4';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.45, r * 0.6, r * 0.4, 0, 0, Math.PI);
    ctx.fill();
    // 부리
    ctx.fillStyle = '#f5b021';
    ctx.beginPath();
    ctx.moveTo(r * 0.5, -r * 0.05);
    ctx.lineTo(r * 1.15, r * 0.12);
    ctx.lineTo(r * 0.5, r * 0.3);
    ctx.closePath();
    ctx.fill();
    // 눈 + 눈썹
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(r * 0.35, -r * 0.3, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(r * 0.42, -r * 0.3, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a1410';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(r * 0.05, -r * 0.6);
    ctx.lineTo(r * 0.65, -r * 0.45);
    ctx.stroke();
    ctx.restore();
  }

  private drawTrajectory(world: StageWorld, drag: DragState): void {
    const ctx = this.ctx;
    const pts = predictTrajectory(world.engine, drag.vector);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    pts.forEach((p, i) => {
      const r = 7 - (i / pts.length) * 3.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private drawParticles(effects: Effects): void {
    const ctx = this.ctx;
    for (const p of effects.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }
  }
}
