// 진행 저장 (M4) — localStorage. 해제 상태·스테이지별 최고 별·최고 점수.

import { STAGES } from './stages';

const KEY = 'web-angry-birds-save-v1';

export interface SaveData {
  /** 해제된 최고 스테이지 번호. 새 프로필은 1 (§12 완료 정의 2) */
  unlocked: number;
  /** 스테이지별 최고 별 (1~3) */
  stars: Record<number, number>;
  /** 스테이지별 최고 점수 */
  best: Record<number, number>;
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as Partial<SaveData>;
      if (d && typeof d.unlocked === 'number') {
        return { unlocked: d.unlocked, stars: d.stars ?? {}, best: d.best ?? {} };
      }
    }
  } catch {
    // 손상된 저장은 새 프로필로 취급
  }
  return { unlocked: 1, stars: {}, best: {} };
}

/** 클리어 기록: n 클리어 → n+1 해제(상한 10), 별·점수는 최고값 유지 */
export function recordClear(stage: number, stars: number, score: number): void {
  const d = loadSave();
  d.unlocked = Math.min(Math.max(d.unlocked, stage + 1), STAGES.length);
  d.stars[stage] = Math.max(d.stars[stage] ?? 0, stars);
  d.best[stage] = Math.max(d.best[stage] ?? 0, score);
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    // 저장 실패(프라이빗 모드 등)는 무시 — 세션 내 진행은 유지된다
  }
}
