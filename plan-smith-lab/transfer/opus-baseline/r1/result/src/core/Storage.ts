export interface LevelProgress {
  stars: number; // 0-3
  score: number;
  cleared: boolean;
}

export class Storage {
  private prefix = 'ab_';

  getLevelProgress(levelId: number): LevelProgress {
    const key = `${this.prefix}level_${levelId}`;
    const stored = localStorage.getItem(key);
    if (!stored) {
      return { stars: 0, score: 0, cleared: false };
    }
    return JSON.parse(stored);
  }

  saveLevelProgress(levelId: number, progress: LevelProgress) {
    const key = `${this.prefix}level_${levelId}`;
    localStorage.setItem(key, JSON.stringify(progress));
  }

  getUnlockedLevel(): number {
    const key = `${this.prefix}unlockedLevel`;
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored, 10) : 1;
  }

  setUnlockedLevel(levelId: number) {
    const key = `${this.prefix}unlockedLevel`;
    localStorage.setItem(key, levelId.toString());
  }

  getLastPlayedLevel(): number {
    const key = `${this.prefix}lastLevel`;
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored, 10) : 1;
  }

  setLastPlayedLevel(levelId: number) {
    const key = `${this.prefix}lastLevel`;
    localStorage.setItem(key, levelId.toString());
  }

  getSoundEnabled(): boolean {
    const key = `${this.prefix}soundEnabled`;
    const stored = localStorage.getItem(key);
    return stored ? stored === 'true' : true;
  }

  setSoundEnabled(enabled: boolean) {
    const key = `${this.prefix}soundEnabled`;
    localStorage.setItem(key, enabled.toString());
  }

  clearAllProgress() {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(this.prefix));
    keys.forEach((k) => localStorage.removeItem(k));
  }
}
