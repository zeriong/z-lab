/**
 * Canvas 2D 자체 렌더러 (R16, R19).
 *
 * Matter 내장 렌더러를 기각한 대가로 여기가 전부 우리 몫이다(§11).
 * 대신 얻은 것: 카메라·흔들림·파티클·궤적 잔상이 전부 가능하다.
 *
 * 지형은 **물리 바디의 vertices를 그대로** 그린다. 별도의 시각 지형을 두면
 * 언젠가 두 좌표가 어긋나고, 그때 증상은 "새가 보이는 땅보다 위에서 튕김"이다.
 */

import type { Body, Vector } from 'matter-js';
import { Camera } from './camera';
import { Effects } from './effects';
import { tagOf, type StageRuntime } from '../data/loader';
import type { Theme } from '../data/schema';
import type { AimState } from '../game/slingshot';
import { MAX_PULL } from '../game/slingshot';

interface Palette {
  skyTop: string;
  skyBottom: string;
  far: string;
  near: string;
  ground: string;
  groundEdge: string;
  fog: string;
}

const PALETTES: Record<Theme, Palette> = {
  meadow: {
    skyTop: '#8fd0f0',
    skyBottom: '#dff0e8',
    far: 'rgba(120, 170, 140, 0.45)',
    near: 'rgba(84, 138, 100, 0.55)',
    ground: '#5f8f4a',
    groundEdge: '#3f6a30',
    fog: 'rgba(255,255,255,0.10)',
  },
  quarry: {
    skyTop: '#9fb0c4',
    skyBottom: '#e6dfd2',
    far: 'rgba(150, 148, 140, 0.45)',
    near: 'rgba(112, 106, 96, 0.5)',
    ground: '#8c8577',
    groundEdge: '#5f5a50',
    fog: 'rgba(255,255,255,0.08)',
  },
  dusk: {
    skyTop: '#2b3a63',
    skyBottom: '#e0764f',
    far: 'rgba(60, 62, 96, 0.6)',
    near: 'rgba(32, 34, 56, 0.75)',
    ground: '#3b3350',
    groundEdge: '#241f34',
    fog: 'rgba(255, 180, 120, 0.10)',
  },
};

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  private dpr = 1;
  cssWidth = 0;
  cssHeight = 0;
  /** 진단용(§9 Step 9 검증): 마지막 프레임 드로잉 소요 시간(ms) */
  lastDrawMs = 0;

  constructor(readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D 컨텍스트를 얻지 못했습니다');
    this.ctx = ctx;
  }

  /**
   * DPR 스케일 재설정 (R19).
   * 백버퍼는 물리 픽셀, 드로잉 좌표는 CSS 픽셀로 통일한다.
   * 이 통일이 깨지면 리사이즈 후 포인터 좌표가 어긋나 조준이 불가능해진다.
   */
  resize(camera: Camera): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // 2 초과는 비용만 늘고 안 보인다
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));

    this.dpr = dpr;
    this.cssWidth = w;
    this.cssHeight = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    camera.setViewport(w, h);
  }

  draw(params: {
    runtime: StageRuntime | null;
    camera: Camera;
    effects: Effects;
    aim: AimState | null;
    theme: Theme;
    showAim: boolean;
  }): void {
    const t0 = performance.now();
    const { ctx } = this;
    const { camera, runtime, effects, theme } = params;
    const palette = PALETTES[theme];

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawSky(palette);
    this.drawParallax(palette, camera);

    ctx.save();
    camera.applyTransform(ctx);

    if (runtime) {
      this.drawGround(runtime, palette);
      this.drawTrail(runtime.lastTrail, 'rgba(255,255,255,0.22)');
      this.drawTrail(runtime.trail, 'rgba(255,255,255,0.5)');
      this.drawSlingshotBack(runtime.anchor);
      this.drawBlocks(runtime);
      this.drawPigs(runtime);
      if (runtime.activeBird) this.drawBird(runtime.activeBird);
      if (params.aim && params.aim.dragging && params.showAim) {
        this.drawBands(runtime.anchor, params.aim);
        this.drawPreview(params.aim.preview);
      }
      this.drawSlingshotFront(runtime.anchor);
      effects.draw(ctx);
    }

    ctx.restore();

    this.lastDrawMs = performance.now() - t0;
  }

  // ---------------------------------------------------------------- 배경

  private drawSky(p: Palette): void {
    const { ctx } = this;
    const grad = ctx.createLinearGradient(0, 0, 0, this.cssHeight);
    grad.addColorStop(0, p.skyTop);
    grad.addColorStop(1, p.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);
  }

  /** 원경 실루엣. 카메라 이동에 0.25/0.5배로 따라붙어 깊이를 만든다. */
  private drawParallax(p: Palette, camera: Camera): void {
    const { ctx } = this;
    const baseY = this.cssHeight * 0.72;

    const layer = (offsetScale: number, color: string, height: number, period: number): void => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, this.cssHeight);
      const shift = -camera.x * offsetScale;
      for (let x = 0; x <= this.cssWidth; x += 8) {
        const t = (x + shift) / period;
        const y = baseY - height * (0.5 + 0.5 * Math.sin(t) * Math.cos(t * 0.6));
        ctx.lineTo(x, y);
      }
      ctx.lineTo(this.cssWidth, this.cssHeight);
      ctx.closePath();
      ctx.fill();
    };

    layer(0.25, p.far, 90, 260);
    layer(0.5, p.near, 60, 170);

    ctx.fillStyle = p.fog;
    ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);
  }

  // ---------------------------------------------------------------- 월드

  private drawGround(runtime: StageRuntime, p: Palette): void {
    const { ctx } = this;
    for (const body of runtime.ground) {
      for (const part of body.parts.length > 1 ? body.parts.slice(1) : body.parts) {
        ctx.beginPath();
        part.vertices.forEach((v, i) => (i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y)));
        ctx.closePath();
        ctx.fillStyle = p.ground;
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = p.groundEdge;
        ctx.stroke();
      }
    }
  }

  private drawBlocks(runtime: StageRuntime): void {
    const { ctx } = this;
    for (const body of runtime.blocks) {
      const tag = tagOf(body);
      if (!tag) continue;
      const ratio = Number.isFinite(tag.maxHp) ? Math.max(0, tag.hp) / tag.maxHp : 1;

      ctx.save();
      ctx.beginPath();
      body.vertices.forEach((v, i) => (i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y)));
      ctx.closePath();
      ctx.fillStyle = tag.fill;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = tag.stroke;
      ctx.stroke();

      // 손상 표현: HP가 깎일수록 어두운 균열 오버레이가 진해진다.
      if (ratio < 1) {
        ctx.globalAlpha = (1 - ratio) * 0.55;
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      if (tag.material === 'tnt') {
        const c = body.position;
        ctx.fillStyle = '#f7e07a';
        ctx.font = 'bold 16px "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TNT', c.x, c.y);
      }
      ctx.restore();
    }
  }

  private drawPigs(runtime: StageRuntime): void {
    const { ctx } = this;
    for (const body of runtime.pigs) {
      const tag = tagOf(body);
      if (!tag) continue;
      const r = body.circleRadius ?? 20;
      const { x, y } = body.position;
      const ratio = Math.max(0, tag.hp) / tag.maxHp;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(body.angle);

      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = tag.fill;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = tag.stroke;
      ctx.stroke();

      // 눈 + 코 — "맞으면 표정이 상한다"를 HP 비율로 표현
      const eye = r * 0.28;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-r * 0.32, -r * 0.2, eye, 0, Math.PI * 2);
      ctx.arc(r * 0.32, -r * 0.2, eye, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(-r * 0.3, -r * 0.2, eye * 0.45, 0, Math.PI * 2);
      ctx.arc(r * 0.34, -r * 0.2, eye * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(0, r * 0.18, r * 0.3, r * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();

      if (ratio < 1) {
        ctx.globalAlpha = (1 - ratio) * 0.5;
        ctx.fillStyle = '#7a2b2b';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawBird(body: Body): void {
    const { ctx } = this;
    const tag = tagOf(body);
    const r = body.circleRadius ?? 16;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = tag?.fill ?? '#e0483c';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.stroke();

    // 부리 — 진행 방향(로컬 +x)
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -r * 0.15);
    ctx.lineTo(r * 1.5, 0);
    ctx.lineTo(r * 0.7, r * 0.2);
    ctx.closePath();
    ctx.fillStyle = '#f2a33c';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.3, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.36, -r * 0.3, r * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = '#222';
    ctx.fill();

    if (tag?.birdKind === 'bomb') {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
      ctx.strokeStyle = '#ff7a4d';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (tag?.birdKind === 'speed') {
      ctx.beginPath();
      ctx.moveTo(-r, -r * 0.5);
      ctx.lineTo(-r * 1.8, 0);
      ctx.lineTo(-r, r * 0.5);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fill();
    }
    ctx.restore();
  }

  // ------------------------------------------------------------- 새총/조준

  private drawSlingshotBack(anchor: Vector): void {
    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = '#6b4a24';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y + 110);
    ctx.lineTo(anchor.x, anchor.y + 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y + 24);
    ctx.lineTo(anchor.x - 16, anchor.y - 6);
    ctx.stroke();
    ctx.restore();
  }

  private drawSlingshotFront(anchor: Vector): void {
    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = '#7d5729';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y + 24);
    ctx.lineTo(anchor.x + 16, anchor.y - 6);
    ctx.stroke();
    ctx.restore();
  }

  /** 고무줄 두 가닥이 새를 따라온다 (R5) */
  private drawBands(anchor: Vector, aim: AimState): void {
    const { ctx } = this;
    const birdX = anchor.x + aim.pull.x;
    const birdY = anchor.y + aim.pull.y;
    const tension = Math.min(1, Math.hypot(aim.pull.x, aim.pull.y) / MAX_PULL);
    ctx.save();
    ctx.strokeStyle = `rgb(${90 + tension * 120}, 40, 30)`;
    ctx.lineWidth = 7 - tension * 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(anchor.x - 16, anchor.y - 6);
    ctx.lineTo(birdX, birdY);
    ctx.moveTo(anchor.x + 16, anchor.y - 6);
    ctx.lineTo(birdX, birdY);
    ctx.stroke();
    ctx.restore();
  }

  /** 궤적 예측 점선 (R6) — 드래그 중에만 존재한다 */
  private drawPreview(points: Vector[]): void {
    const { ctx } = this;
    ctx.save();
    points.forEach((p, i) => {
      const alpha = 1 - i / (points.length + 2);
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4 - i * 0.15, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  /** 지난 발사의 실제 경로 (R7) */
  private drawTrail(points: Vector[], color: string): void {
    if (points.length < 2) return;
    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}
