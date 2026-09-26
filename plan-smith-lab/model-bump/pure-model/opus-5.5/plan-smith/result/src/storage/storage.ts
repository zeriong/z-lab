// 저장 (§4.12). 키 slingshot-bird.save.v1
// Storage 비슷한 객체를 주입받는다. 접근이 예외를 던지면 메모리 저장소로 바꾸고 console.warn을 한 번만 찍는다.
import { SAVE_KEY, STAGE_COUNT } from '../config';
import type { SaveData, StageRecord } from '../types';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class MemoryStorage implements StorageLike {
  private readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

export function defaultSave(): SaveData {
  return { version: 1, unlocked: 1, stages: {}, muted: false };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** 형태 검사. 틀리면 null */
export function parseSave(raw: string | null): SaveData | null {
  if (raw === null) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data)) return null;
  if (data['version'] !== 1) return null;
  const unlocked = data['unlocked'];
  if (typeof unlocked !== 'number' || !Number.isInteger(unlocked) || unlocked < 1 || unlocked > STAGE_COUNT) return null;
  const muted = data['muted'];
  if (typeof muted !== 'boolean') return null;
  const stagesRaw = data['stages'];
  if (!isRecord(stagesRaw)) return null;
  const stages: Record<string, StageRecord> = {};
  for (const [id, rec] of Object.entries(stagesRaw)) {
    const n = Number(id);
    if (!Number.isInteger(n) || n < 1 || n > STAGE_COUNT) return null;
    if (!isRecord(rec)) return null;
    const best = rec['bestScore'];
    const stars = rec['stars'];
    if (typeof best !== 'number' || !Number.isFinite(best) || best < 0) return null;
    if (typeof stars !== 'number' || !Number.isInteger(stars) || stars < 0 || stars > 3) return null;
    stages[String(n)] = { bestScore: best, stars };
  }
  return { version: 1, unlocked, stages, muted };
}

export class SaveStore {
  private storage: StorageLike;
  private data: SaveData = defaultSave();
  private warned = false;

  constructor(storage?: StorageLike | null) {
    this.storage = storage ?? new MemoryStorage();
  }

  /** 브라우저의 localStorage를 안전하게 얻는다 (접근 자체가 SecurityError를 던질 수 있음) */
  static browser(): SaveStore {
    let s: StorageLike | null = null;
    try {
      s = typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
      s = null;
    }
    const store = new SaveStore(s ?? new MemoryStorage());
    if (!s) store.warnOnce(new Error('localStorage unavailable'));
    return store;
  }

  private warnOnce(err: unknown): void {
    if (this.warned) return;
    this.warned = true;
    console.warn('[slingshot-bird] 저장소를 쓸 수 없어 메모리 저장소로 바꿉니다.', err);
  }

  private fallback(err: unknown): void {
    this.warnOnce(err);
    this.storage = new MemoryStorage();
  }

  load(): SaveData {
    let raw: string | null = null;
    try {
      raw = this.storage.getItem(SAVE_KEY);
    } catch (err) {
      this.fallback(err);
      raw = null;
    }
    this.data = parseSave(raw) ?? defaultSave();
    return this.get();
  }

  get(): SaveData {
    return { ...this.data, stages: { ...this.data.stages } };
  }

  private persist(): void {
    const raw = JSON.stringify(this.data);
    try {
      this.storage.setItem(SAVE_KEY, raw);
    } catch (err) {
      this.fallback(err);
      try {
        this.storage.setItem(SAVE_KEY, raw);
      } catch {
        /* 메모리 저장소는 던지지 않는다 */
      }
    }
  }

  get unlocked(): number {
    return this.data.unlocked;
  }

  get muted(): boolean {
    return this.data.muted;
  }

  record(stageId: number): StageRecord {
    return this.data.stages[String(stageId)] ?? { bestScore: 0, stars: 0 };
  }

  /** STAGE_CLEARED 때만 호출. 해금 + 최고점·별은 늘어날 때만 갱신. 새 최고 기록이면 true */
  recordClear(stageId: number, score: number, stars: number): boolean {
    const prev = this.record(stageId);
    const newBest = score > prev.bestScore;
    this.data.stages[String(stageId)] = {
      bestScore: Math.max(prev.bestScore, score),
      stars: Math.max(prev.stars, stars),
    };
    this.data.unlocked = Math.min(STAGE_COUNT, Math.max(this.data.unlocked, stageId + 1));
    this.persist();
    return newBest;
  }

  setMuted(muted: boolean): void {
    this.data.muted = muted;
    this.persist();
  }
}
