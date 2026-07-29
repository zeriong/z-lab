import { STORAGE_KEY } from './constants';
import type { ProgressRecord } from './types';

const EMPTY: ProgressRecord = { cleared: [], best: {} };

function read(): ProgressRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { cleared: [], best: {} };
    const parsed = JSON.parse(raw) as Partial<ProgressRecord>;
    return {
      cleared: Array.isArray(parsed.cleared) ? parsed.cleared.filter((n) => typeof n === 'number') : [],
      best: parsed.best && typeof parsed.best === 'object' ? parsed.best : {},
    };
  } catch {
    // 사파리 프라이빗 모드 등 localStorage 접근 불가 환경
    return { cleared: [], best: {} };
  }
}

function write(record: ProgressRecord): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* 저장 실패는 게임 진행을 막지 않는다 */
  }
}

export const Progress = {
  load(): ProgressRecord {
    return read();
  },

  isCleared(stageId: number): boolean {
    return read().cleared.includes(stageId);
  },

  /** stage 1은 항상 열려 있고, 그 외에는 직전 스테이지 클리어 시 해금 */
  isUnlocked(stageId: number): boolean {
    if (stageId <= 1) return true;
    return read().cleared.includes(stageId - 1);
  },

  best(stageId: number): number {
    return read().best[String(stageId)] ?? 0;
  },

  saveClear(stageId: number, score: number): void {
    const record = read();
    if (!record.cleared.includes(stageId)) record.cleared.push(stageId);
    const key = String(stageId);
    if ((record.best[key] ?? 0) < score) record.best[key] = score;
    write(record);
  },

  reset(): void {
    write({ ...EMPTY, cleared: [], best: {} });
  },
};
