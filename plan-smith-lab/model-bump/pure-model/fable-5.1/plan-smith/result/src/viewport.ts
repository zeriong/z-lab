// D3: 16:9 레터박스 스케일 + 입력·렌더 공용 좌표 변환.
import { VIEW, type Vec2 } from './types';

export interface Transform {
  /** CSS px / 논리 px */
  scale: number;
  /** 컨테이너 내부에서 레터박스 사각형의 좌상단 */
  ox: number;
  oy: number;
  cssW: number;
  cssH: number;
}

export function fitLetterbox(containerW: number, containerH: number): Transform {
  const safeW = Math.max(1, containerW);
  const safeH = Math.max(1, containerH);
  const scale = Math.min(safeW / VIEW.w, safeH / VIEW.h);
  const cssW = VIEW.w * scale;
  const cssH = VIEW.h * scale;
  return { scale, ox: (safeW - cssW) / 2, oy: (safeH - cssH) / 2, cssW, cssH };
}

/**
 * 화면 좌표(컨테이너 기준 CSS px) → 월드 좌표.
 * 카메라 x 오프셋을 여기서 더해, 입력과 렌더가 같은 식을 쓴다.
 */
export function screenToWorld(t: Transform, p: Vec2, cameraX = 0): Vec2 {
  return { x: (p.x - t.ox) / t.scale + cameraX, y: (p.y - t.oy) / t.scale };
}

export function worldToScreen(t: Transform, p: Vec2, cameraX = 0): Vec2 {
  return { x: (p.x - cameraX) * t.scale + t.ox, y: p.y * t.scale + t.oy };
}

export class Viewport {
  transform: Transform = fitLetterbox(VIEW.w, VIEW.h);
  dpr = 1;
  private onResizeBound = () => this.resize();

  constructor(
    private readonly container: HTMLElement,
    private readonly stage: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
  ) {}

  attach(): void {
    window.addEventListener('resize', this.onResizeBound);
    window.addEventListener('orientationchange', this.onResizeBound);
    this.resize();
  }

  detach(): void {
    window.removeEventListener('resize', this.onResizeBound);
    window.removeEventListener('orientationchange', this.onResizeBound);
  }

  resize(): void {
    const r = this.container.getBoundingClientRect();
    this.transform = fitLetterbox(r.width, r.height);
    const { ox, oy, cssW, cssH } = this.transform;
    this.stage.style.left = `${ox}px`;
    this.stage.style.top = `${oy}px`;
    this.stage.style.width = `${cssW}px`;
    this.stage.style.height = `${cssH}px`;

    // 백킹 스토어는 논리 해상도 × dpr(최대 2). 렌더는 항상 VIEW 단위로 그린다.
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const bw = Math.round(VIEW.w * this.dpr);
    const bh = Math.round(VIEW.h * this.dpr);
    if (this.canvas.width !== bw || this.canvas.height !== bh) {
      this.canvas.width = bw;
      this.canvas.height = bh;
    }
  }

  /** 포인터 이벤트 → 월드 좌표(카메라 포함). 입력 모듈이 쓰는 유일한 변환. */
  pointerToWorld(ev: { clientX: number; clientY: number }, cameraX: number): Vec2 {
    const r = this.container.getBoundingClientRect();
    return screenToWorld(this.transform, { x: ev.clientX - r.left, y: ev.clientY - r.top }, cameraX);
  }
}

/** D4: 세로 모드 감지. CSS media query와 같은 조건. */
export function watchOrientation(onChange: (portrait: boolean) => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia('(orientation: portrait) and (max-width: 1024px)');
  const handler = () => onChange(mq.matches);
  handler();
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
