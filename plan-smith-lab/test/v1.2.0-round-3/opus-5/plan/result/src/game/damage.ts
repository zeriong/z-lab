/**
 * §6 데미지 · 파괴.
 *
 * 중요: collisionStart 콜백 안에서 Composite.remove를 호출하지 않는다.
 * 솔버 순회 중 월드를 변경하면 크래시/미정의 동작이 된다. 반드시 큐에 쌓고 Engine.update 이후 처리한다(§3).
 */

import { Composite, Events, Vector, Body } from 'matter-js';
import type { GameWorld } from './world';
import { BIRD, MATERIAL, getGame } from './entities';

/**
 * §6.1 IMPACT_GAIN의 기준 문장(이것이 스펙이다. 숫자가 아니라):
 * "wood 블록이 최대 파워 red에 정면으로 맞으면 hp 60을 한 방에 넘긴다."
 * 밸런싱은 이 문장을 유지하도록 조정한다.
 */
export const IMPACT_GAIN = 45;

/** 잔진동 무시 임계 (상대속도) */
const MIN_REL_SPEED = 2;

export function attachCollisionDamage(gw: GameWorld): void {
  Events.on(gw.engine, 'collisionStart', (e) => {
    for (const pair of e.pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;

      const rel = Vector.sub(a.velocity, b.velocity);
      const speed = Vector.magnitude(rel);
      if (speed < MIN_REL_SPEED) continue;

      const ma = a.isStatic ? Infinity : a.mass;
      const mb = b.isStatic ? Infinity : b.mass;
      const mEff =
        ma === Infinity ? mb : mb === Infinity ? ma : (ma * mb) / (ma + mb);
      if (!Number.isFinite(mEff)) continue;

      const impact = mEff * speed * IMPACT_GAIN;

      queueDamage(gw, a, impact, b);
      queueDamage(gw, b, impact, a);

      // 사운드용 이벤트(§13). 재료는 더 '단단한' 쪽 기준.
      const ga = getGame(a);
      const gb = getGame(b);
      const mat = ga && ga.kind === 'block' ? ga.material : gb && gb.kind === 'block' ? gb.material : 'ground';
      if (impact > 6) {
        gw.hitEvents.push({ material: mat, intensity: Math.min(1, impact / 120) });
      }

      // black bird 첫 충돌 기록(§4.3 — 충돌 0.6초 후 자동 폭발)
      for (const body of [a, b]) {
        const g = getGame(body);
        if (g?.kind === 'bird' && g.birdType === 'black' && g.firstHitStep === -1) {
          g.firstHitStep = gw.step;
        }
      }
    }
  });
}

/** 데미지를 큐에 쌓는다. other는 폭발처럼 가해자가 없을 수 있으므로 null 허용. */
export function queueDamage(
  gw: GameWorld,
  target: Body,
  impact: number,
  other: Body | null,
): void {
  const g = getGame(target);
  if (!g || g.dead || target.isStatic) return;
  if (g.kind === 'bird') return; // 새는 파괴 대상이 아니다

  const mat = MATERIAL[g.material];
  let dmg = impact - mat.threshold;
  if (dmg <= 0) return;

  const og = other ? getGame(other) : undefined;
  if (og?.kind === 'bird' && og.birdType) {
    dmg *= BIRD[og.birdType].dmgMul;
  }

  gw.damageQueue.push({ body: target, dmg });
}

/**
 * Engine.update 이후에 호출한다(§3-3).
 * HP 차감 → hp<=0이면 dead 처리 → 월드에서 제거 + 점수/파티클 이벤트 발행.
 */
export function flushDamage(gw: GameWorld): void {
  for (const ticket of gw.damageQueue) {
    const g = getGame(ticket.body);
    if (!g || g.dead) continue;
    g.hp -= ticket.dmg;
    if (g.hp <= 0) {
      g.dead = true;
      gw.removeQueue.push(ticket.body);
    }
  }
  gw.damageQueue.length = 0;

  for (const body of gw.removeQueue) {
    const g = getGame(body);
    if (!g) continue;
    const spec = MATERIAL[g.material];
    gw.score += spec.score;
    if (g.kind === 'pig') gw.pigsAlive = Math.max(0, gw.pigsAlive - 1);

    gw.destroyEvents.push({
      x: body.position.x,
      y: body.position.y,
      kind: g.kind,
      material: g.material,
      score: spec.score,
      radius: g.radius ?? Math.max(body.bounds.max.x - body.bounds.min.x, 12) / 2,
    });

    Composite.remove(gw.engine.world, body);
    if (gw.bird === body) gw.bird = null;
  }
  gw.removeQueue.length = 0;
}

/** §6.2 폭발 — black bird / 향후 TNT 공용 */
export function explode(
  gw: GameWorld,
  center: Vector,
  radius = 90,
  power = 0.055,
): void {
  for (const body of Composite.allBodies(gw.engine.world)) {
    if (body.isStatic) continue;
    const d = Vector.sub(body.position, center);
    const dist = Math.max(Vector.magnitude(d), 1);
    if (dist > radius) continue;
    const falloff = 1 - dist / radius;
    Body.applyForce(
      body,
      body.position,
      Vector.mult(Vector.normalise(d), power * falloff * body.mass),
    );
    queueDamage(gw, body, 120 * falloff, null);
  }
}
