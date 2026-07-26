import type { Point } from "../render/camera";

/**
 * 실제 충돌을 일으키지 않는 "그림자 시뮬레이션"으로 궤적 예측점을 계산한다.
 * Matter.js의 Verlet 적분(velocity = velocity*frictionAir + accel*dt^2)과
 * 동일한 상수를 사용해 실제 발사 궤적과 최대한 가깝게 맞춘다.
 */
export function computeTrajectory(
  anchor: Point,
  velocity: Point,
  opts: { steps?: number; dt?: number; gravityY?: number; gravityScale?: number; frictionAir?: number } = {}
): Point[] {
  const steps = opts.steps ?? 26;
  const dt = opts.dt ?? 1000 / 60;
  const gravityY = opts.gravityY ?? 1.0;
  const gravityScale = opts.gravityScale ?? 0.001;
  const frictionAir = opts.frictionAir ?? 0.01;

  const dtSq = dt * dt;
  const accelY = gravityY * gravityScale * dtSq;
  const frictionFactor = 1 - frictionAir * (dt / (1000 / 60));

  let vx = velocity.x;
  let vy = velocity.y;
  let x = anchor.x;
  let y = anchor.y;

  const points: Point[] = [];
  // 매 3스텝마다 점 하나씩 찍어 촘촘하지 않게 (시각적으로 자연스러운 간격)
  const sampleEvery = 3;
  for (let i = 1; i <= steps * sampleEvery; i++) {
    vx *= frictionFactor;
    vy = vy * frictionFactor + accelY;
    x += vx;
    y += vy;
    if (i % sampleEvery === 0) points.push({ x, y });
  }
  return points;
}
