export interface LevelProgress {
  cleared: boolean;
  stars: number;
  highScore: number;
}

export class Storage {
  private static readonly PREFIX = 'angrybirds_';
  private static readonly LAST_LEVEL_KEY = 'lastLevel';
  private static readonly UNLOCKED_KEY = 'unlockedLevels';

  static getLevelProgress(levelId: number): LevelProgress {
    const key = `${Storage.PREFIX}level_${levelId}`;
    const data = localStorage.getItem(key);
    if (!data) {
      return { cleared: false, stars: 0, highScore: 0 };
    }
    return JSON.parse(data);
  }

  static saveLevelProgress(levelId: number, progress: LevelProgress): void {
    const key = `${Storage.PREFIX}level_${levelId}`;
    localStorage.setItem(key, JSON.stringify(progress));
  }

  static getLastLevel(): number {
    const data = localStorage.getItem(`${Storage.PREFIX}${Storage.LAST_LEVEL_KEY}`);
    return data ? parseInt(data, 10) : 1;
  }

  static setLastLevel(levelId: number): void {
    localStorage.setItem(`${Storage.PREFIX}${Storage.LAST_LEVEL_KEY}`, levelId.toString());
  }

  static getUnlockedLevels(): number {
    const data = localStorage.getItem(`${Storage.PREFIX}${Storage.UNLOCKED_KEY}`);
    return data ? parseInt(data, 10) : 1;
  }

  static setUnlockedLevels(count: number): void {
    localStorage.setItem(`${Storage.PREFIX}${Storage.UNLOCKED_KEY}`, count.toString());
  }

  static isLevelUnlocked(levelId: number): boolean {
    return levelId <= Storage.getUnlockedLevels();
  }

  static unlockNextLevel(): void {
    const current = Storage.getUnlockedLevels();
    if (current < 10) {
      Storage.setUnlockedLevels(current + 1);
    }
  }

  static clear(): void {
    for (let i = 1; i <= 10; i++) {
      localStorage.removeItem(`${Storage.PREFIX}level_${i}`);
    }
    localStorage.removeItem(`${Storage.PREFIX}${Storage.LAST_LEVEL_KEY}`);
    localStorage.removeItem(`${Storage.PREFIX}${Storage.UNLOCKED_KEY}`);
  }
}
