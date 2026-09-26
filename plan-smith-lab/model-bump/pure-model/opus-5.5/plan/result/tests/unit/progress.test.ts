import { describe, expect, it } from 'vitest';
import {
  MemoryStore,
  PROGRESS_KEY,
  ProgressStore,
  sanitizeProgress,
} from '../../src/storage/progress';
import type { KeyValueStore } from '../../src/storage/progress';

// U-8: 해금과 최고 기록 갱신, 손상된 저장값 복구, 저장소를 쓸 수 없을 때의 폴백

describe('progress (U-8)', () => {
  it('처음에는 1단계만 해금', () => {
    const p = new ProgressStore(new MemoryStore());
    expect(p.unlocked).toBe(1);
    expect(p.isUnlocked(1)).toBe(true);
    expect(p.isUnlocked(2)).toBe(false);
  });

  it('클리어하면 다음 단계 해금, 최고 기록은 더 높을 때만 갱신', () => {
    const store = new MemoryStore();
    const p = new ProgressStore(store);
    p.recordClear(1, 20000, 2);
    expect(p.unlocked).toBe(2);
    expect(p.record(1)).toEqual({ bestScore: 20000, stars: 2 });
    p.recordClear(1, 15000, 1);
    expect(p.record(1)).toEqual({ bestScore: 20000, stars: 2 });
    p.recordClear(1, 30000, 3);
    expect(p.record(1)).toEqual({ bestScore: 30000, stars: 3 });
    // 낮은 단계를 다시 깨도 해금이 줄지 않는다
    p.recordClear(5, 1, 1);
    p.recordClear(2, 1, 1);
    expect(p.unlocked).toBe(6);
    p.recordClear(10, 1, 1);
    expect(p.unlocked).toBe(10);

    // 새로 불러와도 유지된다 (새로고침)
    const again = new ProgressStore(store);
    expect(again.unlocked).toBe(10);
    expect(again.record(1)).toEqual({ bestScore: 30000, stars: 3 });
    expect(JSON.parse(store.getItem(PROGRESS_KEY)!)).toMatchObject({ unlocked: 10 });
  });

  it('손상된 저장값은 초기값으로 복구', () => {
    for (const raw of ['{not json', '42', '{"unlocked": 0, "stages": {}}', '{"unlocked": 3}', '{"unlocked": 2, "stages": {"1": {"bestScore": "x", "stars": 1}}}', '{"unlocked": 2, "stages": {"99": {"bestScore": 1, "stars": 1}}}']) {
      const store = new MemoryStore();
      store.setItem(PROGRESS_KEY, raw);
      const p = new ProgressStore(store);
      expect(p.unlocked).toBe(1);
      expect(p.record(1)).toBeNull();
    }
    expect(sanitizeProgress({ unlocked: 4, stages: { 2: { bestScore: 100, stars: 3 } } })).toEqual({
      unlocked: 4,
      stages: { '2': { bestScore: 100, stars: 3 } },
    });
  });

  it('저장소를 쓸 수 없으면 메모리에만 저장하고 계속 동작한다', () => {
    const p = new ProgressStore(null);
    p.recordClear(1, 100, 1);
    expect(p.unlocked).toBe(2);

    const throwing: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    const q = new ProgressStore(throwing);
    expect(q.unlocked).toBe(1);
    expect(() => q.recordClear(1, 100, 1)).not.toThrow();
    expect(q.unlocked).toBe(2);
    expect(() => q.reset()).not.toThrow();
  });

  it('?unlock=all: 모두 해금하되 저장하지 않는다', () => {
    const store = new MemoryStore();
    const p = new ProgressStore(store, { unlockAll: true });
    expect(p.isUnlocked(10)).toBe(true);
    p.recordClear(3, 100, 1);
    expect(store.getItem(PROGRESS_KEY)).toBeNull();
  });

  it('초기화', () => {
    const store = new MemoryStore();
    const p = new ProgressStore(store);
    p.recordClear(1, 100, 1);
    p.reset();
    expect(p.unlocked).toBe(1);
    expect(store.getItem(PROGRESS_KEY)).toBeNull();
  });
});
