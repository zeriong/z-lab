// B4/B5/B6: collisionStart에서 충격량 계산 → HP 차감 → 0이면 제거 + 점수. 하중 경로 hop 4.
import Matter from 'matter-js';
import { getMeta, removeBody, type MBody, type StageWorld } from './physics';
import { TUNING, type EntityMeta, type Vec2 } from './types';

const { Events } = Matter;

export interface DamageEvents {
  /** 임계 이상 충돌마다(피해 여부 무관). 소리·먼지용. */
  onImpact(impact: number, at: Vec2): void;
  onBlockBreak(body: MBody, meta: EntityMeta, at: Vec2): void;
  onPigRemoved(body: MBody, meta: EntityMeta, at: Vec2): void;
  /** 점수 변동. HUD가 즉시 반영한다. */
  onScore(total: number, delta: number): void;
}

/**
 * 충격량 = 상대속도 × 유효질량(1/(1/mA + 1/mB)). static body는 질량 무한 → 상대 body 질량 그대로.
 * collisionStart는 해소 전에 발화하므로 velocity는 충돌 직전 값이다.
 */
export function computeImpact(a: MBody, b: MBody): number {
  const rel = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
  const ia = a.isStatic || !Number.isFinite(a.mass) ? 0 : 1 / a.mass;
  const ib = b.isStatic || !Number.isFinite(b.mass) ? 0 : 1 / b.mass;
  const inv = ia + ib;
  if (inv === 0) return 0;
  return rel / inv;
}

function midpoint(a: MBody, b: MBody): Vec2 {
  return { x: (a.position.x + b.position.x) / 2, y: (a.position.y + b.position.y) / 2 };
}

/**
 * spawnStage 직후 호출. 반환값을 호출하면 핸들러가 해제된다(스테이지 교체 시 재설치).
 */
export function installDamage(world: StageWorld, events: Partial<DamageEvents> = {}): () => void {
  const engine = world.engine;

  const handler = (ev: Matter.IEventCollision<Matter.Engine>) => {
    const removed = new Set<MBody>();
    for (const pair of ev.pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      const impact = computeImpact(a, b);
      if (impact < TUNING.impactThreshold) continue;
      const at = midpoint(a, b);
      events.onImpact?.(impact, at);
      if (!world.armed) continue;

      for (const target of [a, b]) {
        if (removed.has(target)) continue;
        const meta = getMeta(target);
        if (!meta || (meta.kind !== 'block' && meta.kind !== 'pig')) continue;
        meta.hp -= impact;
        if (meta.hp > 0) continue;

        removed.add(target);
        removeBody(world, target);
        world.score += meta.score;
        events.onScore?.(world.score, meta.score);
        const pos = { x: target.position.x, y: target.position.y };
        if (meta.kind === 'pig') {
          world.pigsRemaining = Math.max(0, world.pigsRemaining - 1);
          events.onPigRemoved?.(target, meta, pos);
        } else {
          events.onBlockBreak?.(target, meta, pos);
        }
      }
    }
  };

  Events.on(engine, 'collisionStart', handler);
  return () => {
    Events.off(engine, 'collisionStart', handler);
  };
}
