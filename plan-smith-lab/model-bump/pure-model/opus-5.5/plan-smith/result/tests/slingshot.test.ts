// 슬링샷: 잡기 반경, 최소 당김 미만이면 취소, 발사 시 바디 1개 추가 + 속도 = pull×K
import { describe, expect, it } from 'vitest';
import { ANCHOR, LAUNCH_K, MAX_PULL } from '../src/config';
import { Slingshot, clampPull } from '../src/game/slingshot';
import { StageSession } from '../src/physics/session';
import { fixture } from './helpers';

describe('slingshot', () => {
  it('grabs only within 60 units of the bird', () => {
    const s = new Slingshot();
    s.load('red');
    expect(s.grab({ x: ANCHOR.x + 70, y: ANCHOR.y })).toBe(false);
    expect(s.grab({ x: ANCHOR.x + 40, y: ANCHOR.y + 30 })).toBe(true);
    expect(s.state).toBe('DRAGGING');
  });

  it('clamps pull length to 120', () => {
    const p = clampPull({ x: 300, y: 0 }, 22);
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(MAX_PULL, 6);
  });

  it('releasing under 15 units cancels back to LOADED without adding a body', () => {
    const session = StageSession.create(fixture());
    const before = session.worldBodyCount();
    expect(session.grab({ x: ANCHOR.x, y: ANCHOR.y })).toBe(true);
    session.drag({ x: ANCHOR.x - 8, y: ANCHOR.y + 5 });
    expect(session.release()).toBe(false);
    expect(session.slingshot.state).toBe('LOADED');
    expect(session.phase).toBe('AIMING');
    expect(session.worldBodyCount()).toBe(before);
    expect(session.birdsLeft).toBe(3);
  });

  it('launch adds exactly one body with velocity pull×K and decrements birdsLeft', () => {
    const session = StageSession.create(fixture());
    const before = session.worldBodyCount();
    expect(session.grab({ x: ANCHOR.x, y: ANCHOR.y })).toBe(true);
    session.drag({ x: ANCHOR.x - 90, y: ANCHOR.y + 40 }); // pull = (90, -40)
    expect(session.slingshot.preview.length).toBe(15);
    expect(session.release()).toBe(true);
    expect(session.worldBodyCount()).toBe(before + 1);
    const body = session.flight!.parts[0]!.body;
    expect(body.velocity.x).toBeCloseTo(90 * LAUNCH_K, 6);
    expect(body.velocity.y).toBeCloseTo(-40 * LAUNCH_K, 6);
    expect(body.position.x).toBeCloseTo(ANCHOR.x - 90, 6);
    expect(session.phase).toBe('FLYING');
    expect(session.birdsLeft).toBe(2);
    expect(session.slingshot.state).toBe('EMPTY');
  });

  it('bird on the slingshot is not part of the physics world', () => {
    const session = StageSession.create(fixture());
    expect(session.registry.count('bird')).toBe(0);
    expect(session.slingshot.state).toBe('LOADED');
  });
});
