// B11 — 충돌·데미지·구조물 파괴(폭발 배럴 포함)
//
// 때린 곳이 부서지고, 위에 얹힌 것이 무너진다.
// 충돌 콜백 안에서는 바디를 제거하지 않는다 — 파괴 예약만 걸고 스텝 종료 후 처리한다.

import type { CollisionEvent, PhysicsBody } from '../physics/PhysicsAdapter';
import type { World } from './world';
import { Audio } from '../core/audio';
import { addBlockScore } from './score';
import { killPig } from './pigs';

/** 이 상대속도(px/s) 아래에서는 흠집도 나지 않는다. */
export const DAMAGE_SPEED_THRESHOLD = 120;

/** 상대속도 초과분 1px/s 당 데미지. 최대 발사 속도 직격이 나무 1블록을 부수는 크기로 잡았다. */
export const DAMAGE_PER_SPEED = 0.09;

/** 폭발 배럴 */
export const BARREL_RADIUS = 140;
export const BARREL_IMPULSE = 900;
export const BARREL_DAMAGE = 70;

function massFactor(other: PhysicsBody): number {
  const k = other.mass / 3.5;
  return Math.max(0.5, Math.min(2, k));
}

function damageOf(ev: CollisionEvent, other: PhysicsBody): number {
  const over = ev.relativeSpeed - DAMAGE_SPEED_THRESHOLD;
  if (over <= 0) return 0;
  return over * DAMAGE_PER_SPEED * massFactor(other);
}

/** 데미지를 적용하고, hp 가 바닥나면 파괴를 예약한다. */
export function applyDamage(world: World, target: PhysicsBody, amount: number): void {
  if (!target.alive || amount <= 0) return;
  if (target.kind !== 'block' && target.kind !== 'pig') return;
  target.hp -= amount;
  if (target.hp <= 0 && !world.pendingRemoval.includes(target)) {
    world.pendingRemoval.push(target);
  }
}

/** 어댑터가 넘긴 충돌 1건을 소화한다. */
export function handleCollision(world: World, ev: CollisionEvent): void {
  if (ev.relativeSpeed < DAMAGE_SPEED_THRESHOLD * 0.5) return;

  const pairs: [PhysicsBody, PhysicsBody][] = [
    [ev.a, ev.b],
    [ev.b, ev.a],
  ];
  let noisy = false;
  for (const [target, other] of pairs) {
    if (target.kind !== 'block' && target.kind !== 'pig') continue;
    const dmg = damageOf(ev, other);
    if (dmg <= 0) continue;
    noisy = true;
    applyDamage(world, target, dmg);
  }

  if (noisy) {
    const intensity = Math.min(1, ev.relativeSpeed / 900);
    Audio.play('hit', intensity);
    world.effects.burst(ev.x, ev.y, 'rgb(255, 236, 190)', 3, 140 * intensity);
  }
}

const DEBRIS_COLOR: Record<string, string> = {
  wood: 'rgb(163, 106, 54)',
  ice: 'rgb(178, 226, 244)',
  stone: 'rgb(140, 142, 148)',
  barrel: 'rgb(214, 132, 46)',
};

/** 스텝 종료 후 호출 — 예약된 파괴를 실제로 반영한다. */
export function resolveDestruction(world: World): void {
  if (world.pendingRemoval.length === 0) return;
  const queue = world.pendingRemoval.slice();
  world.pendingRemoval.length = 0;

  for (const body of queue) {
    if (!body.alive) continue;

    if (body.kind === 'pig') {
      killPig(world, body);
      continue;
    }

    const mat = body.material ?? 'wood';
    const color = DEBRIS_COLOR[mat] ?? 'rgb(190, 190, 190)';
    world.effects.burst(body.x, body.y, color, mat === 'stone' ? 16 : 12, 340);
    world.effects.shake(mat === 'stone' ? 90 : 60, mat === 'stone' ? 9 : 5);
    Audio.play('break', mat === 'stone' ? 1 : 0.7);
    addBlockScore(world.score);
    world.blocksDestroyed++;

    const wasBarrel = mat === 'barrel';
    const bx = body.x;
    const by = body.y;

    world.adapter.remove(body);
    const idx = world.blocks.indexOf(body);
    if (idx >= 0) world.blocks.splice(idx, 1);

    if (wasBarrel) {
      explode(world, bx, by);
    }
  }

  // 폭발이 새 파괴를 유발했다면 같은 스텝에서 연쇄 처리한다.
  if (world.pendingRemoval.length > 0) resolveDestruction(world);
}

function explode(world: World, x: number, y: number): void {
  world.effects.burst(x, y, 'rgb(255, 176, 64)', 34, 620);
  world.effects.shake(120, 16);
  Audio.play('break', 1);
  world.adapter.applyRadialImpulse(x, y, BARREL_RADIUS, BARREL_IMPULSE);

  for (const target of world.adapter.bodies()) {
    if (!target.alive || target.isStatic) continue;
    if (target.kind !== 'block' && target.kind !== 'pig') continue;
    const dist = Math.hypot(target.x - x, target.y - y);
    if (dist > BARREL_RADIUS) continue;
    applyDamage(world, target, BARREL_DAMAGE * (1 - dist / BARREL_RADIUS));
  }
}
