import { describe, expect, it } from 'vitest';
import { GROUND_Y, L_MAX, L_MIN, V_MAX } from '../../src/config/constants';
import { len } from '../../src/core/math';
import {
  anchorFor,
  canGrab,
  clampPull,
  isCancelPull,
  launchPosition,
  pullToVelocity,
} from '../../src/core/slingshot';

// U-2: 클램프, 취소, 방향 반전, 선형 스케일

describe('slingshot (U-2)', () => {
  it('앵커는 지면 150px 위', () => {
    expect(anchorFor(260)).toEqual({ x: 260, y: GROUND_Y - 150 });
  });

  it('|p| > L_max이면 L_max로 클램프하고 방향은 유지한다', () => {
    const c = clampPull({ x: -300, y: 400 });
    expect(len(c)).toBeCloseTo(L_MAX, 9);
    expect(c.x / c.y).toBeCloseTo(-300 / 400, 9);
    expect(clampPull({ x: 30, y: 40 })).toEqual({ x: 30, y: 40 });
  });

  it('|p| < L_min이면 취소', () => {
    expect(isCancelPull({ x: L_MIN - 0.01, y: 0 })).toBe(true);
    expect(isCancelPull({ x: 0, y: L_MIN })).toBe(false);
  });

  it('속도는 당김의 반대 방향이다(뒤로 쏘기 허용)', () => {
    const v = pullToVelocity({ x: -100, y: 50 });
    expect(v.x).toBeGreaterThan(0);
    expect(v.y).toBeLessThan(0);
    const back = pullToVelocity({ x: 100, y: 0 });
    expect(back.x).toBeLessThan(0);
  });

  it('선형 스케일: v = −p / L_max × V_max, 최대에서 V_max', () => {
    const half = pullToVelocity({ x: -L_MAX / 2, y: 0 });
    expect(half.x).toBeCloseTo(V_MAX / 2, 9);
    const full = pullToVelocity({ x: 0, y: L_MAX });
    expect(full.y).toBeCloseTo(-V_MAX, 9);
    const over = pullToVelocity({ x: 0, y: L_MAX * 3 });
    expect(len(over)).toBeCloseTo(V_MAX, 9);
  });

  it('앵커 70px 이내에서만 잡을 수 있다', () => {
    const a = anchorFor(260);
    expect(canGrab({ x: a.x + 69, y: a.y }, a)).toBe(true);
    expect(canGrab({ x: a.x + 71, y: a.y }, a)).toBe(false);
  });

  it('발사 위치는 주머니 위치이고, 지면 아래로 들어가지 않는다', () => {
    const a = anchorFor(260);
    expect(launchPosition(a, { x: -100, y: 20 }, 22)).toEqual({ x: 160, y: 850 });
    const low = launchPosition(a, { x: 0, y: 130 }, 22);
    expect(low.y).toBeLessThanOrEqual(GROUND_Y - 22 - 1);
  });
});
