import type Body from 'matter-js/Build/Body';

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private dpr: number;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.scale(this.dpr, this.dpr);
  }

  clear(): void {
    this.ctx.fillStyle = '#87CEEB';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawGround(polygon: Array<[number, number]>): void {
    this.ctx.fillStyle = '#8B7355';
    this.ctx.beginPath();
    this.ctx.moveTo(polygon[0][0], polygon[0][1]);
    for (let i = 1; i < polygon.length; i++) {
      this.ctx.lineTo(polygon[i][0], polygon[i][1]);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawBody(body: Body, color: string = '#333'): void {
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 1;

    this.ctx.save();
    this.ctx.translate(body.position.x, body.position.y);
    this.ctx.rotate(body.angle);

    const vertices = body.vertices;
    if (vertices && vertices.length > 0) {
      this.ctx.beginPath();
      const x = vertices[0].x - body.position.x;
      const y = vertices[0].y - body.position.y;
      this.ctx.moveTo(x, y);
      for (let i = 1; i < vertices.length; i++) {
        const vx = vertices[i].x - body.position.x;
        const vy = vertices[i].y - body.position.y;
        this.ctx.lineTo(vx, vy);
      }
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawCircle(x: number, y: number, radius: number, color: string = '#333'): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawLine(x1: number, y1: number, x2: number, y2: number, color: string = '#000', width: number = 1): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }

  drawText(text: string, x: number, y: number, color: string = '#fff', size: number = 16): void {
    this.ctx.fillStyle = color;
    this.ctx.font = `${size}px Arial`;
    this.ctx.fillText(text, x, y);
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  getWorldToScreenPosition(worldX: number, worldY: number, offsetX: number = 0, offsetY: number = 0, scale: number = 1): [number, number] {
    return [
      (worldX - offsetX) * scale + this.width / 2,
      (worldY - offsetY) * scale + this.height / 2
    ];
  }

  getScreenToWorldPosition(screenX: number, screenY: number, offsetX: number = 0, offsetY: number = 0, scale: number = 1): [number, number] {
    return [
      (screenX - this.width / 2) / scale + offsetX,
      (screenY - this.height / 2) / scale + offsetY
    ];
  }
}
