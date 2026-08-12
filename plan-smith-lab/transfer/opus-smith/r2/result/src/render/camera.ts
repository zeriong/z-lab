import type Body from 'matter-js/Build/Body';

export class Camera {
  private targetX: number = 0;
  private targetY: number = 0;
  private currentX: number = 0;
  private currentY: number = 0;
  private zoom: number = 1;
  private minZoom: number = 0.5;
  private maxZoom: number = 2;
  private isTracking: boolean = false;
  private shakeAmount: number = 0;
  private shakeTimer: number = 0;

  setUp(x: number, y: number, minZoom: number, maxZoom: number): void {
    this.targetX = x;
    this.targetY = y;
    this.currentX = x;
    this.currentY = y;
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
    this.zoom = 1;
  }

  startTracking(body: Body): void {
    this.isTracking = true;
    this.targetX = body.position.x;
    this.targetY = body.position.y;
  }

  stopTracking(): void {
    this.isTracking = false;
  }

  update(body: Body | null, dt: number): void {
    if (this.isTracking && body) {
      // Position body at left third of screen
      this.targetX = body.position.x;
      this.targetY = body.position.y;
    } else if (!this.isTracking) {
      // Return to slingshot position
      const speed = 1.5; // 1.5x speed
      const diffX = this.targetX - this.currentX;
      const diffY = this.targetY - this.currentY;
      if (Math.abs(diffX) > 1 || Math.abs(diffY) > 1) {
        this.currentX += diffX * speed * dt / 1000;
        this.currentY += diffY * speed * dt / 1000;
      } else {
        this.currentX = this.targetX;
        this.currentY = this.targetY;
      }
    } else {
      // Smooth follow
      const speed = 0.1;
      this.currentX += (this.targetX - this.currentX) * speed;
      this.currentY += (this.targetY - this.currentY) * speed;
    }

    // Update shake
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
    } else {
      this.shakeAmount = 0;
    }
  }

  shake(duration: number = 150): void {
    this.shakeAmount = 3;
    this.shakeTimer = duration;
  }

  getShakeOffset(): [number, number] {
    if (this.shakeAmount === 0) return [0, 0];
    return [
      (Math.random() - 0.5) * this.shakeAmount,
      (Math.random() - 0.5) * this.shakeAmount
    ];
  }

  reset(): void {
    this.isTracking = false;
    this.shakeAmount = 0;
    this.shakeTimer = 0;
  }

  setZoom(zoom: number): void {
    this.zoom = Math.max(this.minZoom, Math.min(zoom, this.maxZoom));
  }

  getX(): number {
    return this.currentX;
  }

  getY(): number {
    return this.currentY;
  }

  getZoom(): number {
    return this.zoom;
  }
}
