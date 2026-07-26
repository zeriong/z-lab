// 로컬스토리지 기반 진행도 저장 (서버 저장 없음, 범위 밖)
const KEY = "sling-birds:progress:v1";

export interface Progress {
  unlockedStage: number; // 이 번호까지 플레이 가능 (1부터 시작)
  bestScores: Record<number, number>;
}

function defaultProgress(): Progress {
  return { unlockedStage: 1, bestScores: {} };
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw);
    return { unlockedStage: parsed.unlockedStage ?? 1, bestScores: parsed.bestScores ?? {} };
  } catch {
    return defaultProgress();
  }
}

export function markStageCleared(stageId: number, score: number): void {
  const p = loadProgress();
  p.unlockedStage = Math.max(p.unlockedStage, stageId + 1);
  p.bestScores[stageId] = Math.max(p.bestScores[stageId] ?? 0, score);
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: silently ignore */
  }
}
