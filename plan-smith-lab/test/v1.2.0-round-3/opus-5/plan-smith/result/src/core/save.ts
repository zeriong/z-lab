// B20 — 진행도 저장(해금·최고점·별·음소거)
//
// localStorage 단일 키. 파싱 실패·쿼터 초과는 기본 세이브로 조용히 복구한다.
// 해금 여부는 스테이지 파일의 필드가 아니라 파생 술어 isUnlocked() 로 계산한다.

import type { StageDef } from '../stages/schema';

const KEY = 'ab.save.v1';

export interface SaveData {
  cleared: number[];
  best: Record<number, number>;
  stars: Record<number, number>;
  muted: boolean;
}

export function defaultSave(): SaveData {
  return { cleared: [], best: {}, stars: {}, muted: false };
}

function sanitize(raw: unknown): SaveData {
  const base = defaultSave();
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Partial<SaveData>;
  if (Array.isArray(o.cleared)) {
    base.cleared = o.cleared.filter((n) => Number.isInteger(n) && n >= 1 && n <= 10);
  }
  if (o.best && typeof o.best === 'object') {
    for (const [k, v] of Object.entries(o.best)) {
      const id = Number(k);
      if (Number.isInteger(id) && typeof v === 'number' && v >= 0) base.best[id] = v;
    }
  }
  if (o.stars && typeof o.stars === 'object') {
    for (const [k, v] of Object.entries(o.stars)) {
      const id = Number(k);
      if (Number.isInteger(id) && typeof v === 'number' && v >= 0 && v <= 3) base.stars[id] = v;
    }
  }
  base.muted = o.muted === true;
  return base;
}

export const SaveStore = {
  load(): SaveData {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultSave();
      return sanitize(JSON.parse(raw));
    } catch {
      return defaultSave();
    }
  },

  write(data: SaveData): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // 쿼터 초과·프라이빗 모드 — 저장 실패는 게임 진행을 막지 않는다.
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // 무시
    }
  },
};

/** 파생 술어 — 스테이지 1은 항상 열려 있고, 그 외는 직전 스테이지 클리어가 조건. */
export function isUnlocked(def: StageDef, save: SaveData): boolean {
  return def.id === 1 || save.cleared.includes(def.id - 1);
}

/** 클리어 결과를 세이브에 반영한다(해금·최고점·별). */
export function recordClear(save: SaveData, stageId: number, score: number, stars: number): SaveData {
  if (!save.cleared.includes(stageId)) save.cleared.push(stageId);
  save.cleared.sort((a, b) => a - b);
  save.best[stageId] = Math.max(save.best[stageId] ?? 0, score);
  save.stars[stageId] = Math.max(save.stars[stageId] ?? 0, stars);
  SaveStore.write(save);
  return save;
}
