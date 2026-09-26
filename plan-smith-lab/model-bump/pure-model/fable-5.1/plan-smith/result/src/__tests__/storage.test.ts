import { describe, expect, it } from 'vitest';
import {
  SAVE_KEY,
  applyResult,
  createMemoryStorage,
  defaultSave,
  isUnlocked,
  loadSave,
  parseSave,
  resolveStore,
  writeSave,
} from '../storage';

describe('storage (D5)', () => {
  it('round-trips through a storage backend', () => {
    const store = createMemoryStorage();
    const data = { unlocked: 4, stars: [3, 2, 1, 0, 0, 0, 0, 0, 0, 0], muted: true };
    expect(writeSave(data, store)).toBe(true);
    expect(store.getItem(SAVE_KEY)).not.toBeNull();
    expect(loadSave(store)).toEqual(data);
  });

  it('falls back to defaults on garbage or wrong schema', () => {
    expect(parseSave(null)).toEqual(defaultSave());
    expect(parseSave('not json')).toEqual(defaultSave());
    expect(parseSave('42')).toEqual(defaultSave());
    const partial = parseSave(JSON.stringify({ unlocked: 99, stars: [5, -1, 'x'], muted: 'yes' }));
    expect(partial.unlocked).toBe(10);
    expect(partial.stars).toEqual([3, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(partial.muted).toBe(false);
  });

  it('applyResult unlocks the next stage and keeps the best stars', () => {
    let save = defaultSave();
    save = applyResult(save, 1, 2);
    expect(save.unlocked).toBe(2);
    expect(save.stars[0]).toBe(2);
    save = applyResult(save, 1, 1);
    expect(save.stars[0]).toBe(2);
    save = applyResult(save, 10, 3);
    expect(save.unlocked).toBe(10);
    expect(isUnlocked(save, 10)).toBe(true);
    expect(isUnlocked(save, 11)).toBe(false);
  });

  it('resolveStore returns a working memory store when localStorage is unavailable', () => {
    const store = resolveStore();
    expect(writeSave({ ...defaultSave(), unlocked: 3 }, store)).toBe(true);
    expect(loadSave(store).unlocked).toBe(3);
  });

  it('writeSave swallows backend failures', () => {
    const broken = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(writeSave(defaultSave(), broken)).toBe(false);
    expect(loadSave(broken)).toEqual(defaultSave());
  });
});
