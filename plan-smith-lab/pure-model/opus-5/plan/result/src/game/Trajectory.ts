import type { IntegrationParams } from '../physics/PhysicsWorld';

export interface TrajectoryPoint {
  x: number;
  y: number;
}

export interface TrajectoryOptions {
  startX: number;
  startY: number;
  vx: number;
  vy: number;
  frictionAir: number;
  integration: IntegrationParams;
  /** How many dots to draw (difficulty dial, plan §5.2). */
  dots: number;
  /** Simulation steps between two dots. */
  stepsPerDot?: number;
  /** Stop early once the prediction sinks below this y (ground line). */
  stopBelowY?: number;
}

/**
 * Predicted flight path (plan §5.2).
 *
 * This deliberately mirrors the engine's DISCRETE integration:
 *   v(n+1) = v(n) * (1 - frictionAir) + gravityPerStep
 *   p(n+1) = p(n) + v(n+1)
 * The closed-form parabola (y = v·t - ½gt²) drifts visibly from the real path
 * because of air friction, so it is banned here.
 *
 * Collisions are intentionally NOT simulated: predicting them away would
 * remove the whole skill component.
 */
export function predictTrajectory(options: TrajectoryOptions): TrajectoryPoint[] {
  const { integration } = options;
  const stepsPerDot = options.stepsPerDot ?? 6;
  const damping = 1 - options.frictionAir;
  const gravity = integration.gravityPerStep;

  const points: TrajectoryPoint[] = [];
  let x = options.startX;
  let y = options.startY;
  let vx = options.vx;
  let vy = options.vy;

  const totalSteps = options.dots * stepsPerDot;
  for (let i = 1; i <= totalSteps; i += 1) {
    vx *= damping;
    vy = vy * damping + gravity;
    x += vx;
    y += vy;
    if (i % stepsPerDot === 0) {
      points.push({ x, y });
      if (options.stopBelowY !== undefined && y > options.stopBelowY) break;
    }
  }
  return points;
}
