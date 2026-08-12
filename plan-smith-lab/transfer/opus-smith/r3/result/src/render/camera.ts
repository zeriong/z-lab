import type Matter from 'matter-js';
import type { CameraDef } from '../data/schema';

export class Camera {
  private x: number = 0;
  private y: number = 0;
  private zoom: number = 1;
  private targetX: number = 0;
  private targetY: number = 0;
  private targetZoom: number = 1;
  private tracking: boolean = false;
  private minZoom: number = 0.5;
  private maxZoom: number = 2;
  private shakeIntensity: number = 0;
  private shakeDuration: number = 0;

  constructor(def?: CameraDef) {
    if (def) {
      this.minZoom = def.minZoom;
      this.maxZoom = def.maxZoom;
    }
  }

  startTracking(body: Matter.Body, width: number, height: number, def: CameraDef): void {
    this.tracking = true;
    this.updateTargetForTracking(body, width, height, def);
  }

  stopTracking(): void {
    this.tracking = false;
  }

  private updateTargetForTracking(body: Matter.Body, width: number, height: number, def: CameraDef): void {
    const viewportX = width / 3;
    this.targetX = body.position.x - viewportX;
    this.targetY = body.position.y - height / 2;
  }

  settleCameraToSlingshot(slingshotX: number, slingshotY: number, width: number, height: number): void {
    this.tracking = false;
    this.targetX = slingshotX - width / 2;
    this.targetY = slingshotY - height / 2;
    this.targetZoom = 1;
  }

  update(dt: number): void {
    // Smooth camera panning
    const panSpeed = 3 * dt;
    this.x += (this.targetX - this.x) * panSpeed;
    this.y += (this.targetY - this.y) * panSpeed;

    // Smooth zoom
    const zoomSpeed = 2 * dt;
    this.zoom += (this.targetZoom - this.zoom) * zoomSpeed;
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));

    // Update shake
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
    }
  }

  shake(intensity: number = 3, duration: number = 0.15): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  getShakeOffset(): { x: number; y: number } {
    if (this.shakeDuration <= 0) {
      return { x: 0, y: 0 };
    }
    const progress = this.shakeDuration / 0.15;
    const amount = this.shakeIntensity * progress;
    return {
      x: (Math.random() - 0.5) * amount * 2,
      y: (Math.random() - 0.5) * amount * 2,
    };
  }

  getTransform(): { x: number; y: number; zoom: number } {
    const shake = this.getShakeOffset();
    return {
      x: this.x + shake.x,
      y: this.y + shake.y,
      zoom: this.zoom,
    };
  }

  setZoomTarget(zoom: number): void {
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
  }
}
