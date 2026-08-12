import { StoredLevelProgress } from './types';

const STORAGE_KEY = 'angry_birds_progress';

export class Storage {
  private progress: Map<number, StoredLevelProgress> = new Map();

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        this.progress = new Map(Object.entries(parsed).map(([k, v]) => [
          parseInt(k),
          v as StoredLevelProgress,
        ]));
      }
    } catch (e) {
      console.error('Failed to load progress:', e);
    }
  }

  private save(): void {
    try {
      const data = Object.fromEntries(this.progress);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save progress:', e);
    }
  }

  getProgress(levelId: number): StoredLevelProgress {
    return (
      this.progress.get(levelId) || {
        cleared: false,
        stars: 0,
        highScore: 0,
      }
    );
  }

  setProgress(
    levelId: number,
    cleared: boolean,
    score: number,
    stars: number
  ): void {
    const current = this.getProgress(levelId);
    const newProgress: StoredLevelProgress = {
      cleared: cleared || current.cleared,
      stars: Math.max(stars, current.stars),
      highScore: Math.max(score, current.highScore),
    };
    this.progress.set(levelId, newProgress);
    this.save();
  }

  isLevelUnlocked(levelId: number): boolean {
    if (levelId === 1) return true;
    return this.getProgress(levelId - 1).cleared;
  }

  getAllProgress(): Map<number, StoredLevelProgress> {
    return new Map(this.progress);
  }

  clear(): void {
    this.progress.clear();
    localStorage.removeItem(STORAGE_KEY);
  }
}
