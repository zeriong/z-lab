// 논리 뷰포트 해상도 (캔버스 내부 해상도, CSS 로 화면 크기에 맞춰 스케일된다)
export const VIEW_W = 1200;
export const VIEW_H = 700;

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

/** 발사체를 따라가는 수평 추적 카메라. 월드가 뷰포트보다 넓을 때만 이동한다. */
export class Camera {
  x = 0;
  private worldWidth: number;

  constructor(worldWidth: number) {
    this.worldWidth = worldWidth;
  }

  private maxX(): number {
    return Math.max(0, this.worldWidth - VIEW_W);
  }

  /** 특정 월드 x 좌표가 화면의 좌측 1/3 지점에 오도록 스냅 (새총 대기 상태 등) */
  centerOn(worldX: number): void {
    this.x = clamp(worldX - VIEW_W * 0.3, 0, this.maxX());
  }

  /** 목표 x로 부드럽게 추적 (발사된 새 추적용) */
  follow(worldX: number, dt: number): void {
    const targetX = clamp(worldX - VIEW_W * 0.4, 0, this.maxX());
    const lerp = 1 - Math.pow(0.001, dt / 1000);
    this.x += (targetX - this.x) * lerp;
  }

  toScreenX(worldX: number): number {
    return worldX - this.x;
  }
}

export interface Point {
  x: number;
  y: number;
}

/** 화면(캔버스 내부 픽셀) 좌표 -> 월드 좌표 */
export function screenToWorld(canvas: HTMLCanvasElement, camera: Camera, clientX: number, clientY: number): Point {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const localX = (clientX - rect.left) * scaleX;
  const localY = (clientY - rect.top) * scaleY;
  return { x: localX + camera.x, y: localY };
}
