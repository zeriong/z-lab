import { Vector } from './types';

export class Camera {
  private x: number = 640; // World center X
  private y: number = 360; // World center Y
  private zoom: number = 1;
  private targetX: number = 640;
  private targetY: number = 360;
  private targetZoom: number = 1;
  private minX: number;
  private maxX: number;
  private minZoom: number;
  private maxZoom: number;
  private worldWidth: number;
  private worldHeight: number;
  private screenWidth: number = 1280;
  private screenHeight: number = 720;

  constructor(
    worldWidth: number,
    worldHeight: number,
    minX: number,
    maxX: number,
    minZoom: number,
    maxZoom: number
  ) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.minX = minX;
    this.maxX = maxX;
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
  }

  update(dt: number): void {
    // Lerp towards target
    const lerpX = 0.08;
    const lerpY = 0.08;
    const lerpZoom = 0.1;

    this.x += (this.targetX - this.x) * lerpX;
    this.y += (this.targetY - this.y) * lerpY;
    this.zoom += (this.targetZoom - this.zoom) * lerpZoom;

    // Clamp
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));

    // Clamp position based on zoom
    const halfScreenWidth = (this.screenWidth / 2) / this.zoom;
    const halfScreenHeight = (this.screenHeight / 2) / this.zoom;

    this.x = Math.max(
      this.minX + halfScreenWidth,
      Math.min(this.maxX - halfScreenWidth, this.x)
    );
    this.y = Math.max(
      halfScreenHeight,
      Math.min(this.worldHeight - halfScreenHeight, this.y)
    );
  }

  setTarget(x: number, y: number, zoom: number): void {
    this.targetX = x;
    this.targetY = y;
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  getZoom(): number {
    return this.zoom;
  }

  worldToScreen(worldPos: Vector): Vector {
    return {
      x: this.screenWidth / 2 + (worldPos.x - this.x) * this.zoom,
      y: this.screenHeight / 2 + (worldPos.y - this.y) * this.zoom,
    };
  }

  screenToWorld(screenPos: Vector): Vector {
    return {
      x: this.x + (screenPos.x - this.screenWidth / 2) / this.zoom,
      y: this.y + (screenPos.y - this.screenHeight / 2) / this.zoom,
    };
  }

  setScreenSize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
  }
}
