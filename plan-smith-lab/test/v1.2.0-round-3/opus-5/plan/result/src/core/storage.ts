/**
 * §10.5 진행도 저장. 파싱 실패/버전 불일치는 초기값으로 리셋(에러 삼키되 콘솔 경고).
 * 저장 실패(사파리 프라이빗 모드 등)에도 게임은 계속 되어야 한다 — 그래서 모든 접근이 try/catch다.
 */

const KEY = 'ab.progress.v1';
const VERSION = 1;

export type StarCount = 0 | 1 | 2 | 3;

export interface Progress {
  version: number;
  /** 해금된 스테이지 수. unlocked=1이면 1번만 플레이 가능 */
  unlocked: number;
  stars: Record<number, StarCount>;
  best: Record<number, number>;
}

export function defaultProgress(): Progress {
  return { version: VERSION, unlocked: 1, stars: {}, best: {} };
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as Partial<Progress> | null;
    if (!parsed || parsed.version !== VERSION) {
      console.warn('[storage] 진행도 버전 불일치 — 초기화한다');
      return defaultProgress();
    }
    return {
      version: VERSION,
      unlocked: typeof parsed.unlocked === 'number' ? Math.max(1, parsed.unlocked) : 1,
      stars: parsed.stars ?? {},
      best: parsed.best ?? {},
    };
  } catch (err) {
    console.warn('[storage] 진행도 파싱 실패 — 초기화한다', err);
    return defaultProgress();
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch (err) {
    console.warn('[storage] 진행도 저장 실패(게임은 계속 진행된다)', err);
  }
}

/** 클리어 기록. stars/best는 더 높을 때만 갱신한다(§10.5). */
export function recordClear(
  p: Progress,
  stageId: number,
  stars: StarCount,
  score: number,
  stageCount: number,
): Progress {
  const next: Progress = {
    version: VERSION,
    unlocked: Math.max(p.unlocked, Math.min(stageCount, stageId + 1)),
    stars: { ...p.stars },
    best: { ...p.best },
  };
  const prevStars = next.stars[stageId] ?? 0;
  if (stars > prevStars) next.stars[stageId] = stars;
  const prevBest = next.best[stageId] ?? 0;
  if (score > prevBest) next.best[stageId] = score;
  saveProgress(next);
  return next;
}

export function isUnlocked(p: Progress, stageId: number): boolean {
  return stageId <= p.unlocked;
}
