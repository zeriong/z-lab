const STORAGE_KEY = 'angry-slingshot:unlockedStage';

/**
 * 스텝 8 — 진행도 저장(localStorage).
 * unlockedStage는 "해금된 최고 스테이지 인덱스"(0-based, 0=스테이지1만 해금)를 뜻한다.
 * 콜드스타트 테이블: 초기값 0, cleared 이벤트 핸들러(App.ts)가 갱신한다.
 */
export function getUnlockedStage(): number {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return 0;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function unlockStage(stageIndex: number): void {
  const current = getUnlockedStage();
  if (stageIndex > current) {
    localStorage.setItem(STORAGE_KEY, String(stageIndex));
  }
}

export function isStageUnlocked(stageIndex: number): boolean {
  return stageIndex <= getUnlockedStage();
}

export function resetProgress(): void {
  localStorage.removeItem(STORAGE_KEY);
}
