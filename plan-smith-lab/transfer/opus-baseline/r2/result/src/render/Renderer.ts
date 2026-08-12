import { Camera } from '../core/Camera';
import { Level } from '../game/Level';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, camera: Camera) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.camera = camera;
  }

  render(level: Level, alpha: number): void {
    // Clear canvas
    this.ctx.fillStyle = '#87CEEB';
    this.ctx.fillRect(0, 0, this.canvas.width / (window.devicePixelRatio || 1), this.canvas.height / (window.devicePixelRatio || 1));

    // Draw background
    this.drawBackground();

    // Save context state
    this.ctx.save();

    // Apply camera transform
    const scale = this.camera.zoom;
    this.ctx.scale(scale, scale);
    this.ctx.translate(-this.camera.x, -this.camera.y);

    // Render level
    level.render(this.ctx, this.camera.x, this.camera.y);

    // Restore context state
    this.ctx.restore();
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height / (window.devicePixelRatio || 1));
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width / (window.devicePixelRatio || 1), this.canvas.height / (window.devicePixelRatio || 1));
  }

  dispose(): void {
    // Cleanup
  }
}
