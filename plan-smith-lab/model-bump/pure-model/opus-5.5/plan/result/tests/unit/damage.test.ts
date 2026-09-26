import { describe, expect, it } from 'vitest';
import { DAMAGE_K, DAMAGE_T, GRACE_SECONDS } from '../../src/config/constants';
import {
  breakthroughKeep,
  breakthroughVelocity,
  contactDamage,
  damageStage,
  impactDamage,
  isOutOfBounds,
} from '../../src/core/rules/damage';
import { explosionHit } from '../../src/core/rules/explosion';

// U-5: J ≤ T이면 0, 선형 비례, 새는 데미지 없음, 유예 시간 동안 0

const after = GRACE_SECONDS + 0.01;

describe('damage (U-5)', () => {
  it('J ≤ T이면 0', () => {
    expect(impactDamage(DAMAGE_T)).toBe(0);
    expect(impactDamage(DAMAGE_T * 0.5)).toBe(0);
  });

  it('T를 넘는 만큼 선형 비례: K × (J − T)', () => {
    expect(impactDamage(DAMAGE_T + 1)).toBeCloseTo(DAMAGE_K, 9);
    expect(impactDamage(DAMAGE_T + 3)).toBeCloseTo(3 * DAMAGE_K, 9);
    expect(impactDamage(DAMAGE_T + 2, 0.5)).toBeCloseTo(DAMAGE_K, 9);
  });

  it('새, 지형, 지면은 데미지를 받지 않는다', () => {
    for (const role of ['bird', 'terrain', 'ground'] as const) {
      expect(contactDamage({ role, impulse: 100, simTime: after })).toBe(0);
    }
    for (const role of ['block', 'pig', 'tnt'] as const) {
      expect(contactDamage({ role, impulse: 100, simTime: after })).toBeGreaterThan(0);
    }
  });

  it('유예 시간 동안 0', () => {
    expect(contactDamage({ role: 'pig', impulse: 100, simTime: GRACE_SECONDS - 0.01 })).toBe(0);
    expect(contactDamage({ role: 'pig', impulse: 100, simTime: 0.5, graceSeconds: 0 })).toBeGreaterThan(0);
  });

  it('월드 이탈 경계: 위쪽은 이탈이 아니다', () => {
    expect(isOutOfBounds(-301, 500)).toBe(true);
    expect(isOutOfBounds(2221, 500)).toBe(true);
    expect(isOutOfBounds(500, 1301)).toBe(true);
    expect(isOutOfBounds(500, -5000)).toBe(false);
    expect(isOutOfBounds(500, 900)).toBe(false);
  });

  it('손상 단계: 66% / 33% 경계', () => {
    expect(damageStage(100, 100)).toBe(0);
    expect(damageStage(66, 100)).toBe(1);
    expect(damageStage(33, 100)).toBe(2);
  });

  it('관통: 초과 데미지 비율만큼 충돌 전 속도를 되살린다', () => {
    expect(breakthroughKeep(50, 500)).toBeCloseTo(0.9, 9);
    expect(breakthroughKeep(100, 100)).toBe(0);
    const pre = { x: 20, y: 0 };
    expect(breakthroughVelocity(pre, { x: 2, y: 0 }, 0.5)).toEqual({ x: 10, y: 0 });
    const fast = { x: 15, y: 0 };
    expect(breakthroughVelocity(pre, fast, 0.5)).toBe(fast);
  });

  it('폭발: 거리에 따라 선형 감쇠, 반경 밖은 null', () => {
    const spec = { radius: 100, impulseMax: 10, damageMax: 200 };
    const h = explosionHit(0, 0, 50, 0, spec)!;
    expect(h.damage).toBeCloseTo(100, 9);
    expect(h.impulse).toBeCloseTo(5, 9);
    expect(h.dirX).toBeCloseTo(1, 9);
    expect(explosionHit(0, 0, 100, 0, spec)).toBeNull();
    const c = explosionHit(0, 0, 0, 0, spec)!;
    expect(c.dirY).toBe(-1);
  });
});
