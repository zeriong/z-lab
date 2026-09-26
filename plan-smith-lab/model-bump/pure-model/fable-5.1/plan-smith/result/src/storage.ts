// D5: localStorage["ab.save.v1"] 영속성. 비활성(프라이빗 모드)이면 메모리 폴백, 실패는 조용히 무시.
import { STAGE_COUNT } from './types';

export const SAVE_KEY = 'ab.save.v1';

export interface SaveData {
  /** 해제된 최고 스테이지 id (1..10). */
  unlocked: number;
  /** 길이 10, 각 0..3 */
  stars: number[];
  muted: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function defaultSave(): SaveData {
  return { unlocked: 1, stars: Array.from({ length: STAGE_COUNT }, () => 0), muted: false };
}

export function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
  };
}

let memoryFallback: StorageLike | null = null;

/** localStorage가 쓰기 가능하면 그것을, 아니면 프로세스 수명의 메모리 저장소를 돌려준다. */
export function resolveStore(): StorageLike {
  try {
    const ls = (globalThis as { localStorage?: StorageLike }).localStorage;
    if (ls) {
      const probe = '__ab_probe__';
      ls.setItem(probe, '1');
      return ls;
    }
  } catch {
    // fallthrough
  }
  if (!memoryFallback) memoryFallback = createMemoryStorage();
  return memoryFallback;
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

/** 파싱 실패·스키마 불일치 시 기본값. 부분적으로 깨진 필드는 개별 복구. */
export function parseSave(raw: string | null): SaveData {
  const base = defaultSave();
  if (!raw) return base;
  try {
    const obj = JSON.parse(raw) as unknown;
    if (!obj || typeof obj !== 'object') return base;
    const o = obj as Record<string, unknown>;
    const stars = Array.isArray(o.stars)
      ? base.stars.map((_, i) => clampInt(o.stars && (o.stars as unknown[])[i], 0, 3, 0))
      : base.stars;
    return {
      unlocked: clampInt(o.unlocked, 1, STAGE_COUNT, 1),
      stars,
      muted: typeof o.muted === 'boolean' ? o.muted : false,
    };
  } catch {
    return base;
  }
}

export function loadSave(store: StorageLike = resolveStore()): SaveData {
  try {
    return parseSave(store.getItem(SAVE_KEY));
  } catch {
    return defaultSave();
  }
}

export function writeSave(data: SaveData, store: StorageLike = resolveStore()): boolean {
  try {
    store.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** A4: N단계 클리어 → N+1 해제, 별은 최고 기록 유지. 새 객체를 돌려준다. */
export function applyResult(save: SaveData, stageId: number, stars: number): SaveData {
  const idx = stageId - 1;
  const nextStars = save.stars.slice();
  nextStars[idx] = Math.max(nextStars[idx] ?? 0, clampInt(stars, 0, 3, 0));
  return {
    unlocked: Math.max(save.unlocked, Math.min(STAGE_COUNT, stageId + 1)),
    stars: nextStars,
    muted: save.muted,
  };
}

export function isUnlocked(save: SaveData, stageId: number): boolean {
  return stageId >= 1 && stageId <= save.unlocked;
}
