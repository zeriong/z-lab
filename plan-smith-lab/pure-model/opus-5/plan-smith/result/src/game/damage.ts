/**
 * 임펄스 → 데미지 → 파괴 (§7.2, §7.3). **엔진 밖.**
 *
 * §11의 판정에서 패자(자체 물리) 논거를 제약으로 승격시킨 결과가 이 파일이다:
 *   Matter가 주는 것은 충돌 쌍과 속도·질량뿐이고,
 *   임계·HP·파괴·폭발은 전부 여기가 소유한다.
 *
 *   impulse = |상대속도| × (m1·m2 / (m1+m2))
 *   dmg     = max(0, impulse − material.threshold)
 *
 * 블록끼리의 충돌에도 같은 식을 쓰므로 낙하 데미지가 별도 규칙 없이 성립한다.
 */

import { Body, Composite, Sleeping, Vector } from 'matter-js';
import type { PhysicsHandle } from '../physics/world';
import { tagOf, type EntityTag, type StageRuntime } from '../data/loader';
import { MATERIALS, TNT_BLAST, BOMB_BIRD_BLAST, MAX_CHAIN_DEPTH, type MaterialName } from './materials';

/** Matter의 Pair 중 우리가 쓰는 부분만. 엔진 타입에 결합하지 않는다. */
export interface CollisionPair {
  bodyA: Body;
  bodyB: Body;
}

export interface DamageEvents {
  /** 데미지가 실제로 들어갔을 때 (0 초과) */
  onHit?(body: Body, tag: EntityTag, dmg: number, at: Vector): void;
  /** 블록/돼지가 제거될 때. 파편·먼지·사운드·점수 표시의 발화점. */
  onDestroyed?(body: Body, tag: EntityTag, at: Vector): void;
  /** 폭발이 일어났을 때 (TNT 또는 폭탄 새) */
  onExplosion?(at: Vector, radius: number): void;
  /** 점수가 올랐을 때 (누계, 증가분, 위치) */
  onScore?(total: number, gained: number, at: Vector): void;
}

export class DamageSystem {
  constructor(
    private readonly physics: PhysicsHandle,
    private readonly runtime: StageRuntime,
    private readonly events: DamageEvents = {},
  ) {}

  /** collisionStart 한 프레임분 쌍을 처리한다 (홉 4). */
  handlePairs(pairs: readonly CollisionPair[], nowMs: number): void {
    for (const pair of pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      const tagA = tagOf(a);
      const tagB = tagOf(b);
      if (!tagA || !tagB) continue;
      if (tagA.dead || tagB.dead) continue;

      const impulse = impulseOf(a, b);
      if (impulse <= 0) continue;

      // 양쪽이 같은 임펄스를 받는다. 임계만 재질별로 다르다.
      this.applyDamage(a, Math.max(0, impulse - tagA.threshold), nowMs, 0);
      this.applyDamage(b, Math.max(0, impulse - tagB.threshold), nowMs, 0);
    }
  }

  /** 데미지 1건. depth는 연쇄 폭발 재귀 깊이(상한 8, §7.3). */
  applyDamage(body: Body, amount: number, nowMs: number, depth: number): void {
    if (amount <= 0) return;
    const tag = tagOf(body);
    if (!tag || tag.dead) return;
    if (tag.kind === 'ground' || tag.kind === 'bird') return; // 지면과 새는 부서지지 않는다

    tag.hp -= amount;
    tag.lastHitAt = nowMs;
    this.events.onHit?.(body, tag, amount, { x: body.position.x, y: body.position.y });

    if (tag.hp <= 0) this.destroy(body, tag, nowMs, depth);
  }

  /** HP ≤ 0 처리: 점수 → 이벤트 → 월드에서 제거 → (TNT면) 폭발 */
  private destroy(body: Body, tag: EntityTag, nowMs: number, depth: number): void {
    if (tag.dead) return;
    tag.dead = true;

    const at: Vector = { x: body.position.x, y: body.position.y };

    this.runtime.score += tag.score;
    this.events.onScore?.(this.runtime.score, tag.score, at);
    this.events.onDestroyed?.(body, tag, at);

    if (tag.kind === 'pig') {
      this.runtime.pigsRemaining = Math.max(0, this.runtime.pigsRemaining - 1);
      const idx = this.runtime.pigs.indexOf(body);
      if (idx >= 0) this.runtime.pigs.splice(idx, 1);
    } else {
      const idx = this.runtime.blocks.indexOf(body);
      if (idx >= 0) this.runtime.blocks.splice(idx, 1);
    }

    // 제거가 먼저다. 폭발 임펄스가 자기 자신에게 걸리면 안 되고,
    // 위에 얹혀 있던 블록은 이 시점에 지지를 잃어야 한다(R10).
    Composite.remove(this.physics.world, body);
    this.removeAttachedConstraints(body);

    if (tag.material === 'tnt' && depth < MAX_CHAIN_DEPTH) {
      this.explode(at, TNT_BLAST.radius, TNT_BLAST.impulse, TNT_BLAST.damage, nowMs, depth + 1);
    }
  }

  /** 폭탄 새의 자폭도 같은 경로를 쓴다 (R12) */
  detonate(at: Vector, nowMs: number): void {
    this.explode(at, BOMB_BIRD_BLAST.radius, BOMB_BIRD_BLAST.impulse, BOMB_BIRD_BLAST.damage, nowMs, 1);
  }

  /**
   * 반경 안의 동적 바디에 거리 반비례 임펄스 + 고정 데미지.
   * 그 데미지가 다른 TNT를 다시 터뜨리면 같은 프레임에 재귀 처리된다.
   */
  explode(at: Vector, radius: number, impulseScale: number, damage: number, nowMs: number, depth: number): void {
    this.events.onExplosion?.(at, radius);

    const bodies = Composite.allBodies(this.physics.world);
    for (const other of bodies) {
      if (other.isStatic) continue;
      const tag = tagOf(other);
      if (!tag || tag.dead) continue;

      const delta = Vector.sub(other.position, at);
      const dist = Vector.magnitude(delta);
      if (dist > radius) continue;

      const falloff = 1 - dist / radius;
      const dir = dist < 1 ? { x: 0, y: -1 } : Vector.div(delta, dist);
      // 잠든 잔해도 폭발에는 깨어나야 한다. enableSleeping을 켠 대가.
      if (other.isSleeping) Sleeping.set(other, false);
      Body.applyForce(other, other.position, {
        x: dir.x * impulseScale * falloff * other.mass,
        y: dir.y * impulseScale * falloff * other.mass,
      });

      // 새는 밀리기만 하고 데미지는 받지 않는다(applyDamage가 걸러낸다).
      this.applyDamage(other, damage * falloff, nowMs, depth);
    }
  }

  /** 파괴된 바디에 물려 있던 제약을 함께 끊는다 (시소 축이 허공에 남는 것 방지) */
  private removeAttachedConstraints(body: Body): void {
    for (let i = this.runtime.constraints.length - 1; i >= 0; i -= 1) {
      const c = this.runtime.constraints[i];
      if (c.bodyA === body || c.bodyB === body) {
        Composite.remove(this.physics.world, c);
        this.runtime.constraints.splice(i, 1);
      }
    }
  }
}

/**
 * 유효질량 기반 임펄스. 정적 바디는 무한질량으로 취급한다.
 *
 * 무한질량을 그냥 곱하면 NaN이 나온다 — 조화평균의 극한을 직접 쓴다:
 *   m1 = ∞ 이면 m1·m2/(m1+m2) → m2
 */
export function impulseOf(a: Body, b: Body): number {
  if (a.isStatic && b.isStatic) return 0;

  const relative = Vector.sub(b.velocity, a.velocity);
  const speed = Vector.magnitude(relative);
  if (speed <= 0) return 0;

  const ma = a.isStatic ? Number.POSITIVE_INFINITY : a.mass;
  const mb = b.isStatic ? Number.POSITIVE_INFINITY : b.mass;

  if (!Number.isFinite(ma)) return speed * mb;
  if (!Number.isFinite(mb)) return speed * ma;
  return speed * ((ma * mb) / (ma + mb));
}

/** 단위 테스트용 — 재질 하나에 특정 임펄스를 줬을 때의 데미지 (§9 Step 5 검증) */
export function damageFor(material: MaterialName, impulse: number): number {
  return Math.max(0, impulse - MATERIALS[material].threshold);
}
