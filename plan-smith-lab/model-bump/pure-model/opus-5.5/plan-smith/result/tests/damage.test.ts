// damage: §4.5 보정 목표 (최대 속도 빨강이 20×100 나무는 부수고 돌은 못 부숨), 유예, 한 번만 적용
import Matter from 'matter-js';
import { describe, expect, it } from 'vitest';
import { BIRDS, G_PER_STEP, GRACE_STEPS, LAUNCH_K, MATERIALS, MAX_PULL, PIGS, V_MIN } from '../src/config';
import { collisionDamage, massFactor } from '../src/physics/damage';
import { StageSession } from '../src/physics/session';
import { createBirdBody } from '../src/physics/world-factory';
import type { Entity } from '../src/types';
import { fixture } from './helpers';

const { Bodies } = Matter;
const vMax = MAX_PULL * LAUNCH_K;

function block(material: 'wood' | 'stone' | 'glass', w: number, h: number) {
  const m = MATERIALS[material];
  const body = Bodies.rectangle(0, 0, w, h, { density: m.density });
  const entity: Entity = { kind: 'block', material, hp: m.hp, maxHp: m.hp };
  return { body, entity };
}

const redE: Entity = { kind: 'bird', birdType: 'red' };

describe('damage formula', () => {
  const red = createBirdBody('red', 0, 0);

  it('max-speed red breaks a 20×100 wood block', () => {
    const { body, entity } = block('wood', 20, 100);
    expect(collisionDamage(body, red, vMax, entity, redE)).toBeGreaterThan(MATERIALS.wood.hp);
  });

  it('max-speed red does NOT break a 20×100 stone block', () => {
    const { body, entity } = block('stone', 20, 100);
    expect(collisionDamage(body, red, vMax, entity, redE)).toBeLessThan(MATERIALS.stone.hp);
  });

  it('impacts below V_MIN do nothing', () => {
    const { body, entity } = block('glass', 20, 60);
    expect(collisionDamage(body, red, V_MIN - 0.01, entity, redE)).toBe(0);
  });

  it('static partner counts as mass factor 2', () => {
    const ground = Bodies.rectangle(0, 0, 100, 100, { isStatic: true });
    const { body } = block('wood', 20, 100);
    expect(massFactor(body, ground)).toBe(2);
  });

  it('blue ×2 on glass, yellow ×2 on wood', () => {
    const blue = createBirdBody('blue', 0, 0);
    const yellow = createBirdBody('yellow', 0, 0);
    const g = block('glass', 20, 80);
    const w = block('wood', 30, 100);
    expect(collisionDamage(g.body, blue, 10, g.entity, { kind: 'bird', birdType: 'blue' })).toBeCloseTo(
      2 * collisionDamage(g.body, blue, 10, g.entity, redE),
      6,
    );
    expect(collisionDamage(w.body, yellow, 10, w.entity, { kind: 'bird', birdType: 'yellow' })).toBeCloseTo(
      2 * collisionDamage(w.body, yellow, 10, w.entity, redE),
      6,
    );
  });

  it('a toppling 20×100 wood block kills a small pig (tip speed at 70° ≈ 7.4 → > 6)', () => {
    const { body } = block('wood', 20, 100);
    const pigSpec = PIGS.small;
    const pig = Bodies.circle(0, 0, pigSpec.radius, { density: pigSpec.density });
    const pigE: Entity = { kind: 'pig', pigType: 'small', hp: pigSpec.hp, maxHp: pigSpec.hp };
    const tip = Math.sqrt(3 * G_PER_STEP * 100 * (1 - Math.cos((70 * Math.PI) / 180)));
    const woodE: Entity = { kind: 'block', material: 'wood', hp: 20, maxHp: 20 };
    expect(collisionDamage(pig, body, tip, pigE, woodE)).toBeGreaterThan(pigSpec.hp);
  });

  it('bird radii match §4.7', () => {
    expect(BIRDS.red.radius).toBe(22);
    expect(BIRDS.blue.radius).toBe(16);
    expect(BIRDS.yellow.radius).toBe(20);
    expect(BIRDS.black.radius).toBe(26);
  });
});

// pull (119.6,−10): 26스텝째 x≈711, y≈738 → 왼쪽 면이 x=720인 블록의 옆면에 부딪힌다
const WALL = { x: 730, y: 770, w: 20, h: 100 };

describe('damage in the world', () => {
  it.each([
    ['wood', true],
    ['stone', false],
  ] as const)('max-speed red into a lone %s block → destroyed=%s', (material, destroyed) => {
    const s = StageSession.create(fixture({ blocks: [{ kind: 'box', material, ...WALL }] }));
    for (let i = 0; i < GRACE_STEPS; i++) s.step();
    expect(s.launch({ x: 119.6, y: -10 })).toBe(true);
    for (let i = 0; i < 40; i++) s.step();
    expect(s.registry.count('block')).toBe(destroyed ? 0 : 1);
    s.dispose();
  });

  it('no damage during the 60-step grace period', () => {
    const s = StageSession.create(fixture({ blocks: [{ kind: 'box', material: 'glass', ...WALL }] }));
    s.launch({ x: 119.6, y: -10 });
    for (let i = 0; i < 40; i++) s.step();
    expect(s.stepCount).toBeLessThan(GRACE_STEPS);
    expect(s.registry.count('block')).toBe(1);
    s.dispose();
  });
});
