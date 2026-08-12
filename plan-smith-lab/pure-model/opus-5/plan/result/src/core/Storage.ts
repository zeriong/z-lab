import { STORAGE_KEY } from './constants';

export interface LevelProgress {
  cleared: boolean;
  stars: number;
  best: number;
}

interface SaveFile {
  version: 1;
  sound: boolean;
  levels: Record<string, LevelProgress>;
}

const EMPTY: LevelProgress = { cleared: false, stars: 0, best: 0 };

function defaultSave(): SaveFile {
  return { version: 1, sound: true, levels: {} };
}

/**
 * localStorage progress (plan §6.5). Every access is guarded: private mode in
 * Safari throws on setItem, and a corrupted payload must not brick the game.
 */
export class Storage {
  private data: SaveFile = defaultSave();
  private unlockAllOverride = false;
  private available = true;

  constructor(private readonly levelCount: number) {
    this.load();
    try {
      const params = new URLSearchParams(window.location.search);
      this.unlockAllOverride = params.get('unlockAll') === '1';
    } catch {
      this.unlockAllOverride = false;
    }
  }

  private load(): void {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<SaveFile>;
      if (!parsed || typeof parsed !== 'object' || !parsed.levels) return;
      this.data = {
        version: 1,
        sound: parsed.sound !== false,
        levels: {},
      };
      for (const [key, value] of Object.entries(parsed.levels)) {
        if (!value) continue;
        this.data.levels[key] = {
          cleared: Boolean(value.cleared),
          stars: Math.max(0, Math.min(3, Number(value.stars) || 0)),
          best: Math.max(0, Number(value.best) || 0),
        };
      }
    } catch {
      this.data = defaultSave();
    }
  }

  private persist(): void {
    if (!this.available) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      this.available = false; // private mode / quota — keep playing in memory
    }
  }

  get soundEnabled(): boolean {
    return this.data.sound;
  }

  setSoundEnabled(enabled: boolean): void {
    this.data.sound = enabled;
    this.persist();
  }

  progressOf(levelId: number): LevelProgress {
    return this.data.levels[String(levelId)] ?? EMPTY;
  }

  isUnlocked(levelId: number): boolean {
    if (this.unlockAllOverride) return true;
    if (levelId <= 1) return true;
    return this.progressOf(levelId - 1).cleared;
  }

  /** Highest unlocked level — "게임 시작" jumps here. */
  resumeLevelId(): number {
    let id = 1;
    for (let i = 1; i <= this.levelCount; i += 1) {
      if (this.isUnlocked(i)) id = i;
    }
    return id;
  }

  totalStars(): number {
    let sum = 0;
    for (let i = 1; i <= this.levelCount; i += 1) sum += this.progressOf(i).stars;
    return sum;
  }

  recordClear(levelId: number, score: number, stars: number): void {
    const key = String(levelId);
    const prev = this.progressOf(levelId);
    this.data.levels[key] = {
      cleared: true,
      stars: Math.max(prev.stars, stars),
      best: Math.max(prev.best, score),
    };
    this.persist();
  }
}
