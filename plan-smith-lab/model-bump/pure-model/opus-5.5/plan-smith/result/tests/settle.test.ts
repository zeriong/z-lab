// settle: 입력 없이 300스텝 → 죽은 돼지 0, 파괴된 블록 0, 최대 변위 ≤ 3 (A1 조기 검증 포함)
import { describe, expect, it } from 'vitest';
import { STAGES } from '../src/stages';
import type { BlockDef } from '../src/types';
import { fixture, settle } from './helpers';

/** 고정 픽스처: 나무 12블록 3층 탑 (층마다 기둥 3 + 판 1) */
function tower12(): BlockDef[] {
  const out: BlockDef[] = [];
  for (let k = 0; k < 3; k++) {
    const bottom = 820 - 100 * k;
    for (const dx of [-60, 0, 60]) out.push({ kind: 'box', material: 'wood', x: 1100 + dx, y: bottom - 40, w: 20, h: 80 });
    out.push({ kind: 'box', material: 'wood', x: 1100, y: bottom - 90, w: 140, h: 20 });
  }
  return out;
}

describe('settle', () => {
  it('fixture: wooden 12-block 3-storey tower stays put (A1)', () => {
    const r = settle(fixture({ blocks: tower12(), pigs: [{ type: 'small', x: 1100, y: 500 }] }));
    expect(r.pigsLost).toBe(0);
    expect(r.blocksLost).toBe(0);
    expect(r.maxDisplacement).toBeLessThanOrEqual(3);
  });

  it.each(STAGES.map((s) => [s.id, s] as const))('stage %i settles without input', (_id, stage) => {
    const r = settle(stage, 300);
    expect(r.pigsLost).toBe(0);
    expect(r.blocksLost).toBe(0);
    expect(r.maxDisplacement).toBeLessThanOrEqual(3);
  });
});
