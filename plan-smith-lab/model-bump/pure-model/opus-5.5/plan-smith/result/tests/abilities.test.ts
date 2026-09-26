// abilities: 분열 = 바디 3개, 가속 = 속도 ×2이되 ≤ 40, 폭발은 반경 안에만 데미지, 새 한 마리당 1회
import Matter from 'matter-js';
import { describe, expect, it } from 'vitest';
import { BLACK_FUSE_STEPS, BLAST_RADIUS, GRACE_STEPS, MATERIALS, MAX_SPEED } from '../src/config';
import { speedOf } from '../src/game/birds';
import { StageSession } from '../src/physics/session';
import type { BirdType, StageData } from '../src/types';
import { fixture } from './helpers';

const { Body } = Matter;

function flying(type: BirdType, extra: Partial<StageData> = {}, pull = { x: 100, y: -60 }): StageSession {
  const s = StageSession.create(fixture({ birds: [type, type], slack: 1, ...extra }));
  for (let i = 0; i < GRACE_STEPS; i++) s.step();
  expect(s.launch(pull)).toBe(true);
  for (let i = 0; i < 8; i++) s.step();
  expect(s.phase).toBe('FLYING');
  return s;
}

describe('abilities', () => {
  it('red has no ability', () => {
    const s = flying('red');
    expect(s.useAbility()).toBe(false);
  });

  it('blue splits into 3 bodies of radius 12, keeping speed, once per bird', () => {
    const s = flying('blue');
    const before = speedOf(s.flight!.parts[0]!.body);
    expect(s.useAbility()).toBe(true);
    const alive = s.flight!.parts.filter((p) => !p.ended);
    expect(alive).toHaveLength(3);
    expect(s.registry.count('bird')).toBe(3);
    for (const p of alive) {
      expect(p.body.circleRadius).toBe(12);
      expect(speedOf(p.body)).toBeCloseTo(before, 4);
    }
    const angles = alive
      .map((p) => (Math.atan2(p.body.velocity.y, p.body.velocity.x) * 180) / Math.PI)
      .sort((a, b) => a - b);
    expect(angles[2]! - angles[0]!).toBeCloseTo(24, 3);
    expect(s.useAbility()).toBe(false);
  });

  it('yellow doubles speed along its direction, capped at 40', () => {
    const slow = flying('yellow', {}, { x: 50, y: -30 });
    const b1 = slow.flight!.parts[0]!.body;
    const v1 = { x: b1.velocity.x, y: b1.velocity.y };
    expect(slow.useAbility()).toBe(true);
    expect(b1.velocity.x).toBeCloseTo(v1.x * 2, 6);
    expect(b1.velocity.y).toBeCloseTo(v1.y * 2, 6);
    expect(slow.useAbility()).toBe(false);

    const fast = flying('yellow', {}, { x: 120, y: 0 });
    const b2 = fast.flight!.parts[0]!.body;
    expect(speedOf(b2) * 2).toBeGreaterThan(MAX_SPEED);
    fast.useAbility();
    expect(speedOf(b2)).toBeCloseTo(MAX_SPEED, 6);
  });

  it('black explosion damages only inside the radius (stone ×1.5) and pushes outward', () => {
    const s = flying('black', {
      pigs: [
        { type: 'large', x: 650, y: 790 }, // d ≈ 50 → 19.3 ≥ 15 → 제거
        { type: 'large', x: 850, y: 790 }, // d ≈ 250 → 영향 없음
      ],
      blocks: [{ kind: 'box', material: 'stone', x: 700, y: 800, w: 40, h: 40 }], // d ≈ 100 → 12.9
    });
    const bird = s.flight!.parts[0]!.body;
    Body.setPosition(bird, { x: 600, y: 794 });
    Body.setVelocity(bird, { x: 0, y: 0 });
    const far = s.registry.list().find((r) => r.entity.kind === 'pig' && r.body.position.x > 800)!;
    const stone = s.registry.list().find((r) => r.entity.kind === 'block')!;
    const stoneX0 = stone.body.position.x;
    const flight = s.flight!;

    expect(s.useAbility()).toBe(true);
    s.flushRemovals();

    expect(s.pigsAlive).toBe(1); // 가까운 대형 돼지만 제거
    const farE = far.entity as { hp: number; maxHp: number };
    expect(farE.hp).toBe(farE.maxHp);
    const stoneE = stone.entity as { hp: number };
    const d = Math.hypot(stone.body.position.x - 600, stone.body.position.y - 794);
    expect(d).toBeLessThan(BLAST_RADIUS);
    expect(stoneE.hp).toBeCloseTo(MATERIALS.stone.hp - 30 * (1 - d / BLAST_RADIUS) * 1.5, 4);
    expect(stone.body.velocity.x).toBeGreaterThan(0); // 바깥으로 밀림
    expect(stone.body.position.x).toBe(stoneX0);
    expect(s.effects.shakeSteps).toBeGreaterThan(0);
    expect(flight.exploded).toBe(true);
    expect(s.useAbility()).toBe(false);
  });

  it('black explodes by itself 90 steps after its first collision', () => {
    const s = StageSession.create(fixture({ birds: ['black'], slack: 0, solution: [] }));
    for (let i = 0; i < GRACE_STEPS; i++) s.step();
    s.launch({ x: 20, y: 0 }); // 곧 땅에 닿는다
    const flight = s.flight!;
    for (let i = 0; i < 300 && !flight.exploded; i++) s.step();
    expect(flight.firstHitStep).not.toBeNull();
    expect(flight.exploded).toBe(true);
    expect(flight.steps - flight.firstHitStep!).toBe(BLACK_FUSE_STEPS);
  });

  it('ability taps are ignored when not FLYING', () => {
    const s = StageSession.create(fixture({ birds: ['blue'], slack: 0, solution: [] }));
    expect(s.phase).toBe('AIMING');
    expect(s.useAbility()).toBe(false);
  });
});
