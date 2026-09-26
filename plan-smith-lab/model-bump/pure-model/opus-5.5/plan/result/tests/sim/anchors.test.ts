import { describe, expect, it } from 'vitest';
import { BIRDS } from '../../src/config/catalog';
import type { Material } from '../../src/config/catalog';
import type { BlockDef } from '../../src/core/stage/schema';
import { aimPull, launchWhenReady, newSession, stepFor, stepUntil } from './helpers';

// §11.3 캘리브레이션 앵커. 수치 튜닝(DAMAGE_T, DAMAGE_K, impactFactor, I_max)의 기준이다.
// 앵커 세션은 스폰이 깨끗하므로 유예 시간 0으로 돌린다(A2/S-4가 유예 없는 스폰 안정성을 따로 보장).

const PLANK_X = 620;
const PLANK_Y = 930;

describe('A1 빨간 새 최대 파워, 단독 표준 판자(20×100, 세움)에 수직 직격', () => {
  const cases: [Material, 'destroyed' | 'survives'][] = [
    ['glass', 'destroyed'],
    ['wood', 'destroyed'],
    ['stone', 'survives'],
  ];
  for (const [material, expected] of cases) {
    it(`${material}: ${expected === 'destroyed' ? '파괴' : '파괴되지 않고 HP 60% 이상'}`, () => {
      const s = newSession(
        { blocks: [{ material, shape: 'rect', x: PLANK_X, y: PLANK_Y, w: 20, h: 100 }] },
        { graceSeconds: 0 },
      );
      // 판자 왼쪽 면 가운데 높이로 조준
      const pull = aimPull({ x: PLANK_X - 10 - BIRDS.red.radius, y: PLANK_Y }, { power: 1 });
      expect(launchWhenReady(s, pull)).toBe(true);
      stepFor(s, 0.6);
      const plank = s.blocks[0]!;
      if (expected === 'destroyed') {
        expect(plank.alive).toBe(false);
      } else {
        expect(plank.alive).toBe(true);
        expect(plank.hp / plank.maxHp).toBeGreaterThanOrEqual(0.6);
      }
      s.destroy();
    });
  }
});

describe('A3 빨간 새 60% 파워로 돼지 M에 직격', () => {
  it('돼지 처치', () => {
    const s = newSession({ pigs: [{ size: 'M', x: 700, y: 952 }, { size: 'S', x: 2150, y: 960 }] }, { graceSeconds: 0 });
    const pull = aimPull({ x: 700, y: 945 }, { power: 0.6 });
    launchWhenReady(s, pull);
    stepFor(s, 1.5);
    expect(s.pigs[0]!.alive).toBe(false);
    expect(s.pigs[1]!.alive).toBe(true);
    s.destroy();
  });
});

describe('A4 돼지 S 위로 나무 판자', () => {
  it('200px 높이에서 떨어뜨리면 처치', () => {
    // 돼지 윗면 940, 판자(가로 100×20) 아랫면 740 → 중심 730
    const s = newSession(
      {
        pigs: [{ size: 'S', x: 800, y: 960 }, { size: 'S', x: 2150, y: 960 }],
        blocks: [{ material: 'wood', shape: 'rect', x: 800, y: 730, w: 100, h: 20 }],
      },
      { graceSeconds: 0 },
    );
    stepFor(s, 1.5);
    expect(s.pigs[0]!.alive).toBe(false);
    s.destroy();
  });

  it('그냥 올려놓으면 생존', () => {
    const s = newSession(
      {
        pigs: [{ size: 'S', x: 800, y: 960 }, { size: 'S', x: 2150, y: 960 }],
        blocks: [{ material: 'wood', shape: 'rect', x: 800, y: 930, w: 100, h: 20 }],
      },
      { graceSeconds: 0 },
    );
    stepFor(s, 3);
    expect(s.pigs[0]!.alive).toBe(true);
    s.destroy();
  });
});

describe('A5 가속한 노란 새가 나무 판자 2장이 연속으로 선 벽에 직격', () => {
  it('첫 장 파괴, 새는 두 번째 장에 닿을 때까지 진행', () => {
    const first: BlockDef = { material: 'wood', shape: 'rect', x: 1100, y: 930, w: 20, h: 100 };
    const second: BlockDef = { material: 'wood', shape: 'rect', x: 1160, y: 930, w: 20, h: 100 };
    const s = newSession({ birds: ['yellow'], blocks: [first, second] }, { graceSeconds: 0 });
    const boostAt = 0.1;
    const pull = aimPull({ x: first.x - 10 - BIRDS.yellow.radius, y: 930 }, { kind: 'yellow', boostAt, minDeg: -20, maxDeg: 20 });
    launchWhenReady(s, pull);
    stepUntil(s, () => s.flightTime >= boostAt - 1e-9, 1);
    expect(s.activateAbility()).toBe(true);
    const secondStart = s.poseOf(s.blocks[1]!.body)!;
    stepFor(s, 0.8);
    const a = s.blocks[0]!;
    const b = s.blocks[1]!;
    expect(a.alive).toBe(false);
    const bNow = b.alive ? s.poseOf(b.body) : null;
    const reached = !b.alive || b.hp < b.maxHp || !bNow || Math.hypot(bNow.x - secondStart.x, bNow.y - secondStart.y) > 1;
    expect(reached).toBe(true);
    s.destroy();
  });
});

describe('A6 폭탄 새를 돌 상자(40×40) 3×3 격자 중앙에서 폭발', () => {
  it('중앙에 인접한 돌 4개 이상 파괴', () => {
    const blocks: BlockDef[] = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        blocks.push({ material: 'stone', shape: 'rect', x: 1000 + col * 40, y: 960 - row * 40, w: 40, h: 40 });
      }
    }
    const s = newSession({ blocks }, { graceSeconds: 0 });
    stepFor(s, 0.5);
    // 중앙 = (1040, 920)
    s.detonateAt(1040, 920, 'bomb');
    stepFor(s, 0.5);
    const adjacentIdx = [1, 3, 5, 7]; // 아래 가운데, 가운데 왼쪽, 가운데 오른쪽, 위 가운데
    const destroyed = adjacentIdx.filter((i) => !s.blocks[i]!.alive).length;
    expect(destroyed).toBeGreaterThanOrEqual(4);
    s.destroy();
  });
});
