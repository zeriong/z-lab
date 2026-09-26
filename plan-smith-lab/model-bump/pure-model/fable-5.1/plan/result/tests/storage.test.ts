/** 진행 저장 (§10.1 storage): 저장·로드·손상 데이터 복구. */
import { describe, expect, it } from 'vitest';
import { STORAGE_KEY } from '../src/core/config';
import { defaultProgress, parseProgress, ProgressStore, type StorageLike } from '../src/core/Storage';

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe('storage', () => {
  it('returns defaults for null, garbage and version mismatch', () => {
    expect(parseProgress(null)).toEqual(defaultProgress());
    expect(parseProgress('{not json')).toEqual(defaultProgress());
    expect(parseProgress('"string"')).toEqual(defaultProgress());
    expect(parseProgress(JSON.stringify({ version: 2, stars: { 1: 3 } }))).toEqual(defaultProgress());
  });

  it('keeps valid fields and drops out-of-range or malformed ones', () => {
    const raw = JSON.stringify({
      version: 1,
      stars: { 1: 3, 2: 7, 11: 2, 3: 'x' },
      best: { 1: 12345, 4: -5 },
      lastPlayed: 42,
    });
    const p = parseProgress(raw);
    expect(p.stars).toEqual({ 1: 3 });
    expect(p.best).toEqual({ 1: 12345 });
    expect(p.lastPlayed).toBe(1);
  });

  it('saves and loads through the injected storage', () => {
    const mem = memoryStorage();
    const store = new ProgressStore(mem);
    store.record(3, 20000, 2);
    expect(mem.data.has(STORAGE_KEY)).toBe(true);

    const fresh = new ProgressStore(mem);
    const p = fresh.load();
    expect(p.stars[3]).toBe(2);
    expect(p.best[3]).toBe(20000);
    expect(p.lastPlayed).toBe(3);
  });

  it('record keeps the best score and the most stars', () => {
    const store = new ProgressStore(memoryStorage());
    store.record(5, 30000, 3);
    store.record(5, 10000, 1);
    const p = store.load();
    expect(p.best[5]).toBe(30000);
    expect(p.stars[5]).toBe(3);
  });

  it('works without any storage (null) and recovers from a throwing storage', () => {
    const none = new ProgressStore(null);
    expect(none.load()).toEqual(defaultProgress());
    expect(() => none.record(1, 100, 1)).not.toThrow();

    const throwing: StorageLike = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    };
    const store = new ProgressStore(throwing);
    expect(store.load()).toEqual(defaultProgress());
    expect(() => store.record(2, 500, 1)).not.toThrow();
    expect(store.load().stars[2]).toBe(1); // 캐시로 동작
  });
});
