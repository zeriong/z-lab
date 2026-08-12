export interface CameraConfig {
  minX: number;
  maxX: number;
  minZoom: number;
  maxZoom: number;
}

export class Camera {
  private x: number = 0;
  private y: number = 0;
  private zoom: number = 1;
  private targetX: number = 0;
  private targetY: number = 0;
  private targetZoom: number = 1;
  private lerpFactor: number = 0.08;

  private config: CameraConfig;

  constructor(config: CameraConfig) {
    this.config = config;
  }

  update(alpha: number) {
    this.x += (this.targetX - this.x) * this.lerpFactor;
    this.y += (this.targetY - this.y) * this.lerpFactor;
    this.zoom += (this.targetZoom - this.zoom) * this.lerpFactor;

    this.clamp();
  }

  setTarget(x: number, y: number, zoom: number) {
    this.targetX = x;
    this.targetY = y;
    this.targetZoom = Math.max(this.config.minZoom, Math.min(zoom, this.config.maxZoom));
  }

  setImmediate(x: number, y: number, zoom: number) {
    this.x = x;
    this.y = y;
    this.zoom = Math.max(this.config.minZoom, Math.min(zoom, this.config.maxZoom));
    this.targetX = x;
    this.targetY = y;
    this.targetZoom = this.zoom;
  }

  private clamp() {
    const worldWidth = this.config.maxX - this.config.minX;
    const viewportWidth = worldWidth / this.zoom;
    const viewportHeight = 720 / this.zoom;

    this.x = Math.max(
      this.config.minX,
      Math.min(this.x, this.config.maxX - viewportWidth)
    );
  }

  getX(): number {
    return this.x;
  }

  getY(): number {
    return this.y;
  }

  getZoom(): number {
    return this.zoom;
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: (worldX - this.x) * this.zoom,
      y: (worldY - this.y) * this.zoom,
    };
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX / this.zoom + this.x,
      y: screenY / this.zoom + this.y,
    };
  }
}
