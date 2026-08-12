import {
  MIN_DRAG_DISTANCE,
  MAX_PULL,
  PULL_TO_VELOCITY_SCALE,
  TRAJECTORY_POINTS,
  TRAJECTORY_TIME_STEP_S,
  TRAJECTORY_GRAVITY_PX_S2,
} from '../config.js';

/**
 * 계획서 §4-2: 드래그 중 "지금 쏘면"의 포물선을 순수 수학 공식으로 예측한다.
 * Matter 시뮬레이션을 굴리지 않고, 빈 공간에서의 이상적 탄도만 계산한다(구조물 충돌은 고려하지 않음).
 *
 * @param {{x: number, y: number}} anchor
 * @param {{x: number, y: number}} birdPos - 현재 당겨진 새의 위치
 * @returns {{x: number, y: number}[]} - 예측 지점들 (빈 배열이면 최소 드래그 거리 미달)
 */
export function predictTrajectory(anchor, birdPos) {
  const pullX = anchor.x - birdPos.x;
  const pullY = anchor.y - birdPos.y;
  const dist = Math.hypot(pullX, pullY);
  if (dist < MIN_DRAG_DISTANCE) return [];

  const dirX = pullX / dist;
  const dirY = pullY / dist;
  const clampedDist = Math.min(dist, MAX_PULL);
  const speed = clampedDist * PULL_TO_VELOCITY_SCALE; // px/s
  const vx = dirX * speed;
  const vy = dirY * speed;

  const points = [];
  for (let i = 1; i <= TRAJECTORY_POINTS; i += 1) {
    const t = i * TRAJECTORY_TIME_STEP_S;
    points.push({
      x: birdPos.x + vx * t,
      y: birdPos.y + vy * t + 0.5 * TRAJECTORY_GRAVITY_PX_S2 * t * t,
    });
  }
  return points;
}
