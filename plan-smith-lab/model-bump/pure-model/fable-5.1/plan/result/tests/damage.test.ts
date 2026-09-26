/**
 * 데미지 규칙 (§10.1 damage):
 * 임계 미만 vRel 무시, 감소질량 계산, 쿨다운, 재질별 취약도, 나무 1방/돌 다방 기대치.
 */
import Matter from 'matter-js';
import { describe, expect, it } from 'vitest';
import { DAMAGE } from '../src/core/config';
import { createBird } from '../src/entities/Bird';
import { createBlock } from '../src/entities/Block';
import type { Entity } from '../src/entities/Entity';
import { createPig } from '../src/entities/Pig';
import type { Material } from '../src/levels/types';
import { computeDamage, DamageSystem, effectiveMass } from '../src/physics/Damage';
import { MATERIALS, PIG_SIZES } from '../src/physics/Materials';
import { PhysicsWorld } from '../src/physics/World';

const { Body, Sleeping } = Matter;

function plank(material: Material): Entity {
  return createBlock({ kind: 'block', material, shape: 'rect', x: 600, y: 660, w: 20, h: 80 });
}

function flyingBird(vx: number): Entity {
  const bird = createBird('red', { x: 500, y: 600 });
  Body.setStatic(bird.body, false);
  Sleeping.set(bird.body, false);
  Body.setVelocity(bird.body, { x: vx, y: 0 });
  return bird;
}

describe('damage', () => {
  it('ignores relative normal speed below the threshold', () => {
    const r = computeDamage(plank('wood'), createPig('medium', 700, 660), DAMAGE.minRelVel - 0.1);
    expect(r.impact).toBe(0);
    expect(r.damageA).toBe(0);
    expect(r.damageB).toBe(0);
  });

  it('uses reduced mass for two dynamic bodies and the other mass against static', () => {
    const a = plank('wood').body;
    const b = createPig('medium', 700, 660).body;
    const expected = (a.mass * b.mass) / (a.mass + b.mass);
    expect(effectiveMass(a, b)).toBeCloseTo(expected, 6);

    const world = new PhysicsWorld();
    expect(effectiveMass(world.ground.body, a)).toBeCloseTo(a.mass, 6);
    expect(effectiveMass(a, world.ground.body)).toBeCloseTo(a.mass, 6);
    world.dispose();
  });

  it('applies material vulnerability: ice > wood > stone for the same impact', () => {
    const bird = flyingBird(15);
    const dmg = (m: Material): number => computeDamage(bird, plank(m), 15).damageB;
    expect(dmg('ice')).toBeGreaterThan(dmg('wood'));
    expect(dmg('wood')).toBeGreaterThan(dmg('stone'));
    // 새는 데미지를 받지 않는다
    expect(computeDamage(bird, plank('wood'), 15).damageA).toBe(0);
  });

  it('max-power direct hit (vRel 15) breaks a wood plank in one hit but not stone', () => {
    const bird = flyingBird(15);
    const wood = computeDamage(bird, plank('wood'), 15).damageB;
    expect(wood).toBeGreaterThanOrEqual(MATERIALS.wood.health);
    const stone = computeDamage(bird, plank('stone'), 15).damageB;
    expect(stone).toBeLessThan(MATERIALS.stone.health);
    // 돌은 2~3방
    expect(Math.ceil(MATERIALS.stone.health / stone)).toBeGreaterThanOrEqual(2);
    expect(Math.ceil(MATERIALS.stone.health / stone)).toBeLessThanOrEqual(3);
  });

  it('a direct bird hit kills a medium pig', () => {
    const bird = flyingBird(12);
    const pig = createPig('medium', 700, 660);
    const r = computeDamage(bird, pig, 12);
    expect(r.damageB).toBeGreaterThanOrEqual(PIG_SIZES.medium.health);
  });

  it('enforces a per-pair cooldown of 10 ticks', () => {
    const world = new PhysicsWorld();
    const ds = new DamageSystem(world);
    const bird = world.add(flyingBird(15));
    const target = world.add(plank('stone'));
    const n = { x: 1, y: 0 };

    expect(ds.processPair(bird, target, n, 0).length).toBe(1);
    expect(ds.processPair(bird, target, n, 5).length).toBe(0);
    expect(ds.processPair(bird, target, n, DAMAGE.cooldownTicks - 1).length).toBe(0);
    expect(ds.processPair(bird, target, n, DAMAGE.cooldownTicks).length).toBe(1);
    world.dispose();
  });

  it('flush applies health and queues destroyed entities for removal', () => {
    const world = new PhysicsWorld();
    const ds = new DamageSystem(world);
    const bird = world.add(flyingBird(15));
    const ice = world.add(plank('ice'));
    ds.processPair(bird, ice, { x: 1, y: 0 }, 0);
    const destroyed = ds.flush();
    expect(destroyed).toContain(ice);
    expect(ice.health).toBeLessThanOrEqual(0);
    expect(ice.alive).toBe(true); // 아직 큐에만 있음
    const removed = world.flushRemovals();
    expect(removed.map((r) => r.entity)).toContain(ice);
    expect(ice.alive).toBe(false);
    expect(world.byBody(ice.body)).toBeUndefined();
    world.dispose();
  });

  it('collisionStart in a real engine step damages a plank hit by a fast bird', () => {
    const world = new PhysicsWorld();
    const ds = new DamageSystem(world);
    ds.attach();
    const wood = world.add(
      createBlock({ kind: 'block', material: 'wood', shape: 'rect', x: 600, y: 660, w: 20, h: 80 }),
    );
    const bird = world.add(createBird('red', { x: 540, y: 620 }));
    Body.setStatic(bird.body, false);
    Sleeping.set(bird.body, false);
    Body.setVelocity(bird.body, { x: 16, y: 0 });
    let destroyed: Entity[] = [];
    for (let i = 0; i < 20 && destroyed.length === 0; i++) {
      world.step();
      destroyed = ds.flush();
      world.flushRemovals();
    }
    expect(destroyed).toContain(wood);
    ds.detach();
    world.dispose();
  });
});
