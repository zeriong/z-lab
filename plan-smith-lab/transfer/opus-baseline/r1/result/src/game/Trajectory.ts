export interface TrajectoryPoint {
  x: number;
  y: number;
}

export class Trajectory {
  static predictTrajectory(
    startX: number,
    startY: number,
    vx: number,
    vy: number,
    gravity: number,
    frictionAir: number,
    maxPoints: number = 12
  ): TrajectoryPoint[] {
    const points: TrajectoryPoint[] = [];
    const dt = 1 / 60; // 60Hz
    const pointInterval = 6; // Sample every 6 frames

    let x = startX;
    let y = startY;
    let velocityX = vx;
    let velocityY = vy;

    for (let i = 0; i < maxPoints * pointInterval; i++) {
      // Verlet integration (same as Matter.js)
      velocityX = velocityX * (1 - frictionAir) + 0 * dt;
      velocityY = velocityY * (1 - frictionAir) + gravity * dt;

      x += velocityX * dt;
      y += velocityY * dt;

      if (i % pointInterval === 0) {
        points.push({ x, y });
      }

      // Stop if goes way out of bounds
      if (x < -500 || x > 1780 || y > 1000) {
        break;
      }
    }

    return points;
  }
}
