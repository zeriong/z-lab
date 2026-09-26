// 화면 맞춤 (§4.11, R23): 1600×900 월드를 비율 유지로 창에 맞추고 남는 곳은 레터박스.
// 월드↔화면 변환은 이 클래스 한 곳에만 있다 (A9).
import { WORLD_H, WORLD_W } from '../config';
import type { Vec2 } from '../types';

export interface Fit {
  scale: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

/** 캔버스 CSS 크기 → 게임 영역 사각형 */
export function computeFit(cssW: number, cssH: number): Fit {
  if (cssW <= 0 || cssH <= 0) return { scale: 0, offsetX: 0, offsetY: 0, width: 0, height: 0 };
  const scale = Math.min(cssW / WORLD_W, cssH / WORLD_H);
  const width = WORLD_W * scale;
  const height = WORLD_H * scale;
  return { scale, offsetX: (cssW - width) / 2, offsetY: (cssH - height) / 2, width, height };
}

export class Viewport {
  /** 콜드 스타트 값 0 — resize() 전에는 입력을 받지 않는다 (hop 1) */
  scale = 0;
  offsetX = 0;
  offsetY = 0;
  cssW = 0;
  cssH = 0;
  dpr = 1;

  resize(cssW: number, cssH: number, dpr = 1): void {
    const fit = computeFit(cssW, cssH);
    this.cssW = cssW;
    this.cssH = cssH;
    this.dpr = Math.max(1, Math.min(3, dpr || 1));
    this.scale = fit.scale;
    this.offsetX = fit.offsetX;
    this.offsetY = fit.offsetY;
  }

  get gameWidth(): number {
    return WORLD_W * this.scale;
  }

  get gameHeight(): number {
    return WORLD_H * this.scale;
  }

  /** 월드 → 캔버스 기준 CSS px */
  worldToScreen(p: Vec2): Vec2 {
    return { x: this.offsetX + p.x * this.scale, y: this.offsetY + p.y * this.scale };
  }

  /** 캔버스 기준 CSS px → 월드 */
  screenToWorld(p: Vec2): Vec2 {
    const s = this.scale || 1;
    return { x: (p.x - this.offsetX) / s, y: (p.y - this.offsetY) / s };
  }

  /** 포인터 이벤트 clientX/Y → 월드 (캔버스 bounding rect 기준) */
  clientToWorld(clientX: number, clientY: number, rect: { left: number; top: number }): Vec2 {
    return this.screenToWorld({ x: clientX - rect.left, y: clientY - rect.top });
  }

  /** 캔버스 버퍼 크기와 #ui 위치(CSS 변수)를 맞춘다 */
  applyToDom(canvas: HTMLCanvasElement, root: HTMLElement): void {
    const w = Math.max(1, Math.round(this.cssW * this.dpr));
    const h = Math.max(1, Math.round(this.cssH * this.dpr));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    root.style.setProperty('--ui-left', `${this.offsetX}px`);
    root.style.setProperty('--ui-top', `${this.offsetY}px`);
    root.style.setProperty('--ui-width', `${this.gameWidth}px`);
    root.style.setProperty('--ui-height', `${this.gameHeight}px`);
    root.style.setProperty('--ui-scale', `${this.scale}`);
  }

  /** ctx를 월드 좌표로 그리도록 변환 (DPR 반영 → 레티나에서도 선명) */
  applyWorldTransform(ctx: CanvasRenderingContext2D, shake: Vec2 = { x: 0, y: 0 }): void {
    const k = this.dpr * this.scale;
    ctx.setTransform(k, 0, 0, k, this.dpr * this.offsetX + shake.x * k, this.dpr * this.offsetY + shake.y * k);
  }
}
