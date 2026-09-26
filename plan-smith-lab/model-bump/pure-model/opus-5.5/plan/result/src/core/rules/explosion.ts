import type { ExplosionSpec } from '../../config/catalog';

/**
 * 폭발 (§5.6). 폭탄 새와 TNT가 같은 함수를 쓴다.
 * AABB로 후보를 조회한 뒤 중심 간 거리 d로 거른다. 가림(엄폐)은 계산하지 않는다.
 */
export interface ExplosionHit {
  /** 정규화된 방향 (바디 중심 − 폭발 중심) */
  dirX: number;
  dirY: number;
  distance: number;
  falloff: number;
  /** N·s */
  impulse: number;
  damage: number;
}

export function explosionFalloff(d: number, radius: number): number {
  if (radius <= 0 || d >= radius) return 0;
  return 1 - d / radius;
}

/** 폭발 중심(cx, cy)과 바디 중심(bx, by)이 주어졌을 때의 충격량과 데미지. 반경 밖이면 null */
export function explosionHit(cx: number, cy: number, bx: number, by: number, spec: ExplosionSpec): ExplosionHit | null {
  const dx = bx - cx;
  const dy = by - cy;
  const d = Math.hypot(dx, dy);
  const f = explosionFalloff(d, spec.radius);
  if (f <= 0) return null;
  const dirX = d > 1e-6 ? dx / d : 0;
  const dirY = d > 1e-6 ? dy / d : -1;
  return {
    dirX,
    dirY,
    distance: d,
    falloff: f,
    impulse: spec.impulseMax * f,
    damage: spec.damageMax * f,
  };
}
