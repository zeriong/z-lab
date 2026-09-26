import { describe, expect, it } from 'vitest';
import { STAGES } from '../../stages';
import type { BlockDef } from '../../src/core/stage/schema';
import { cloneStage } from '../../src/core/stage/schema';
import { GameSession } from '../../src/core/GameSession';
import { replaySolution } from '../../src/core/replay';
import { launchWhenReady, maxDrift, newSession, poses, stepFor, stepUntil } from './helpers';

// S-1~S-3: Phase 0 스파이크(적층, 터널링, 결정론)를 회귀 테스트로 유지한다.

describe('S-1 적층 안정성', () => {
  it('나무 판자 10단 탑과 돌 5단 피라미드가 10s 동안 무너지지 않고 이동량 < 2px', () => {
    const blocks: BlockDef[] = [];
    // 나무 판자(100×20) 10단
    for (let i = 0; i < 10; i++) blocks.push({ material: 'wood', shape: 'rect', x: 900, y: 970 - i * 20, w: 100, h: 20 });
    // 돌 상자(40×40) 5단 피라미드
    for (let row = 0; row < 5; row++) {
      const count = 5 - row;
      const x0 = 1300 + row * 20;
      for (let i = 0; i < count; i++) {
        blocks.push({ material: 'stone', shape: 'rect', x: x0 + i * 40, y: 960 - row * 40, w: 40, h: 40 });
      }
    }
    const s = newSession({ blocks }, { graceSeconds: 0 });
    const before = poses(s);
    stepFor(s, 10);
    const after = poses(s);
    expect(s.blocks.every((b) => b.alive)).toBe(true);
    expect(maxDrift(before, after)).toBeLessThan(2);
    s.destroy();
  });
});

describe('S-2 터널링', () => {
  it('가속한 노란 새(약 55 m/s)가 20px 유리판을 접촉 없이 통과하는 경우가 0건', () => {
    const PANE_X = 1200;
    const PANE_TOP = 700;
    let tunnels = 0;
    let crossings = 0;
    for (let i = 0; i < 50; i++) {
      // -6° ~ +10° 사이 50가지 발사 각도
      const deg = -6 + (16 * i) / 49;
      const r = (deg * Math.PI) / 180;
      const s = newSession(
        {
          birds: ['yellow'],
          blocks: [{ material: 'glass', shape: 'rect', x: PANE_X, y: 840, w: 20, h: 280 }],
        },
        { graceSeconds: 0 },
      );
      launchWhenReady(s, [-130 * Math.cos(r), 130 * Math.sin(r)]);
      s.activateAbility();
      const pane = s.blocks[0]!;
      const start = s.poseOf(pane.body)!;
      let crossedY: number | null = null;
      let prevX = s.poseOf(s.bird?.body ?? null)?.x ?? 0;
      for (let k = 0; k < 90; k++) {
        s.step();
        const p = s.poseOf(s.bird?.body ?? null);
        if (!p) break;
        if (prevX < PANE_X && p.x >= PANE_X && crossedY === null) crossedY = p.y;
        prevX = p.x;
      }
      if (crossedY !== null && crossedY >= PANE_TOP - 20 && crossedY <= 980) {
        crossings++;
        const now = pane.alive ? s.poseOf(pane.body) : null;
        const touched = !pane.alive || pane.hp < pane.maxHp || !now || Math.hypot(now.x - start.x, now.y - start.y) > 0.5;
        if (!touched) tunnels++;
      }
      s.destroy();
    }
    expect(crossings).toBeGreaterThan(0);
    expect(tunnels).toBe(0);
  });
});

describe('S-3 결정론', () => {
  it('같은 스테이지에서 같은 샷을 2회 돌리면 최종 바디 좌표가 비트 단위로 같다', () => {
    const run = () => {
      const s = new GameSession(cloneStage(STAGES[1]!));
      const r = replaySolution(s, STAGES[1]!.solution, { maxSeconds: 40 });
      const out = { outcome: r.outcome, score: r.score, poses: poses(s), simTime: s.simTime };
      s.destroy();
      return out;
    };
    const a = run();
    const b = run();
    expect(b.outcome).toBe(a.outcome);
    expect(b.score).toBe(a.score);
    expect(b.simTime).toBe(a.simTime);
    expect(b.poses.length).toBe(a.poses.length);
    a.poses.forEach((p, i) => {
      const q = b.poses[i]!;
      expect(Object.is(p.x, q.x) && Object.is(p.y, q.y) && Object.is(p.angle, q.angle)).toBe(true);
    });
  });

  it('발사 없이 진행해도 결정론적이다', () => {
    const run = () => {
      const s = new GameSession(cloneStage(STAGES[8]!));
      stepUntil(s, () => false, 3);
      const out = poses(s);
      s.destroy();
      return out;
    };
    expect(run()).toEqual(run());
  });
});
