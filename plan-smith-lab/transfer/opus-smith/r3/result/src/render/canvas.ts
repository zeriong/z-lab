export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;

  constructor() {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }
    this.canvas = canvas;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;

    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;

    this.canvas.width = Math.floor(rect.width * this.dpr);
    this.canvas.height = Math.floor(rect.height * this.dpr);

    this.ctx.scale(this.dpr, this.dpr);
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getWidth(): number {
    return this.canvas.width / this.dpr;
  }

  getHeight(): number {
    return this.canvas.height / this.dpr;
  }

  getDPR(): number {
    return this.dpr;
  }

  clear(color: string = 'white'): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.getWidth(), this.getHeight());
  }

  drawRect(x: number, y: number, w: number, h: number, angle: number, color: string): void {
    this.ctx.save();
    this.ctx.translate(x + w / 2, y + h / 2);
    this.ctx.rotate(angle);
    this.ctx.fillStyle = color;
    this.ctx.fillRect(-w / 2, -h / 2, w, h);
    this.ctx.restore();
  }

  drawCircle(x: number, y: number, r: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawPolygon(points: [number, number][], color: string): void {
    if (points.length < 2) return;

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i][0], points[i][1]);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawLine(x1: number, y1: number, x2: number, y2: number, color: string, width: number = 1): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }

  drawDottedLine(x1: number, y1: number, x2: number, y2: number, color: string, width: number = 1): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.setLineDash([4, 4]);
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  drawText(text: string, x: number, y: number, color: string, size: number = 16, font: string = 'Arial'): void {
    this.ctx.fillStyle = color;
    this.ctx.font = `${size}px ${font}`;
    this.ctx.textAlign = 'left';
    this.ctx.fillText(text, x, y);
  }
}
