/**
 * 데미지 계산·적용 (§6.4).
 * collisionStart 에서만 계산한다. 이벤트 콜백 안에서는 큐에만 넣고,
 * 스텝 종료 후 flush() 로 체력에 적용·제거 큐에 넣는다.
 */
import Matter from 'matter-js';
import { DAMAGE } from '../core/config';
import type { Vec } from '../core/math';
import { isDestructible, type Entity } from '../entities/Entity';
import { MATERIALS, PIG } from './Materials';
import type { PhysicsWorld } from './World';

const { Events } = Matter;

export interface DamageEvent {
  entity: Entity;
  amount: number;
  tick: number;
}

/** 한쪽이 정적이면 상대 질량, 아니면 감소질량. */
export function effectiveMass(a: Matter.Body, b: Matter.Body): number {
  if (a.isStatic && b.isStatic) return 0;
  if (a.isStatic) return b.mass;
  if (b.isStatic) return a.mass;
  return (a.mass * b.mass) / (a.mass + b.mass);
}

/**
 * 법선 방향 상대 속도의 절대값.
 * 고정 스텝(1000/60)만 쓰므로 body.velocity 는 Body.getVelocity 와 같은 px/tick 단위다.
 * collisionStart 시점의 velocity 는 충돌 해석 전(접근) 속도다.
 */
export function relativeNormalSpeed(a: Matter.Body, b: Matter.Body, normal: Vec): number {
  const va = a.velocity;
  const vb = b.velocity;
  return Math.abs((vb.x - va.x) * normal.x + (vb.y - va.y) * normal.y);
}

export function vulnerabilityOf(e: Entity): number {
  if (e.kind === 'block' && e.material) return MATERIALS[e.material].vulnerability;
  if (e.kind === 'pig') return PIG.vulnerability;
  return 0;
}

/** 순수 계산: 충격량 → 각 엔티티 데미지. */
export function computeDamage(
  a: Entity,
  b: Entity,
  vRel: number,
  minRelVel = DAMAGE.minRelVel,
): { impact: number; damageA: number; damageB: number } {
  if (vRel < minRelVel) return { impact: 0, damageA: 0, damageB: 0 };
  const impact = effectiveMass(a.body, b.body) * vRel;
  return {
    impact,
    damageA: isDestructible(a) ? impact * vulnerabilityOf(a) : 0,
    damageB: isDestructible(b) ? impact * vulnerabilityOf(b) : 0,
  };
}

function pairKey(a: Entity, b: Entity): string {
  return a.body.id < b.body.id ? `${a.body.id}:${b.body.id}` : `${b.body.id}:${a.body.id}`;
}

interface PairLike {
  bodyA: Matter.Body;
  bodyB: Matter.Body;
  collision?: { normal?: Vec };
}

export class DamageSystem {
  private cooldownUntil = new Map<string, number>();
  private pending: DamageEvent[] = [];
  private attached = false;
  private readonly handler: (e: Matter.IEventCollision<Matter.Engine>) => void;

  constructor(private readonly world: PhysicsWorld) {
    this.handler = (e) => {
      const tick = this.world.tick;
      for (const pair of e.pairs as unknown as PairLike[]) {
        const ea = this.world.byBody(pair.bodyA);
        const eb = this.world.byBody(pair.bodyB);
        if (!ea || !eb) continue;
        const normal = pair.collision?.normal ?? { x: 0, y: 1 };
        this.processPair(ea, eb, normal, tick);
      }
    };
  }

  attach(): void {
    if (this.attached) return;
    Events.on(this.world.engine, 'collisionStart', this.handler);
    this.attached = true;
  }

  detach(): void {
    if (!this.attached) return;
    Events.off(this.world.engine, 'collisionStart', this.handler);
    this.attached = false;
  }

  /**
   * 페어 한 쌍을 처리해 pending 큐에 데미지를 넣는다.
   * 테스트에서 직접 호출할 수 있도록 엔진과 분리되어 있다.
   */
  processPair(a: Entity, b: Entity, normal: Vec, tick: number): DamageEvent[] {
    if (!a.alive || !b.alive) return [];
    if (!isDestructible(a) && !isDestructible(b)) return [];
    const key = pairKey(a, b);
    const until = this.cooldownUntil.get(key);
    if (until !== undefined && tick < until) return [];

    const vRel = relativeNormalSpeed(a.body, b.body, normal);
    const { impact, damageA, damageB } = computeDamage(a, b, vRel);
    if (impact <= 0) return [];

    this.cooldownUntil.set(key, tick + DAMAGE.cooldownTicks);
    const out: DamageEvent[] = [];
    if (damageA > 0) out.push({ entity: a, amount: damageA, tick });
    if (damageB > 0) out.push({ entity: b, amount: damageB, tick });
    this.pending.push(...out);
    return out;
  }

  /** 스텝 종료 후 호출. 체력 적용 → 0 이하면 제거 큐. 파괴된 엔티티를 돌려준다. */
  flush(): Entity[] {
    if (this.pending.length === 0) return [];
    const events = this.pending;
    this.pending = [];
    const destroyed: Entity[] = [];
    for (const ev of events) {
      const e = ev.entity;
      if (!e.alive) continue;
      e.health -= ev.amount;
      if (e.health <= 0 && !destroyed.includes(e)) {
        destroyed.push(e);
        this.world.queueRemove(e, 'destroyed');
      }
    }
    // 오래된 쿨다운 정리
    if (this.cooldownUntil.size > 512) {
      const now = this.world.tick;
      for (const [k, v] of this.cooldownUntil) if (v <= now) this.cooldownUntil.delete(k);
    }
    return destroyed;
  }

  reset(): void {
    this.cooldownUntil.clear();
    this.pending = [];
  }
}
