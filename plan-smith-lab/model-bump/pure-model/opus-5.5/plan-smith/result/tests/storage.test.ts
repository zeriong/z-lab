import { afterEach, describe, expect, it, vi } from 'vitest';
import { SAVE_KEY } from '../src/config';
import { MemoryStorage, SaveStore, defaultSave, parseSave, type StorageLike } from '../src/storage/storage';

class ThrowingStorage implements StorageLike {
  getItem(): string | null {
    throw new DOMException('blocked', 'SecurityError');
  }
  setItem(): void {
    throw new DOMException('blocked', 'SecurityError');
  }
}

afterEach(() => vi.restoreAllMocks());

describe('storage', () => {
  it('round-trips progress, best score, stars and mute', () => {
    const mem = new MemoryStorage();
    const a = new SaveStore(mem);
    a.load();
    expect(a.recordClear(1, 32000, 2)).toBe(true);
    a.setMuted(true);

    const b = new SaveStore(mem);
    const data = b.load();
    expect(data.unlocked).toBe(2);
    expect(data.stages['1']).toEqual({ bestScore: 32000, stars: 2 });
    expect(data.muted).toBe(true);
  });

  it('best score and stars only increase; unlock never exceeds 10', () => {
    const s = new SaveStore(new MemoryStorage());
    s.load();
    s.recordClear(3, 50000, 3);
    expect(s.recordClear(3, 20000, 1)).toBe(false);
    expect(s.record(3)).toEqual({ bestScore: 50000, stars: 3 });
    s.recordClear(10, 1, 1);
    expect(s.unlocked).toBe(10);
  });

  it('broken JSON → defaults (stage 1 only)', () => {
    const mem = new MemoryStorage();
    mem.setItem(SAVE_KEY, '{not json');
    const s = new SaveStore(mem);
    expect(s.load()).toEqual(defaultSave());
  });

  it('wrong shape → defaults', () => {
    expect(parseSave(JSON.stringify({ version: 1, unlocked: 99, stages: {}, muted: false }))).toBeNull();
    expect(parseSave(JSON.stringify({ version: 2, unlocked: 1, stages: {}, muted: false }))).toBeNull();
    expect(parseSave(JSON.stringify({ version: 1, unlocked: 1, stages: { 1: { bestScore: 'x', stars: 1 } }, muted: false }))).toBeNull();
    expect(parseSave(JSON.stringify([]))).toBeNull();
  });

  it('throwing storage → memory fallback, warns once, game keeps working', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const s = new SaveStore(new ThrowingStorage());
    expect(s.load()).toEqual(defaultSave());
    s.recordClear(1, 1000, 1);
    s.setMuted(true);
    expect(s.unlocked).toBe(2);
    expect(s.muted).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
