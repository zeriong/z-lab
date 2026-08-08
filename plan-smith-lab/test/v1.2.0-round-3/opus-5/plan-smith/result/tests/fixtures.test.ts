// 스테이지 픽스처 — 고정 입력열로 stepCap 이내에 돼지가 전멸하는지 커맨드로 판정한다.
// 입력열(각도·힘)은 스테이지 저작과 같은 커밋에서 함께 유지된다.

import { describe, expect, it } from 'vitest';
import { stageDefs } from '../src/stages';
import { aim, runFixture } from './fixtureRunner';
import type { AimInput } from './fixtureRunner';

const SEQUENCES: Record<number, AimInput[]> = {
  1: [aim(38, 1), aim(30, 1), aim(45, 1)],
  2: [aim(36, 1), aim(30, 1), aim(42, 1)],
  3: [aim(35, 1), aim(28, 1), aim(44, 1)],
  4: [aim(40, 1), aim(33, 1), aim(28, 1), aim(46, 1)],
  5: [aim(37, 1), aim(30, 1), aim(44, 1), aim(26, 1)],
  6: [aim(42, 1), aim(34, 1), aim(28, 1), aim(48, 1)],
  7: [aim(36, 1), aim(30, 1), aim(43, 1), aim(26, 1)],
  8: [aim(39, 1), aim(32, 1), aim(27, 1), aim(45, 1)],
  9: [aim(41, 1), aim(35, 1), aim(30, 1), aim(26, 1), aim(47, 1)],
  10: [aim(40, 1), aim(34, 1), aim(29, 1), aim(25, 1), aim(46, 1)],
};

describe('10 스테이지 픽스처', () => {
  for (const def of stageDefs) {
    it(`스테이지 ${def.id} — stepCap(${def.stepCap}) 이내에 돼지 전멸`, () => {
      const r = runFixture(def, SEQUENCES[def.id]);
      expect(r.pigsAlive).toBe(0);
      expect(r.cleared).toBe(true);
      expect(r.steps).toBeLessThanOrEqual(def.stepCap);
      expect(r.birdsUsed).toBeLessThanOrEqual(def.birds);
    });
  }

  it('스테이지 10의 평균 스텝 처리 시간이 프레임 예산 안에 있다', () => {
    const def = stageDefs[9];
    const r = runFixture(def, SEQUENCES[10]);
    expect(r.msPerStep).toBeLessThanOrEqual(4);
  });
});
