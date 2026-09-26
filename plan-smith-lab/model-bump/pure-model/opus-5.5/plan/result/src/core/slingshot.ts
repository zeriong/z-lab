import {
  GRAB_RADIUS,
  GROUND_Y,
  L_MAX,
  L_MIN,
  SLINGSHOT_ANCHOR_HEIGHT,
  V_MAX,
} from '../config/constants';
import type { Vec } from './math';
import { len } from './math';

/** 당김 → 속도 (§5.1). 순수 함수. 위치는 px, 속도는 m/s. */

export function anchorFor(slingX: number): Vec {
  return { x: slingX, y: GROUND_Y - SLINGSHOT_ANCHOR_HEIGHT };
}

/** READY에서 포인터 다운 위치가 앵커로부터 GRAB_RADIUS 이내일 때만 드래그를 시작한다 */
export function canGrab(pointer: Vec, anchor: Vec, radius = GRAB_RADIUS): boolean {
  return Math.hypot(pointer.x - anchor.x, pointer.y - anchor.y) <= radius;
}

/** |p|를 lMax에서 클램프한다. 방향 제한은 없다(뒤로 쏘기 허용). */
export function clampPull(p: Vec, lMax = L_MAX): Vec {
  const l = len(p);
  if (l <= lMax || l === 0) return { x: p.x, y: p.y };
  const k = lMax / l;
  return { x: p.x * k, y: p.y * k };
}

/** 포인터 위치 → 당김 벡터(클램프 포함) */
export function pullFromPointer(pointer: Vec, anchor: Vec, lMax = L_MAX): Vec {
  return clampPull({ x: pointer.x - anchor.x, y: pointer.y - anchor.y }, lMax);
}

/** 놓을 때 |p| < L_min이면 발사를 취소한다 */
export function isCancelPull(p: Vec, lMin = L_MIN): boolean {
  return len(p) < lMin;
}

/** v = −p / L_max × V_max (선형, 클램프 후). 결과는 m/s */
export function pullToVelocity(p: Vec, lMax = L_MAX, vMax = V_MAX): Vec {
  const c = clampPull(p, lMax);
  const k = -vMax / lMax;
  return { x: c.x * k, y: c.y * k };
}

/**
 * 발사 순간 새 바디를 만드는 위치 = 주머니 위치(앵커 + 당김).
 * 아래로 당겨 새가 지면에 파묻히지 않도록 y만 지면 위로 제한한다.
 */
export function launchPosition(anchor: Vec, p: Vec, birdRadius: number, lMax = L_MAX): Vec {
  const c = clampPull(p, lMax);
  const maxY = GROUND_Y - birdRadius - 1;
  return { x: anchor.x + c.x, y: Math.min(anchor.y + c.y, maxY) };
}

/** 고무줄 두께: 당김이 클수록 가늘다 (시각 전용) */
export function bandWidth(pullLen: number, lMax = L_MAX): number {
  const t = Math.max(0, Math.min(1, pullLen / lMax));
  return 9 - 5 * t;
}
