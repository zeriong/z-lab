import type { MetaBody } from '../physics/PhysicsWorld';
import { drawBackground } from './Background';
import type { ParticleSystem } from './ParticleSystem';
import type { ScorePopupSystem } from './ScorePopup';
import { SLINGSHOT_ANCHOR, GROUND_SURFACE_Y } from '../constants';

export interface Point {
  x: number;
  y: number;
}

const MATERIAL_COLOR: Record<string, string> = {
  wood: '#a5713b',
  stone: '#8a8f98',
  glass: '#bfe3f0',
};

export interface RenderState {
  bodies: MetaBody[];
  cameraX: number;
  backgroundTheme: string;
  trajectoryPoints?: Point[];
  /** Where to draw the idle/aiming bird sprite. null while a launched bird
   *  is already a physics body (rendered via the bodies loop instead), or
   *  once no birds remain. */
  birdVisualPos: Point | null;
  particles: ParticleSystem;
  scorePopups: ScorePopupSystem;
}

/** Every draw call below happens after ctx.translate(-cameraX, 0), so world
 *  coordinates are used directly — the camera-follow logic lives in Game. */
export class Renderer {
  constructor(
    private ctx: CanvasRenderingContext2D,
    private width: number,
    private height: number,
  ) {}

  render(state: RenderState) {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.width, this.height);
    drawBackground(ctx, this.width, this.height, state.backgroundTheme);

    ctx.save();
    ctx.translate(-state.cameraX, 0);

    this.drawSlingshotAndBird(state.birdVisualPos);

    for (const body of state.bodies) {
      this.drawBody(body);
    }

    if (state.trajectoryPoints) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (const p of state.trajectoryPoints) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    this.drawParticles(state.particles);
    this.drawScorePopups(state.scorePopups);

    ctx.restore();
  }

  private drawSlingshotAndBird(birdPos: Point | null) {
    const { ctx } = this;
    const { x, y } = SLINGSHOT_ANCHOR;

    ctx.strokeStyle = '#5b3a29';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x - 20, GROUND_SURFACE_Y);
    ctx.lineTo(x - 20, y - 10);
    ctx.moveTo(x + 20, GROUND_SURFACE_Y);
    ctx.lineTo(x + 20, y - 10);
    ctx.stroke();

    if (!birdPos) return;

    ctx.strokeStyle = '#3b2a1f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - 20, y - 10);
    ctx.lineTo(birdPos.x, birdPos.y);
    ctx.moveTo(x + 20, y - 10);
    ctx.lineTo(birdPos.x, birdPos.y);
    ctx.stroke();

    ctx.fillStyle = '#d1453b';
    ctx.beginPath();
    ctx.arc(birdPos.x, birdPos.y, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawBody(body: MetaBody) {
    const { ctx } = this;
    const meta = body.meta;
    if (!meta) return;

    if (meta.kind === 'ground') {
      ctx.fillStyle = '#5a7a3a';
      this.fillPolygon(body);
      return;
    }

    if (meta.kind === 'block') {
      const base = MATERIAL_COLOR[meta.material ?? 'wood'];
      const ratio = meta.maxHp ? (meta.hp ?? 0) / meta.maxHp : 1;
      ctx.fillStyle = this.shade(base, ratio);
      this.fillPolygon(body);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      this.strokePolygon(body);
      return;
    }

    if (meta.kind === 'pig') {
      ctx.fillStyle = '#7bc96f';
      ctx.beginPath();
      ctx.arc(body.position.x, body.position.y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2e4a29';
      ctx.beginPath();
      ctx.arc(body.position.x - 6, body.position.y - 4, 2.5, 0, Math.PI * 2);
      ctx.arc(body.position.x + 6, body.position.y - 4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (meta.kind === 'bird') {
      ctx.fillStyle = '#d1453b';
      ctx.beginPath();
      ctx.arc(body.position.x, body.position.y, 16, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
  }

  private fillPolygon(body: MetaBody) {
    const { ctx } = this;
    const vertices = body.vertices;
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) ctx.lineTo(vertices[i].x, vertices[i].y);
    ctx.closePath();
    ctx.fill();
  }

  private strokePolygon(body: MetaBody) {
    const { ctx } = this;
    const vertices = body.vertices;
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) ctx.lineTo(vertices[i].x, vertices[i].y);
    ctx.closePath();
    ctx.stroke();
  }

  /** Damage feedback: darkens toward black as remaining HP ratio drops, so a
   *  hit registers visually within the same frame it lands (plan §매트릭스 #5
   *  quality floor: "파괴 순간 파편+소리로 '맞았다'가 1프레임 내 식별 가능"). */
  private shade(hex: string, ratio: number): string {
    const clamped = Math.max(0.35, ratio);
    const num = parseInt(hex.slice(1), 16);
    const r = Math.floor(((num >> 16) & 255) * clamped);
    const g = Math.floor(((num >> 8) & 255) * clamped);
    const b = Math.floor((num & 255) * clamped);
    return `rgb(${r},${g},${b})`;
  }

  private drawParticles(ps: ParticleSystem) {
    const { ctx } = this;
    for (const p of ps.particles) {
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  private drawScorePopups(sp: ScorePopupSystem) {
    const { ctx } = this;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    for (const p of sp.popups) {
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.fillStyle = '#fff59d';
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}
