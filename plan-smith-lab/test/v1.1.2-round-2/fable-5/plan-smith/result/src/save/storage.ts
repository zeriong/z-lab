// 진행도 저장 — localStorage, 백엔드 없음 (플랜 I-3, 가정 A3)

export interface SaveData {
  unlocked: number; // 해제된 최대 스테이지 id (1 이상)
  stars: Record<number, number>; // stageId -> 최고 별 수
  bestScore: Record<number, number>; // stageId -> 최고 점수
}

const KEY = 'angrybirds-web-save-v1';
const TOTAL_STAGES = 10;

function defaults(): SaveData {
  return { unlocked: 1, stars: {}, bestScore: {} };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      unlocked: typeof parsed.unlocked === 'number' ? Math.min(Math.max(parsed.unlocked, 1), TOTAL_STAGES) : 1,
      stars: parsed.stars ?? {},
      bestScore: parsed.bestScore ?? {},
    };
  } catch {
    return defaults();
  }
}

function persist(save: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // 저장 실패(사파리 프라이빗 모드 등) — 게임 진행은 막지 않는다
  }
}

export function recordClear(save: SaveData, stageId: number, stars: number, score: number): SaveData {
  const next: SaveData = {
    unlocked: Math.max(save.unlocked, Math.min(stageId + 1, TOTAL_STAGES)),
    stars: { ...save.stars, [stageId]: Math.max(save.stars[stageId] ?? 0, stars) },
    bestScore: { ...save.bestScore, [stageId]: Math.max(save.bestScore[stageId] ?? 0, score) },
  };
  persist(next);
  return next;
}
