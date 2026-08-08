import type { ProgressState, StageProgress } from "./types";
import { STAGE_COUNT } from "./stageRegistry";

const STORAGE_KEY = "angrybirds:progress:v1";

let memoryOnlyFallback = false;

function defaultProgress(): ProgressState {
  const stages: Record<number, StageProgress> = {};
  for (let i = 1; i <= STAGE_COUNT; i++) {
    stages[i] = { unlocked: i === 1, bestScore: 0, stars: 0 };
  }
  return { unlockedCount: 1, stages, muted: false };
}

let cached: ProgressState | null = null;

export function isMemoryOnlyFallback(): boolean {
  return memoryOnlyFallback;
}

export function loadProgress(): ProgressState {
  if (cached) return cached;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cached = defaultProgress();
      return cached;
    }
    const parsed = JSON.parse(raw) as ProgressState;
    cached = parsed;
    return cached;
  } catch {
    memoryOnlyFallback = true;
    cached = defaultProgress();
    return cached;
  }
}

function persist(state: ProgressState): void {
  cached = state;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    memoryOnlyFallback = true;
    // 메모리 전용 폴백: cached는 이미 갱신되어 있으므로 이번 세션 내에서는 유지된다.
  }
}

export function recordStageResult(stageId: number, score: number, stars: number): void {
  const state = loadProgress();
  const current = state.stages[stageId] ?? { unlocked: true, bestScore: 0, stars: 0 };
  const updated: StageProgress = {
    unlocked: true,
    bestScore: Math.max(current.bestScore, score),
    stars: Math.max(current.stars, stars)
  };
  state.stages[stageId] = updated;

  const nextStageId = stageId + 1;
  if (nextStageId <= STAGE_COUNT) {
    const nextStage = state.stages[nextStageId] ?? { unlocked: false, bestScore: 0, stars: 0 };
    if (!nextStage.unlocked) {
      state.stages[nextStageId] = { ...nextStage, unlocked: true };
    }
    state.unlockedCount = Math.max(state.unlockedCount, nextStageId);
  } else {
    state.unlockedCount = Math.max(state.unlockedCount, STAGE_COUNT);
  }

  persist(state);
}

export function setMuted(muted: boolean): void {
  const state = loadProgress();
  state.muted = muted;
  persist(state);
}
