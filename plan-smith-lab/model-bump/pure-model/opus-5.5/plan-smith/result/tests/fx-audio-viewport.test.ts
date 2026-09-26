import { describe, expect, it } from 'vitest';
import { AudioEngine, SilentAudio } from '../src/audio/audio';
import { MAX_FRAME_MS, MAX_STEPS_PER_FRAME, PARTICLE_CAP, STEP_MS } from '../src/config';
import { GameLoop } from '../src/core/loop';
import { Effects } from '../src/fx/effects';
import { Viewport, computeFit } from '../src/render/viewport';
import type { SoundId } from '../src/types';

describe('fx', () => {
  it('50 simultaneous destructions keep particles ≤ 300', () => {
    const fx = new Effects(1);
    for (let i = 0; i < 50; i++) {
      fx.debris(800 + i * 10, 700, '#c8893e');
      fx.smoke(800 + i * 10, 700);
      fx.popup(800, 700, '+500');
    }
    expect(fx.particles.length).toBeLessThanOrEqual(PARTICLE_CAP);
    for (let i = 0; i < 100; i++) fx.step();
    expect(fx.particles.length).toBe(0);
    expect(fx.popups.length).toBe(0);
  });

  it('debris burst is 8–12 pieces', () => {
    const fx = new Effects(7);
    fx.debris(0, 0, '#fff');
    expect(fx.particles.length).toBeGreaterThanOrEqual(8);
    expect(fx.particles.length).toBeLessThanOrEqual(12);
  });

  it('shake decays to zero in 12 steps', () => {
    const fx = new Effects();
    fx.shake();
    expect(fx.shakeOffset()).not.toEqual({ x: 0, y: 0 });
    for (let i = 0; i < 12; i++) fx.step();
    expect(fx.shakeOffset()).toEqual({ x: 0, y: 0 });
  });
});

describe('audio', () => {
  it('does nothing (and never throws) without AudioContext', () => {
    const a = new AudioEngine(false);
    expect(() => {
      a.unlock();
      for (const id of ['launch', 'impact', 'break-glass', 'break-wood', 'break-stone', 'pig', 'clear', 'fail'] as SoundId[]) a.play(id, 1);
      a.setMuted(true);
    }).not.toThrow();
    expect(a.muted).toBe(true);
  });

  it('silent audio respects mute', () => {
    const a = new SilentAudio();
    a.play('launch');
    a.setMuted(true);
    a.play('pig');
    expect(a.played).toEqual(['launch']);
  });
});

describe('viewport', () => {
  it.each([
    [1600, 900],
    [1280, 960],
    [2560, 1080],
  ])('screenToWorld ∘ worldToScreen round-trip < 0.01 at %ix%i', (w, h) => {
    const v = new Viewport();
    v.resize(w, h, 2);
    expect(v.scale).toBeGreaterThan(0);
    for (const p of [
      { x: 0, y: 0 },
      { x: 240, y: 680 },
      { x: 1600, y: 900 },
      { x: 1234.5, y: 321.25 },
    ]) {
      const back = v.screenToWorld(v.worldToScreen(p));
      expect(Math.hypot(back.x - p.x, back.y - p.y)).toBeLessThan(0.01);
    }
  });

  it('letterboxes while keeping 16:9', () => {
    const tall = computeFit(1280, 960);
    expect(tall.width / tall.height).toBeCloseTo(16 / 9, 6);
    expect(tall.offsetX).toBeCloseTo(0, 6);
    expect(tall.offsetY).toBeGreaterThan(0);
    const wide = computeFit(2560, 1080);
    expect(wide.offsetY).toBeCloseTo(0, 6);
    expect(wide.offsetX).toBeGreaterThan(0);
  });

  it('cold start scale is 0 (input ignored until resize)', () => {
    expect(new Viewport().scale).toBe(0);
  });
});

describe('loop', () => {
  function makeLoop(shouldStep: () => boolean) {
    let steps = 0;
    let renders = 0;
    const loop = new GameLoop(
      { shouldStep, step: () => steps++, render: () => renders++ },
      { request: () => 0, cancel: () => undefined },
    );
    return { loop, steps: () => steps, renders: () => renders };
  }

  it('fixed steps from accumulated time', () => {
    const t = makeLoop(() => true);
    t.loop.frame(0);
    t.loop.frame(STEP_MS * 3 + 1);
    expect(t.steps()).toBe(3);
    expect(t.renders()).toBe(2);
  });

  it('long frames are clamped: at most 5 steps, no backlog', () => {
    const t = makeLoop(() => true);
    t.loop.frame(0);
    expect(t.loop.frame(5000)).toBe(MAX_STEPS_PER_FRAME);
    expect(t.loop.frame(5000 + STEP_MS / 2)).toBe(0);
    expect(MAX_FRAME_MS).toBe(250);
  });

  it('no physics steps when shouldStep is false, but still renders', () => {
    const t = makeLoop(() => false);
    t.loop.frame(0);
    t.loop.frame(100);
    expect(t.steps()).toBe(0);
    expect(t.renders()).toBe(2);
  });
});
