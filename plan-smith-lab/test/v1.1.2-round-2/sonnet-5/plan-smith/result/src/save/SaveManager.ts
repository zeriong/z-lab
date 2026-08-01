import { SAVE_KEY } from '../constants';

export interface StageProgress {
  cleared: boolean;
  stars: number;
  bestScore: number;
}

export interface SaveDataV1 {
  version: 1;
  stageProgress: Record<string, StageProgress>;
}

function empty(): SaveDataV1 {
  return { version: 1, stageProgress: {} };
}

export class SaveManager {
  static load(): SaveDataV1 {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return empty();
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1 || typeof parsed.stageProgress !== 'object') {
        return empty();
      }
      return parsed as SaveDataV1;
    } catch {
      // localStorage disabled/unavailable (e.g. private browsing) — fall back
      // to "no save data" instead of crashing, per plan risk mitigation.
      return empty();
    }
  }

  static save(data: SaveDataV1) {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // ignore write failures (private mode, storage full, disabled)
    }
  }

  static recordClear(stageId: string, stars: number, score: number): SaveDataV1 {
    const data = this.load();
    const prev = data.stageProgress[stageId];
    data.stageProgress[stageId] = {
      cleared: true,
      stars: Math.max(prev?.stars ?? 0, stars),
      bestScore: Math.max(prev?.bestScore ?? 0, score),
    };
    this.save(data);
    return data;
  }

  static isUnlocked(unlockCondition: string, data: SaveDataV1): boolean {
    if (unlockCondition === 'always') return true;
    const match = unlockCondition.match(/^(.+) cleared$/);
    if (!match) return false;
    const prereqId = match[1];
    return !!data.stageProgress[prereqId]?.cleared;
  }
}
