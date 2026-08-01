import type { Vec2 } from '../core/Camera';

/**
 * 궤적 예측 (플랜 §5).
 * 엔진을 미리 돌리지 않고 해석식으로 점을 찍는다. 충돌은 무시 — 목적은 조준 보조.
 * 단위는 "스텝": vx, vy는 px/step, g는 px/step².
 */
export function predictTrajectory(
  x0: number,
  y0: number,
  vx: number,
  vy: number,
  gPerStep: number,
  points: number,
  stepsPerPoint = 5,
): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 1; i <= points; i++) {
    const n = i * stepsPerPoint;
    out.push({
      x: x0 + vx * n,
      y: y0 + vy * n + 0.5 * gPerStep * n * n,
    });
  }
  return out;
}
