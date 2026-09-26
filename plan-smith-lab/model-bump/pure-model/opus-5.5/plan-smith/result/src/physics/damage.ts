// collisionStart → HP → 제거 큐 (§4.5)
// 제거는 여기서 하지 않는다. 큐에 넣고 Engine.update 뒤 session.flushRemovals()가 처리한다.
import type { Body, IEventCollision, Engine } from 'matter-js';
import { BIRDS, DMG_K, GRACE_STEPS, IMPACT_SOUND_GAP, V_MIN } from '../config';
import type { Entity } from '../types';
import { isDamageable } from './entities';
import type { StageSession } from './session';
import { onBirdCollision } from '../game/birds';

/** 두 바디의 법선 방향 상대 속도 */
export function impactSpeed(a: Body, b: Body, normal: { x: number; y: number }): number {
  const rvx = a.velocity.x - b.velocity.x;
  const rvy = a.velocity.y - b.velocity.y;
  return Math.abs(rvx * normal.x + rvy * normal.y);
}

/** 질량비 항: 2·m_other/(m_X + m_other). 상대가 정적이면 2 */
export function massFactor(target: Body, other: Body): number {
  if (other.isStatic || !Number.isFinite(other.mass)) return 2;
  return (2 * other.mass) / (target.mass + other.mass);
}

/** 공격자가 새일 때 표적 재질에 대한 배율 */
export function attackMultiplier(attacker: Entity | undefined, target: Entity): number {
  if (!attacker || attacker.kind !== 'bird' || target.kind !== 'block') return 1;
  return BIRDS[attacker.birdType].attackMul[target.material] ?? 1;
}

/** 충돌 한 번으로 X가 받는 데미지 (§4.5) */
export function collisionDamage(
  target: Body,
  other: Body,
  impact: number,
  targetEntity: Entity,
  otherEntity: Entity | undefined,
): number {
  if (impact < V_MIN) return 0;
  return (impact - V_MIN) * DMG_K * massFactor(target, other) * attackMultiplier(otherEntity, targetEntity);
}

/** HP를 깎고, 0 이하가 되면 제거 큐에 넣는다. 유예 기간에는 무시 */
export function applyDamage(session: StageSession, bodyId: number, amount: number): void {
  if (amount <= 0) return;
  if (session.stepCount < GRACE_STEPS) return;
  const e = session.registry.get(bodyId);
  if (!isDamageable(e)) return;
  if (e.hp <= 0) return; // 이미 큐에 들어감
  e.hp -= amount;
  if (e.hp <= 0) session.queueRemoval(bodyId, 'destroyed');
}

export function handleCollisionStart(session: StageSession, event: IEventCollision<Engine>): void {
  for (const pair of event.pairs) {
    const a = pair.bodyA.parent;
    const b = pair.bodyB.parent;
    const ea = session.registry.get(a.id);
    const eb = session.registry.get(b.id);

    if (ea?.kind === 'bird') onBirdCollision(session, a);
    if (eb?.kind === 'bird') onBirdCollision(session, b);

    const normal = pair.collision.normal;
    const impact = impactSpeed(a, b, normal);
    if (impact < V_MIN) continue;

    if (session.stepCount >= GRACE_STEPS && session.stepCount - session.lastImpactSoundStep >= IMPACT_SOUND_GAP) {
      session.lastImpactSoundStep = session.stepCount;
      session.hooks.onSound?.('impact', Math.min(1, impact / 20));
    }

    if (isDamageable(ea)) applyDamage(session, a.id, collisionDamage(a, b, impact, ea, eb));
    if (isDamageable(eb)) applyDamage(session, b.id, collisionDamage(b, a, impact, eb, ea));
  }
}
