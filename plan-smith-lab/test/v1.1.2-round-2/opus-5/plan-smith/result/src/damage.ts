/**
 * 재료·데미지 (§1-A R2 "충돌·데미지·파괴").
 *
 * 데미지 = (상대 속도)^2 × DAMAGE_SCALE × (상대 바디의 attack 계수)
 *  - 질량 항이 없다 → 정적 바디의 무한 질량이 계산에 섞여 NaN 이 되는 경로가 코드에 없다(§7-A 제약 2).
 *  - 재료별 임계값 이하는 무시 → 가만히 쌓인 구조물이 정착 충격으로 스스로 붕괴하지 않는다(§9).
 */

import type Matter from 'matter-js';
import { metaOf, type Meta } from './physics';
import type { Vec2 } from './types';
import { DAMAGE_SCALE, IMPACT_FX_MIN } from './tuning';

export interface DamageHooks {
  onBlockDestroyed(body: Matter.Body, meta: Meta, at: Vec2, impact: number): void;
  onPigDestroyed(body: Matter.Body, meta: Meta, at: Vec2, impact: number): void;
  onDamaged(body: Matter.Body, meta: Meta, at: Vec2, impact: number): void;
  onImpact(at: Vec2, impact: number): void;
}

function contactPoint(pair: Matter.Pair): Vec2 {
  const contacts = (pair as unknown as { contacts?: Array<{ vertex?: Vec2 }> }).contacts;
  if (contacts && contacts.length > 0 && contacts[0].vertex) {
    return { x: contacts[0].vertex.x, y: contacts[0].vertex.y };
  }
  const a = pair.bodyA.position;
  const b = pair.bodyB.position;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** 파괴 가능한 대상인가 (hp 가 유한한 것만) */
function isDestructible(meta: Meta | undefined): meta is Meta {
  return !!meta && Number.isFinite(meta.hp) && !meta.dead;
}

function applyTo(
  body: Matter.Body,
  meta: Meta,
  amount: number,
  at: Vec2,
  impact: number,
  hooks: DamageHooks,
): void {
  if (amount < meta.threshold) return; // 임계 이하 무시
  meta.hp -= amount;
  if (meta.hp <= 0) {
    meta.dead = true;
    if (meta.kind === 'pig') hooks.onPigDestroyed(body, meta, at, impact);
    else hooks.onBlockDestroyed(body, meta, at, impact);
  } else {
    hooks.onDamaged(body, meta, at, impact);
  }
}

/** collisionStart 한 쌍 처리 */
export function resolvePair(pair: Matter.Pair, hooks: DamageHooks): void {
  const a = pair.bodyA;
  const b = pair.bodyB;
  const ma = metaOf(a);
  const mb = metaOf(b);
  if (!ma || !mb) return;

  const rvx = a.velocity.x - b.velocity.x;
  const rvy = a.velocity.y - b.velocity.y;
  const rel = Math.hypot(rvx, rvy);
  const impact = rel * rel * DAMAGE_SCALE;
  if (!Number.isFinite(impact) || impact <= 0) return;

  const at = contactPoint(pair);

  if (isDestructible(ma)) applyTo(a, ma, impact * mb.attack, at, impact, hooks);
  if (isDestructible(mb)) applyTo(b, mb, impact * ma.attack, at, impact, hooks);

  if (impact >= IMPACT_FX_MIN) hooks.onImpact(at, impact);
}

export function resolvePairs(pairs: Matter.Pair[], hooks: DamageHooks): void {
  for (const pair of pairs) resolvePair(pair, hooks);
}
