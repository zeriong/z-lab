import { describe, expect, it } from 'vitest';
import { Effects, MAX_PARTICLES } from '../effects';

describe('effects (B9)', () => {
  it('a single burst produces between 8 and 16 particles', () => {
    const fx = new Effects(() => 0.5);
    fx.burst(100, 100, '#fff');
    expect(fx.particles.length).toBeGreaterThanOrEqual(8);
    expect(fx.particles.length).toBeLessThanOrEqual(16);
    fx.burst(0, 0, '#fff', 100);
    expect(fx.particles.length).toBeLessThanOrEqual(32);
  });

  it('particles age and die; total is capped', () => {
    const fx = new Effects(() => 0.5);
    for (let i = 0; i < 100; i++) fx.burst(0, 0, '#fff', 16);
    expect(fx.particles.length).toBeLessThanOrEqual(MAX_PARTICLES);
    for (let i = 0; i < 80; i++) fx.update();
    expect(fx.particles.length).toBe(0);
  });

  it('shake lasts n frames then returns the offset to zero', () => {
    const fx = new Effects(() => 0.9);
    fx.shake(6);
    fx.update();
    expect(fx.shakeOffset.x !== 0 || fx.shakeOffset.y !== 0).toBe(true);
    for (let i = 0; i < 6; i++) fx.update();
    expect(fx.shakeFrames).toBe(0);
    expect(fx.shakeOffset).toEqual({ x: 0, y: 0 });
  });
});
