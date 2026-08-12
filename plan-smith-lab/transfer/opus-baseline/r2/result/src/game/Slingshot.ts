import { Bird } from './entities/Bird';
import { Input, InputEvent } from '../core/Input';
import { Camera } from '../core/Camera';

export interface SlingshotConfig {
  x: number;
  y: number;
  maxPull: number;
  power: number;
}

export class Slingshot {
  config: SlingshotConfig;
  currentBird: Bird | null = null;
  isDragging: boolean = false;
  pullX: number = 0;
  pullY: number = 0;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private input: Input;
  private camera: Camera;
  private hitRadius: number = 40;

  constructor(config: SlingshotConfig, input: Input, camera: Camera) {
    this.config = config;
    this.input = input;
    this.camera = camera;

    this.input.on('pointerdown', (e) => this.onPointerDown(e));
    this.input.on('pointermove', (e) => this.onPointerMove(e));
    this.input.on('pointerup', (e) => this.onPointerUp(e));
  }

  setBird(bird: Bird): void {
    this.currentBird = bird;
    this.isDragging = false;
    this.pullX = 0;
    this.pullY = 0;
  }

  private onPointerDown(e: InputEvent): void {
    if (!e.x || !e.y || !this.currentBird) return;

    const worldPos = this.input.getCanvasPosition(e.x, e.y);
    const dist = Math.hypot(
      worldPos.x - this.config.x,
      worldPos.y - this.config.y
    );

    if (dist < this.hitRadius) {
      this.isDragging = true;
      this.dragStartX = worldPos.x;
      this.dragStartY = worldPos.y;
    }
  }

  private onPointerMove(e: InputEvent): void {
    if (!e.x || !e.y || !this.isDragging || !this.currentBird) return;

    const worldPos = this.input.getCanvasPosition(e.x, e.y);
    let dx = this.config.x - worldPos.x;
    let dy = this.config.y - worldPos.y;

    const distance = Math.hypot(dx, dy);
    if (distance > this.config.maxPull) {
      const scale = this.config.maxPull / distance;
      dx *= scale;
      dy *= scale;
    }

    // Limit angle (can only pull up/back)
    const angle = Math.atan2(dy, dx);
    const angleNorm = angle % (Math.PI * 2);
    if (angleNorm > Math.PI / 2 && angleNorm < (3 * Math.PI) / 2) {
      // Pulling forward, cancel
      this.isDragging = false;
      this.pullX = 0;
      this.pullY = 0;
      return;
    }

    this.pullX = dx;
    this.pullY = dy;
  }

  private onPointerUp(e: InputEvent): void {
    if (!this.isDragging || !this.currentBird) return;

    const distance = Math.hypot(this.pullX, this.pullY);
    if (distance < 10) {
      // Too short, cancel
      this.isDragging = false;
      this.pullX = 0;
      this.pullY = 0;
      return;
    }

    this.isDragging = false;
    const impulseX = this.pullX * this.config.power;
    const impulseY = this.pullY * this.config.power;

    return;
  }

  getLaunchImpulse(): { x: number; y: number } | null {
    if (!this.isDragging || !this.currentBird) return null;

    const impulseX = this.pullX * this.config.power;
    const impulseY = this.pullY * this.config.power;

    return { x: impulseX, y: impulseY };
  }

  render(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number): void {
    const x = this.config.x - offsetX;
    const y = this.config.y - offsetY;

    // Draw slingshot stand
    ctx.fillStyle = '#654321';
    ctx.fillRect(x - 20, y - 40, 40, 80);

    // Draw slingshot arms
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - 15, y - 30);
    ctx.quadraticCurveTo(x - 20, y + 10, x - 25, y + 20);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 15, y - 30);
    ctx.quadraticCurveTo(x + 20, y + 10, x + 25, y + 20);
    ctx.stroke();

    // Draw rubber band
    if (this.currentBird) {
      ctx.strokeStyle = '#FF4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 25, y + 20);
      ctx.lineTo(this.currentBird.x - offsetX, this.currentBird.y - offsetY);
      ctx.lineTo(x + 25, y + 20);
      ctx.stroke();

      // Draw pull indicator
      if (this.isDragging) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.currentBird.x - offsetX, this.currentBird.y - offsetY, 15, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  dispose(): void {
    this.input.off('pointerdown', (e) => this.onPointerDown(e));
    this.input.off('pointermove', (e) => this.onPointerMove(e));
    this.input.off('pointerup', (e) => this.onPointerUp(e));
  }
}
