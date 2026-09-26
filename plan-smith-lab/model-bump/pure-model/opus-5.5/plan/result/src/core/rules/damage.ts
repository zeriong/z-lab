import { DAMAGE_K, DAMAGE_T, GRACE_SECONDS, WORLD_BOUNDS } from '../../config/constants';
import type { Vec } from '../math';
import type { BodyRole } from '../physics/world';

/** 충격량 → 데미지 (§5.4). 순수 함수만 둔다. */

export interface DamageParams {
  K: number;
  T: number;
}

export const DEFAULT_DAMAGE: DamageParams = { K: DAMAGE_K, T: DAMAGE_T };

/** 파괴 가능한 바디인가 (블록, 돼지, TNT). 새와 지형은 데미지를 받지 않는다. */
export function isDamageable(role: BodyRole): boolean {
  return role === 'block' || role === 'pig' || role === 'tnt';
}

/** damage = K × max(0, J − T) × factor */
export function impactDamage(impulse: number, factor = 1, p: DamageParams = DEFAULT_DAMAGE): number {
  return p.K * Math.max(0, impulse - p.T) * factor;
}

export interface ContactDamageInput {
  role: BodyRole;
  impulse: number;
  simTime: number;
  factor?: number;
  graceSeconds?: number;
  params?: DamageParams;
}

/** 접촉 한 건이 대상 바디에 주는 데미지. 유예 시간 동안과 새/지형에는 0 */
export function contactDamage(i: ContactDamageInput): number {
  if (!isDamageable(i.role)) return 0;
  if (i.simTime < (i.graceSeconds ?? GRACE_SECONDS)) return 0;
  return impactDamage(i.impulse, i.factor ?? 1, i.params ?? DEFAULT_DAMAGE);
}

/**
 * 관통(§6.5 3단계 "지붕을 관통해서 푼다", A5 "새는 두 번째 장에 닿을 때까지 진행").
 * post-solve 방식에서는 파괴될 블록도 그 스텝의 충돌 충격을 전부 새에게 돌려준다.
 * 그래서 새와의 접촉으로 바디가 파괴되면, 초과 데미지 비율만큼 충돌 전 속도를 되살린다.
 * keep = clamp(1 − hpBefore / damage, 0, 0.95)
 */
export function breakthroughKeep(hpBefore: number, damage: number): number {
  if (damage <= 0 || hpBefore <= 0) return 0.95;
  return Math.max(0, Math.min(0.95, 1 - hpBefore / damage));
}

/** 충돌 전 속도 × keep과 물리 결과 속도 중 더 빠른 쪽 (m/s) */
export function breakthroughVelocity(pre: Vec, post: Vec, keep: number): Vec {
  const cand = { x: pre.x * keep, y: pre.y * keep };
  return Math.hypot(cand.x, cand.y) > Math.hypot(post.x, post.y) ? cand : post;
}

/** 월드 이탈: x < -300, x > 2220, y > 1300. 위쪽(y < 0)은 이탈이 아니다. */
export function isOutOfBounds(x: number, y: number, b = WORLD_BOUNDS): boolean {
  return x < b.minX || x > b.maxX || y > b.maxY;
}

/** 손상 단계: 0(멀쩡) / 1(66% 이하) / 2(33% 이하) */
export function damageStage(hp: number, maxHp: number): 0 | 1 | 2 {
  const r = maxHp > 0 ? hp / maxHp : 0;
  if (r <= 1 / 3) return 2;
  if (r <= 2 / 3) return 1;
  return 0;
}
