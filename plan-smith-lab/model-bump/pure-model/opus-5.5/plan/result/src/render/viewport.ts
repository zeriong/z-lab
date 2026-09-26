import {
  DPR_CAP,
  LOGICAL_H,
  LOGICAL_W,
  PAUSE_BUTTON_LOGICAL,
  PAUSE_BUTTON_MARGIN_RATIO,
  PAUSE_BUTTON_MIN_CSS,
} from '../config/constants';
import type { Vec } from '../core/math';

/**
 * 레터박스, DPR, 좌표 변환 (§8.1).
 * scale = min(가용폭/1920, 가용높이/1080). 게임 영역(HUD·오버레이 포함)은 이 사각형에 맞춘다.
 */

export interface Fit {
  scale: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

export function computeFit(availW: number, availH: number): Fit {
  const scale = Math.max(0.01, Math.min(availW / LOGICAL_W, availH / LOGICAL_H));
  const width = LOGICAL_W * scale;
  const height = LOGICAL_H * scale;
  return { scale, width, height, left: (availW - width) / 2, top: (availH - height) / 2 };
}

/** 화면 좌표 → 월드(논리) 좌표. rect는 캔버스의 화면상 사각형 */
export function screenToWorld(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }): Vec {
  return {
    x: ((clientX - rect.left) / (rect.width || 1)) * LOGICAL_W,
    y: ((clientY - rect.top) / (rect.height || 1)) * LOGICAL_H,
  };
}

export class Viewport {
  fit: Fit = computeFit(LOGICAL_W, LOGICAL_H);
  dpr = 1;
  private readonly listeners: Array<() => void> = [];

  constructor(
    private readonly gameArea: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
  ) {
    const onResize = () => this.update();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    this.listeners.push(() => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    });
    this.update();
  }

  private readonly changeHandlers = new Set<() => void>();

  onChange(fn: () => void): () => void {
    this.changeHandlers.add(fn);
    return () => this.changeHandlers.delete(fn);
  }

  update(): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    this.fit = computeFit(vw, vh);
    const f = this.fit;
    const s = this.gameArea.style;
    s.left = `${f.left}px`;
    s.top = `${f.top}px`;
    s.width = `${f.width}px`;
    s.height = `${f.height}px`;
    s.setProperty('--u', String(f.scale));
    s.setProperty('--gw', `${f.width}px`);
    const btn = Math.max(PAUSE_BUTTON_MIN_CSS, PAUSE_BUTTON_LOGICAL * f.scale);
    s.setProperty('--pause-size', `${btn}px`);
    s.setProperty('--pause-margin', `${f.width * PAUSE_BUTTON_MARGIN_RATIO}px`);

    this.dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const bw = Math.max(1, Math.round(f.width * this.dpr));
    const bh = Math.max(1, Math.round(f.height * this.dpr));
    if (this.canvas.width !== bw) this.canvas.width = bw;
    if (this.canvas.height !== bh) this.canvas.height = bh;
    for (const fn of this.changeHandlers) fn();
  }

  /** 입력 모듈과 공유하는 역변환 */
  toWorld(clientX: number, clientY: number): Vec {
    return screenToWorld(clientX, clientY, this.canvas.getBoundingClientRect());
  }

  /** 논리 좌표로 그릴 수 있게 변환 행렬을 건다 */
  applyTransform(ctx: CanvasRenderingContext2D): void {
    const k = this.canvas.width / LOGICAL_W;
    ctx.setTransform(k, 0, 0, k, 0, 0);
  }

  /** 모바일 세로 방향인가 (§7.4) */
  isPortraitMobile(): boolean {
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    return coarse && window.innerHeight > window.innerWidth;
  }

  dispose(): void {
    for (const off of this.listeners) off();
    this.listeners.length = 0;
    this.changeHandlers.clear();
  }
}
