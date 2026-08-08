// B8 — 궤적 예측 표시
//
// 실제 발사와 같은 변환·같은 중력 상수를 쓴다. 두 값이 갈라지면
// 예측 궤적이 거짓말을 하게 되므로 units 모듈 한 곳에서만 읽는다.

import { GRAVITY_PX_PER_SEC2, dragToLaunchVelocity } from '../physics/units';

/** 표시할 점 개수. */
export const TRAJECTORY_DOTS = 12;

/** 점 사이 시간 간격(초). */
export const TRAJECTORY_DT = 0.085;

export interface Point {
  x: number;
  y: number;
}

export function predictTrajectory(
  originX: number,
  originY: number,
  dragX: number,
  dragY: number,
  gravity: number,
  dots = TRAJECTORY_DOTS,
): Point[] {
  const { vx, vy } = dragToLaunchVelocity(dragX, dragY);
  const g = GRAVITY_PX_PER_SEC2 * gravity;
  const pts: Point[] = [];
  for (let i = 1; i <= dots; i++) {
    const t = i * TRAJECTORY_DT;
    pts.push({
      x: originX + vx * t,
      y: originY + vy * t + 0.5 * g * t * t,
    });
  }
  return pts;
}
