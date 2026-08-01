/**
 * 카메라 (플랜 §5).
 * 월드 좌표 → 화면 좌표를 setTransform 하나로 처리한다.
 * y축은 아래가 +(물리 엔진과 동일).
 */
export interface CameraBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export class Camera {
  /** 뷰 중심(월드) */
  x = 0;
  y = 0;
  /** 뷰 폭(월드 단위). 높이는 캔버스 종횡비로 계산 */
  viewWidth = 1600;

  /** CSS 픽셀 기준 캔버스 크기 */
  canvasW = 1;
  canvasH = 1;

  bounds: CameraBounds | null = null;

  get scale(): number {
    return this.canvasW / this.viewWidth;
  }

  get viewHeight(): number {
    return this.viewWidth * (this.canvasH / Math.max(1, this.canvasW));
  }

  setViewport(w: number, h: number): void {
    this.canvasW = Math.max(1, w);
    this.canvasH = Math.max(1, h);
  }

  setBounds(b: CameraBounds | null): void {
    this.bounds = b;
  }

  /** 특정 영역을 한 화면에 담는다 (SETTLING 시 전체 뷰 복귀). */
  frame(cx: number, cy: number, width: number): void {
    this.viewWidth = width;
    this.x = cx;
    this.y = cy;
    this.clamp();
  }

  /** 대상 추적: lerp + 속도 방향 lookahead. */
  follow(target: Vec2, velocity: Vec2, lerp = 0.12, lookahead = 14): void {
    const tx = target.x + velocity.x * lookahead;
    const ty = target.y + velocity.y * lookahead;
    this.x += (tx - this.x) * lerp;
    this.y += (ty - this.y) * lerp;
    this.clamp();
  }

  /** 목표 뷰 폭으로 서서히 이동 */
  zoomTowards(width: number, lerp = 0.08): void {
    this.viewWidth += (width - this.viewWidth) * lerp;
  }

  moveTowards(cx: number, cy: number, lerp = 0.1): void {
    this.x += (cx - this.x) * lerp;
    this.y += (cy - this.y) * lerp;
    this.clamp();
  }

  clamp(): void {
    const b = this.bounds;
    if (!b) return;
    if (this.x < b.minX) this.x = b.minX;
    if (this.x > b.maxX) this.x = b.maxX;
    if (this.y < b.minY) this.y = b.minY;
    if (this.y > b.maxY) this.y = b.maxY;
  }

  worldToScreen(p: Vec2): Vec2 {
    const s = this.scale;
    return {
      x: (p.x - this.x) * s + this.canvasW / 2,
      y: (p.y - this.y) * s + this.canvasH / 2,
    };
  }

  screenToWorld(sx: number, sy: number): Vec2 {
    const s = this.scale;
    return {
      x: (sx - this.canvasW / 2) / s + this.x,
      y: (sy - this.canvasH / 2) / s + this.y,
    };
  }

  /** dpr을 곱해 캔버스 백버퍼 좌표계로 변환행렬을 세팅한다. */
  applyTransform(ctx: CanvasRenderingContext2D, dpr: number): void {
    const s = this.scale * dpr;
    ctx.setTransform(
      s,
      0,
      0,
      s,
      (this.canvasW / 2) * dpr - this.x * s,
      (this.canvasH / 2) * dpr - this.y * s,
    );
  }
}
