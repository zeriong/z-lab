import { describe, expect, it } from 'vitest';
import { STAGE00, STAGES } from '../../stages';
import type { StageData } from '../../src/core/stage/schema';
import { cloneStage } from '../../src/core/stage/schema';
import { validateStage, validateStageSet } from '../../src/core/stage/validate';

// U-7: 정상 스테이지는 통과하고, 규칙마다 위반 케이스가 각각 실패한다.

const base = (): StageData => cloneStage(STAGES[0]!);

function expectInvalid(mutate: (s: StageData) => void, match: RegExp): void {
  const s = base();
  mutate(s);
  const r = validateStage(s);
  expect(r.ok).toBe(false);
  expect(r.errors.join('\n')).toMatch(match);
}

describe('validate (U-7)', () => {
  it('제품 스테이지 10개가 정적 검증을 통과한다', () => {
    const r = validateStageSet(STAGES);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('stage00은 테스트 옵션으로만 통과한다', () => {
    expect(validateStage(STAGE00, { allowTestStage: true }).ok).toBe(true);
    expect(validateStage(STAGE00).ok).toBe(false);
  });

  it('파일은 정확히 10개', () => {
    expect(validateStageSet(STAGES.slice(0, 9)).ok).toBe(false);
  });

  it('id 중복', () => {
    const list = STAGES.map(cloneStage);
    list[1]!.id = 1;
    const r = validateStageSet(list);
    expect(r.ok).toBe(false);
    expect(r.errors.join('\n')).toMatch(/중복/);
  });

  it('id 범위', () => expectInvalid((s) => (s.id = 11), /id/));
  it('새 0마리', () => expectInvalid((s) => (s.birds = []), /birds/));
  it('새 7마리', () => expectInvalid((s) => (s.birds = Array(7).fill('red')), /birds/));
  it('알 수 없는 새', () => expectInvalid((s) => ((s.birds as string[])[0] = 'blue'), /새 종류/));
  it('돼지 0마리', () => expectInvalid((s) => (s.pigs = []), /pigs/));
  it('월드 경계 밖', () => expectInvalid((s) => (s.pigs[0]!.x = 2400), /경계/));
  it('지면 아래', () => expectInvalid((s) => (s.pigs[0]!.y = 975), /지면/));
  it('블록 최소 치수', () => expectInvalid((s) => (s.blocks[0]!.w = 10), /최소 치수/));
  it('동적 바디 80개 초과', () =>
    expectInvalid((s) => {
      s.blocks = Array.from({ length: 81 }, (_, i) => ({
        material: 'wood' as const, shape: 'rect' as const, x: 400 + (i % 40) * 40, y: 960 - Math.floor(i / 40) * 40, w: 40, h: 40,
      }));
    }, /80/));
  it('stars 오름차순', () => expectInvalid((s) => (s.stars = [30000, 20000]), /오름차순/));
  it('stars 양수', () => expectInvalid((s) => (s.stars = [-1, 20000]), /양수/));
  it('solution이 birds보다 길다', () =>
    expectInvalid((s) => (s.solution = [{ pull: [1, 1] }, { pull: [1, 1] }, { pull: [1, 1] }, { pull: [1, 1] }]), /solution/));
  it('잘못된 구조', () => {
    expect(validateStage(null).ok).toBe(false);
    expect(validateStage({ id: 1 }).ok).toBe(false);
    expectInvalid((s) => ((s.blocks[0] as unknown as Record<string, unknown>).material = 'gold'), /재질/);
  });
});
