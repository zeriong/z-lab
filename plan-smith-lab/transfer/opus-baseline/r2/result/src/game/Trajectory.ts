export interface TrajectoryPoint {
  x: number;
  y: number;
}

export class Trajectory {
  private points: TrajectoryPoint[] = [];
  private readonly airFriction = 0.99;
  private readonly gravity = 1;
  private readonly frameStep = 6; // Calculate every 6 frames

  predictTrajectory(
    startX: number,
    startY: number,
    vx: number,
    vy: number,
    steps: number = 8
  ): TrajectoryPoint[] {
    this.points = [];

    let x = startX;
    let y = startY;
    let velX = vx;
    let velY = vy;

    const dt = 1 / 60;

    for (let i = 0; i < steps * this.frameStep; i++) {
      // Verlet integration with air friction (same as Matter.js)
      velX *= this.airFriction;
      velY *= this.airFriction;
      velY += this.gravity * dt;

      x += velX * dt;
      y += velY * dt;

      // Record every frameStep iterations
      if (i % this.frameStep === 0) {
        this.points.push({ x, y });
      }

      // Stop if out of bounds
      if (y > 800) break;
    }

    return this.points;
  }

  render(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number, alpha: number = 1): void {
    if (this.points.length === 0) return;

    ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * alpha})`;
    ctx.lineWidth = 2;

    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i];
      const screenX = point.x - offsetX;
      const screenY = point.y - offsetY;

      ctx.fillStyle = `rgba(255, 255, 255, ${(0.3 * (i / this.points.length)) * alpha})`;
      ctx.beginPath();
      ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  getPoints(): TrajectoryPoint[] {
    return this.points;
  }

  clear(): void {
    this.points = [];
  }
}
