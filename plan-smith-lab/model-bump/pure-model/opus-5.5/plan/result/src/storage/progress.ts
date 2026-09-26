import { STAGE_COUNT } from '../config/constants';

/**
 * 진행도 저장 (§9). 키 slingshot.progress.v1.
 * 값: { unlocked: 1..10, stages: { [id]: { bestScore, stars } } }
 * 파싱 실패·스키마 불일치 → 초기값. localStorage를 쓸 수 없으면 메모리에만 저장한다.
 */

export const PROGRESS_KEY = 'slingshot.progress.v1';

export interface StageRecord {
  bestScore: number;
  stars: number;
}

export interface Progress {
  unlocked: number;
  stages: Record<string, StageRecord>;
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function defaultProgress(): Progress {
  return { unlocked: 1, stages: {} };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** 저장값을 검사해 올바른 Progress로 만든다. 스키마가 맞지 않으면 초기값 */
export function sanitizeProgress(raw: unknown, total = STAGE_COUNT): Progress {
  if (!isObj(raw)) return defaultProgress();
  const unlocked = raw.unlocked;
  if (typeof unlocked !== 'number' || !Number.isInteger(unlocked) || unlocked < 1 || unlocked > total) {
    return defaultProgress();
  }
  if (!isObj(raw.stages)) return defaultProgress();
  const stages: Record<string, StageRecord> = {};
  for (const [k, v] of Object.entries(raw.stages)) {
    const id = Number(k);
    if (!Number.isInteger(id) || id < 1 || id > total || !isObj(v)) return defaultProgress();
    const { bestScore, stars } = v;
    if (typeof bestScore !== 'number' || !Number.isFinite(bestScore) || bestScore < 0) return defaultProgress();
    if (typeof stars !== 'number' || !Number.isInteger(stars) || stars < 0 || stars > 3) return defaultProgress();
    stages[String(id)] = { bestScore, stars };
  }
  return { unlocked, stages };
}

/** 쓰기까지 되는 localStorage를 돌려준다. 막혀 있으면 null */
export function detectLocalStorage(): KeyValueStore | null {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return null;
    const probe = `${PROGRESS_KEY}.probe`;
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

export interface ProgressOptions {
  total?: number;
  /** ?unlock=all: 모든 스테이지를 해금하되 저장하지 않는다 */
  unlockAll?: boolean;
}

export class ProgressStore {
  private data: Progress;
  private readonly total: number;
  private readonly persist: boolean;

  constructor(private readonly storage: KeyValueStore | null, opts: ProgressOptions = {}) {
    this.total = opts.total ?? STAGE_COUNT;
    this.persist = !opts.unlockAll && storage !== null;
    this.data = this.load();
    if (opts.unlockAll) this.data = { ...this.data, unlocked: this.total };
  }

  private load(): Progress {
    if (!this.storage) return defaultProgress();
    try {
      const raw = this.storage.getItem(PROGRESS_KEY);
      if (raw === null) return defaultProgress();
      return sanitizeProgress(JSON.parse(raw), this.total);
    } catch {
      return defaultProgress();
    }
  }

  private save(): void {
    if (!this.persist || !this.storage) return;
    try {
      this.storage.setItem(PROGRESS_KEY, JSON.stringify(this.data));
    } catch {
      // 저장 실패(용량 초과 등)는 무시하고 메모리 값으로 계속한다.
    }
  }

  get unlocked(): number {
    return this.data.unlocked;
  }

  isUnlocked(id: number): boolean {
    return id >= 1 && id <= this.data.unlocked;
  }

  record(id: number): StageRecord | null {
    return this.data.stages[String(id)] ?? null;
  }

  totalStars(): number {
    return Object.values(this.data.stages).reduce((s, r) => s + r.stars, 0);
  }

  /** 스테이지 n 클리어: unlocked = max(unlocked, n+1). 최고 점수와 별은 더 높을 때만 덮어쓴다 */
  recordClear(id: number, score: number, stars: number): { newBest: boolean } {
    const prev = this.data.stages[String(id)];
    const bestScore = Math.max(prev?.bestScore ?? 0, score);
    const bestStars = Math.max(prev?.stars ?? 0, stars);
    const newBest = !prev || score > prev.bestScore;
    this.data = {
      unlocked: Math.min(this.total, Math.max(this.data.unlocked, id + 1)),
      stages: { ...this.data.stages, [String(id)]: { bestScore, stars: bestStars } },
    };
    this.save();
    return { newBest };
  }

  reset(): void {
    this.data = defaultProgress();
    if (this.persist && this.storage) {
      try {
        this.storage.removeItem(PROGRESS_KEY);
      } catch {
        // 무시
      }
    }
  }

  snapshot(): Progress {
    return JSON.parse(JSON.stringify(this.data)) as Progress;
  }
}

/** 테스트와 폴백용 메모리 저장소 */
export class MemoryStore implements KeyValueStore {
  private readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}
