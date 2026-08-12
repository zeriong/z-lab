export interface CameraTarget {
  x: number;
  y: number;
}

export class Camera {
  x: number = 0;
  y: number = 0;
  zoom: number = 1;

  private targetX: number = 0;
  private targetY: number = 0;
  private targetZoom: number = 1;
  private readonly lerpFactor = 0.08;

  private minX: number;
  private maxX: number;
  private minZoom: number;
  private maxZoom: number;

  private canvasWidth: number;
  private canvasHeight: number;
  private worldWidth: number;
  private worldHeight: number;

  constructor(
    canvasWidth: number,
    canvasHeight: number,
    worldWidth: number,
    worldHeight: number,
    minX: number,
    maxX: number,
    minZoom: number,
    maxZoom: number
  ) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.minX = minX;
    this.maxX = maxX;
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;

    this.x = this.targetX;
    this.y = this.targetY;
    this.zoom = this.targetZoom;
  }

  setTarget(target: CameraTarget, targetZoom: number): void {
    this.targetX = target.x;
    this.targetY = target.y;
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, targetZoom));
  }

  setAiming(slingshotX: number, _slingshotY: number): void {
    const viewportWidth = this.canvasWidth / this.targetZoom;
    this.targetX = Math.max(this.minX, slingshotX - viewportWidth / 3);
    this.targetZoom = 1.1;
  }

  setFull(): void {
    const viewportWidth = this.canvasWidth / this.zoom;
    const targetX = this.minX + (this.maxX - this.minX - viewportWidth) / 2;
    this.targetX = Math.max(this.minX, Math.min(this.maxX, targetX));
    this.targetZoom = Math.min(
      this.canvasWidth / this.worldWidth,
      this.canvasHeight / this.worldHeight
    );
  }

  pan(deltaX: number, deltaY: number): void {
    this.targetX -= deltaX;
    this.targetY -= deltaY;
    this.clamp();
  }

  update(): void {
    // Lerp towards target
    this.x += (this.targetX - this.x) * this.lerpFactor;
    this.y += (this.targetY - this.y) * this.lerpFactor;
    this.zoom += (this.targetZoom - this.zoom) * this.lerpFactor;

    this.clamp();
  }

  private clamp(): void {
    const viewportWidth = this.canvasWidth / this.zoom;
    const viewportHeight = this.canvasHeight / this.zoom;

    this.x = Math.max(this.minX, Math.min(this.maxX - viewportWidth, this.x));
    this.y = Math.max(0, Math.min(this.worldHeight - viewportHeight, this.y));
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: (worldX - this.x) * this.zoom,
      y: (worldY - this.y) * this.zoom
    };
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX / this.zoom + this.x,
      y: screenY / this.zoom + this.y
    };
  }

  getViewportBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    const viewportWidth = this.canvasWidth / this.zoom;
    const viewportHeight = this.canvasHeight / this.zoom;
    return {
      minX: this.x,
      maxX: this.x + viewportWidth,
      minY: this.y,
      maxY: this.y + viewportHeight
    };
  }
}
