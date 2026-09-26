/**
 * 진행 저장 (§7.5). localStorage['ab.progress.v1'].
 * 파싱 실패·버전 불일치 시 초기값으로 복구한다. 저장소는 주입 가능(테스트용).
 */
import { STAGE_COUNT, STORAGE_KEY } from './config';

export interface Progress {
  version: 1;
  stars: Record<number, number>;
  best: Record<number, number>;
  lastPlayed: number;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export function defaultProgress(): Progress {
  return { version: 1, stars: {}, best: {}, lastPlayed: 1 };
}

function isRecordOfNumbers(v: unknown): v is Record<number, number> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  return Object.values(v as Record<string, unknown>).every((n) => typeof n === 'number' && isFinite(n));
}

/** 손상된 데이터는 초기값으로. 부분적으로 유효한 필드만 골라 담는다. */
export function parseProgress(raw: string | null): Progress {
  const base = defaultProgress();
  if (!raw) return base;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return base;
  }
  if (typeof data !== 'object' || data === null) return base;
  const d = data as Record<string, unknown>;
  if (d.version !== 1) return base;

  const out = defaultProgress();
  if (isRecordOfNumbers(d.stars)) {
    for (const [k, v] of Object.entries(d.stars)) {
      const id = Number(k);
      if (id >= 1 && id <= STAGE_COUNT && v >= 0 && v <= 3) out.stars[id] = Math.floor(v);
    }
  }
  if (isRecordOfNumbers(d.best)) {
    for (const [k, v] of Object.entries(d.best)) {
      const id = Number(k);
      if (id >= 1 && id <= STAGE_COUNT && v >= 0) out.best[id] = Math.floor(v);
    }
  }
  if (typeof d.lastPlayed === 'number' && d.lastPlayed >= 1 && d.lastPlayed <= STAGE_COUNT) {
    out.lastPlayed = Math.floor(d.lastPlayed);
  }
  return out;
}

function detectStorage(): StorageLike | null {
  try {
    if (typeof localStorage !== 'undefined') {
      // 사파리 프라이빗 모드 등에서 접근 자체가 throw 할 수 있다
      localStorage.getItem(STORAGE_KEY);
      return localStorage;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export class ProgressStore {
  private cache: Progress | null = null;

  constructor(
    private readonly storage: StorageLike | null = detectStorage(),
    private readonly key: string = STORAGE_KEY,
  ) {}

  load(): Progress {
    if (this.cache) return this.cache;
    let raw: string | null = null;
    try {
      raw = this.storage?.getItem(this.key) ?? null;
    } catch {
      raw = null;
    }
    this.cache = parseProgress(raw);
    return this.cache;
  }

  save(p: Progress): void {
    this.cache = p;
    try {
      this.storage?.setItem(this.key, JSON.stringify(p));
    } catch {
      /* 저장 불가 환경은 무시 */
    }
  }

  /** 스테이지 결과 기록: 최고 점수·최고 별만 갱신 */
  record(stageId: number, score: number, stars: number): Progress {
    const p = this.load();
    const next: Progress = {
      version: 1,
      stars: { ...p.stars, [stageId]: Math.max(p.stars[stageId] ?? 0, stars) },
      best: { ...p.best, [stageId]: Math.max(p.best[stageId] ?? 0, score) },
      lastPlayed: stageId,
    };
    this.save(next);
    return next;
  }

  setLastPlayed(stageId: number): void {
    const p = this.load();
    if (p.lastPlayed === stageId) return;
    this.save({ ...p, lastPlayed: stageId });
  }

  clear(): void {
    this.cache = null;
    try {
      this.storage?.removeItem?.(this.key);
    } catch {
      /* ignore */
    }
  }
}
