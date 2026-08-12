import { describe, expect, it } from 'vitest';
import { clampDrag, dragToLaunchVector, MAX_DRAG_DISTANCE, POWER_MULTIPLIER } from '../src/game/slingshotInput';

describe('clampDrag', () => {
  it('leaves drags within MAX_DRAG_DISTANCE unchanged', () => {
    const drag = { dx: 30, dy: 40 }; // distance 50 < 120
    expect(clampDrag(drag)).toEqual(drag);
  });

  it('clamps drags exceeding MAX_DRAG_DISTANCE to the max distance', () => {
    const drag = { dx: 300, dy: 0 };
    const clamped = clampDrag(drag);
    expect(Math.hypot(clamped.dx, clamped.dy)).toBeCloseTo(MAX_DRAG_DISTANCE, 5);
  });

  it('handles the zero-distance boundary without producing NaN', () => {
    const clamped = clampDrag({ dx: 0, dy: 0 });
    expect(clamped).toEqual({ dx: 0, dy: 0 });
  });
});

describe('dragToLaunchVector', () => {
  it('produces a launch vector opposite to the drag direction', () => {
    const launch = dragToLaunchVector({ dx: 50, dy: 0 });
    expect(launch.vx).toBeLessThan(0);
    expect(launch.vy).toBe(0);
  });

  it('scales by POWER_MULTIPLIER after clamping', () => {
    const launch = dragToLaunchVector({ dx: 300, dy: 0 });
    expect(launch.vx).toBeCloseTo(-MAX_DRAG_DISTANCE * POWER_MULTIPLIER, 5);
  });
});
