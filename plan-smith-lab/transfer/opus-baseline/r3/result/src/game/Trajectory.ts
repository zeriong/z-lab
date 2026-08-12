import { Vector } from '../core/types';
import { PhysicsWorld } from '../physics/PhysicsWorld';

export class Trajectory {
  private points: Vector[] = [];

  calculate(startPos: Vector, velocity: Vector, maxPoints: number): Vector[] {
    this.points = [];

    const gravity = 1.0;
    const airFriction = 0.99;
    const dt = 1 / 60;
    const frameInterval = 6; // Every 6 frames

    let x = startPos.x;
    let y = startPos.y;
    let vx = velocity.x;
    let vy = velocity.y;

    let frameCount = 0;
    let pointCount = 0;

    while (pointCount < maxPoints) {
      // Simulate using discrete integration (match physics engine)
      vy += gravity * dt;
      vx *= airFriction;
      vy *= airFriction;

      x += vx * dt;
      y += vy * dt;

      frameCount++;

      if (frameCount % frameInterval === 0) {
        this.points.push({ x, y });
        pointCount++;
      }

      // Stop if out of bounds
      if (y > 800 || x > 3000 || x < 0) {
        break;
      }
    }

    return this.points;
  }

  getPoints(): Vector[] {
    return this.points;
  }
}
