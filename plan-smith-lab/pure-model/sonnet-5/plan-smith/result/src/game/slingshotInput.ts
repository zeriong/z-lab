export interface DragVector {
  dx: number;
  dy: number;
}

export interface LaunchVector {
  vx: number;
  vy: number;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
}

// 리스크 완화: 드래그-발사 속도 매핑이 과민/둔감하지 않도록 최대 드래그 거리를 클램핑한다.
// 초기값·임의 태그 — 첫 플레이테스트 후 조정.
export const MAX_DRAG_DISTANCE = 120;
export const POWER_MULTIPLIER = 0.18;

/**
 * 스텝 3 — 드래그 벡터를 최대 드래그 거리로 클램핑한다(경계값 처리).
 */
export function clampDrag(raw: DragVector): DragVector {
  const distance = Math.hypot(raw.dx, raw.dy);
  if (distance <= MAX_DRAG_DISTANCE || distance === 0) return raw;
  const scale = MAX_DRAG_DISTANCE / distance;
  return { dx: raw.dx * scale, dy: raw.dy * scale };
}

// 드래그는 앵커에서 뒤로 당기는 방향이므로, 발사 벡터는 드래그의 반대 방향이다.
export function dragToLaunchVector(drag: DragVector): LaunchVector {
  const clamped = clampDrag(drag);
  return {
    vx: -clamped.dx * POWER_MULTIPLIER,
    vy: -clamped.dy * POWER_MULTIPLIER,
  };
}

/**
 * 궤적 예측선(표면 5). quality floor: 드래그 중 실시간 갱신되는 곡선이 실제 발사 궤적과
 * 동일한 물리식을 사용해 오차 없이 일치해야 한다.
 * Matter.js Engine.update 내부의 속도 적분(현재 속도에 gravity.y * gravity.scale을 더한 뒤
 * 위치에 반영하는 semi-implicit Euler 방식)과 동일한 방식으로 시뮬레이션한다.
 */
export function predictTrajectory(
  origin: { x: number; y: number },
  launch: LaunchVector,
  gravityY: number,
  gravityScale = 0.001,
  steps = 30
): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = [];
  let vx = launch.vx;
  let vy = launch.vy;
  let x = origin.x;
  let y = origin.y;
  for (let i = 0; i < steps; i += 1) {
    vy += gravityY * gravityScale;
    x += vx;
    y += vy;
    points.push({ x, y });
  }
  return points;
}

export function isWithinAnchorRadius(
  point: { x: number; y: number },
  anchor: { x: number; y: number },
  radius: number
): boolean {
  return Math.hypot(point.x - anchor.x, point.y - anchor.y) <= radius;
}
