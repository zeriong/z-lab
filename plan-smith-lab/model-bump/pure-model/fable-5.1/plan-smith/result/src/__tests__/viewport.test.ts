import { describe, expect, it } from 'vitest';
import { VIEW } from '../types';
import { fitLetterbox, screenToWorld, worldToScreen } from '../viewport';

describe('viewport (D3)', () => {
  it('letterboxes to 16:9 inside the container', () => {
    const wide = fitLetterbox(1280, 720);
    expect(wide.scale).toBeCloseTo(1280 / VIEW.w, 6);
    expect(wide.ox).toBeCloseTo(0, 6);
    expect(wide.oy).toBeCloseTo(0, 6);

    const square = fitLetterbox(1000, 1000);
    expect(square.scale).toBeCloseTo(1000 / VIEW.w, 6);
    expect(square.cssW).toBeCloseTo(1000, 6);
    expect(square.cssH).toBeCloseTo(562.5, 6);
    expect(square.oy).toBeCloseTo((1000 - 562.5) / 2, 6);

    const tall = fitLetterbox(500, 2000);
    expect(tall.cssW).toBeCloseTo(500, 6);
    expect(tall.ox).toBeCloseTo(0, 6);
  });

  it('screenToWorld(worldToScreen(p)) ≈ p, including camera offset', () => {
    const t = fitLetterbox(1333, 900);
    const cases = [
      { p: { x: 0, y: 0 }, cam: 0 },
      { p: { x: 320, y: 800 }, cam: 0 },
      { p: { x: 1500, y: 300 }, cam: 400 },
      { p: { x: 2599, y: 1079 }, cam: 680 },
    ];
    for (const { p, cam } of cases) {
      const back = screenToWorld(t, worldToScreen(t, p, cam), cam);
      expect(back.x).toBeCloseTo(p.x, 6);
      expect(back.y).toBeCloseTo(p.y, 6);
    }
  });

  it('maps the container corners to the logical canvas corners', () => {
    const t = fitLetterbox(1000, 1000);
    const tl = screenToWorld(t, { x: t.ox, y: t.oy });
    const br = screenToWorld(t, { x: t.ox + t.cssW, y: t.oy + t.cssH });
    expect(tl.x).toBeCloseTo(0, 6);
    expect(tl.y).toBeCloseTo(0, 6);
    expect(br.x).toBeCloseTo(VIEW.w, 6);
    expect(br.y).toBeCloseTo(VIEW.h, 6);
  });
});
