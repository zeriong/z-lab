// Custom Canvas 2D renderer. Matter.js computes the physics; this module draws
// the world (sky, ground, slingshot, birds, pigs, blocks, aim guide) each frame.

import type { Body } from 'matter-js';
import { W, H, GROUND_Y, BodyMeta, MaterialName, MATERIALS, StageData } from './types';

export interface AimState {
  anchor: { x: number; y: number };
  birdPos: { x: number; y: number };
  points: { x: number; y: number }[];
}

export interface Scene {
  stage: StageData;
  bodies: Body[];
  meta: Map<number, BodyMeta>;
  slingshot: { x: number; y: number };
  aim: AimState | null;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private dpr: number;

  constructor(private canvas: HTMLCanvasElement) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * this.dpr);
    canvas.height = Math.round(H * this.dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;
  }

  /** Convert a viewport (client) point to logical game coordinates. */
  toLogical(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left) * (W / r.width),
      y: (clientY - r.top) * (H / r.height),
    };
  }

  draw(scene: Scene): void {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    this.drawSky(scene.stage);
    this.drawClouds();
    this.drawGround(scene.stage);
    if (scene.aim) this.drawTrajectory(scene.aim);
    this.drawSlingshotBack(scene.slingshot, scene.aim);

    for (const body of scene.bodies) {
      const m = scene.meta.get(body.id);
      if (!m) continue;
      if (m.kind === 'block') this.drawBlock(body, m);
      else if (m.kind === 'pig') this.drawPig(body, m);
      else if (m.kind === 'bird') this.drawBird(body, m);
    }

    this.drawSlingshotFront(scene.slingshot, scene.aim);
  }

  private drawSky(stage: StageData): void {
    const g = this.ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, stage.sky[0]);
    g.addColorStop(1, stage.sky[1]);
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, W, GROUND_Y);
  }

  private drawClouds(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    const puffs: [number, number, number][] = [
      [240, 120, 34], [280, 110, 44], [320, 122, 30],
      [900, 90, 30], [940, 82, 40], [978, 92, 26],
    ];
    for (const [x, y, r] of puffs) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawGround(stage: StageData): void {
    const ctx = this.ctx;
    ctx.fillStyle = stage.ground;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    // darker soil band under the grass line
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, GROUND_Y, W, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, GROUND_Y + 40, W, H - GROUND_Y - 40);
  }

  private drawSlingshotBack(s: { x: number; y: number }, aim: AimState | null): void {
    const ctx = this.ctx;
    // back fork arm
    ctx.strokeStyle = '#5a3b1a';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.x, GROUND_Y);
    ctx.lineTo(s.x - 6, s.y);
    ctx.stroke();
    // back band to the bird
    if (aim) {
      ctx.strokeStyle = '#3a2410';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(s.x - 6, s.y - 4);
      ctx.lineTo(aim.birdPos.x, aim.birdPos.y);
      ctx.stroke();
    }
  }

  private drawSlingshotFront(s: { x: number; y: number }, aim: AimState | null): void {
    const ctx = this.ctx;
    // front band to the bird (drawn over the bird)
    if (aim) {
      ctx.strokeStyle = '#5a3b1a';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x + 16, s.y - 4);
      ctx.lineTo(aim.birdPos.x, aim.birdPos.y);
      ctx.stroke();
    }
    // front fork arm
    ctx.strokeStyle = '#6b4620';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.x + 6, GROUND_Y);
    ctx.lineTo(s.x + 16, s.y);
    ctx.stroke();
  }

  private drawTrajectory(aim: AimState): void {
    const ctx = this.ctx;
    ctx.save();
    for (let i = 0; i < aim.points.length; i++) {
      const p = aim.points[i];
      const t = i / aim.points.length;
      ctx.globalAlpha = 0.7 * (1 - t);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5 - t * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawBird(body: Body, m: BodyMeta): void {
    const ctx = this.ctx;
    const r = m.r ?? 18;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    // body
    ctx.fillStyle = '#e23b3b';
    ctx.strokeStyle = '#8f1f1f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // belly
    ctx.fillStyle = '#f4c9b0';
    ctx.beginPath();
    ctx.arc(2, 6, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    // eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(r * 0.35, -r * 0.3, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(r * 0.45, -r * 0.3, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    // beak
    ctx.fillStyle = '#f6a723';
    ctx.beginPath();
    ctx.moveTo(r * 0.7, 0);
    ctx.lineTo(r * 1.15, -r * 0.12);
    ctx.lineTo(r * 1.15, r * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawPig(body: Body, m: BodyMeta): void {
    const ctx = this.ctx;
    const r = m.r ?? 22;
    const hurt = 1 - m.hp / m.maxHp;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    // body — greener when healthy, paler/greyer when hurt
    ctx.fillStyle = hurt > 0.6 ? '#7fae5a' : '#8ec63f';
    ctx.strokeStyle = '#4e7d28';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // ears
    ctx.fillStyle = '#8ec63f';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * r * 0.6, -r * 0.75, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    // eyes
    ctx.fillStyle = '#fff';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * r * 0.32, -r * 0.2, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#222';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * r * 0.32 + sx * 2, -r * 0.2, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
    // snout
    ctx.fillStyle = '#77b23a';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.28, r * 0.42, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4e7d28';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * r * 0.16, r * 0.28, r * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
    // hurt overlay
    if (hurt > 0.05) {
      ctx.globalAlpha = Math.min(0.4, hurt * 0.5);
      ctx.fillStyle = '#b03030';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawBlock(body: Body, m: BodyMeta): void {
    const ctx = this.ctx;
    const w = m.w ?? 40;
    const h = m.h ?? 40;
    const mat: MaterialName = m.material ?? 'wood';
    const def = MATERIALS[mat];
    const hurt = 1 - m.hp / m.maxHp;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.globalAlpha = mat === 'glass' || mat === 'ice' ? 0.82 : 1;
    ctx.fillStyle = def.fill;
    ctx.strokeStyle = def.stroke;
    ctx.lineWidth = 2;
    this.roundRect(-w / 2, -h / 2, w, h, 4);
    ctx.fill();
    ctx.stroke();
    // grain / highlight
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 3, -h / 2 + 4);
    ctx.lineTo(w / 2 - 3, -h / 2 + 4);
    ctx.stroke();
    // damage cracks
    if (hurt > 0.35) {
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = 'rgba(20,20,20,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-w * 0.2, -h / 2);
      ctx.lineTo(-w * 0.05, 0);
      ctx.lineTo(-w * 0.18, h / 2);
      ctx.moveTo(w * 0.15, -h / 2);
      ctx.lineTo(w * 0.28, h * 0.1);
      ctx.stroke();
    }
    ctx.restore();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
