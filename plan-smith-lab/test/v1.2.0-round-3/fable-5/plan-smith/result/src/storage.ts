// 진행 저장 (L24) — 읽기/쓰기를 이 모듈 1곳으로 격리, localStorage 불가 시 메모리 폴백.

export interface Progress {
  unlocked: number; // 해제된 최대 스테이지 (기본 1)
  stars: Record<number, number>; // 스테이지별 최고 별
}

const KEY = 'web-angry-birds-progress-v1';

let cache: Progress = { unlocked: 1, stars: {} };
let persistent = true;

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Progress;
      if (typeof p.unlocked === 'number' && p.stars && typeof p.stars === 'object') {
        cache = {
          unlocked: Math.min(Math.max(Math.floor(p.unlocked), 1), 10),
          stars: p.stars,
        };
      }
    }
    persistent = true;
  } catch {
    persistent = false; // 사생활 모드 등 — 세션 내 메모리로만 유지
  }
  return cache;
}

export function isPersistent(): boolean {
  return persistent;
}

export function getProgress(): Progress {
  return cache;
}

export function recordClear(stage: number, stars: number): Progress {
  cache = {
    unlocked: Math.max(cache.unlocked, Math.min(stage + 1, 10)),
    stars: { ...cache.stars, [stage]: Math.max(cache.stars[stage] ?? 0, stars) },
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    persistent = false;
  }
  return cache;
}
