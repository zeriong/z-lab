interface StageProgress {
  unlocked: boolean;
  bestScore: number;
  stars: number;
}

export class ProgressStorage {
  private progress: Map<number, StageProgress>;
  private storageKey = 'angrybirds_progress';

  constructor() {
    this.progress = new Map();
    this.loadProgress();
    if (this.progress.size === 0) {
      this.initializeProgress();
    }
  }

  private initializeProgress(): void {
    for (let i = 1; i <= 10; i++) {
      this.progress.set(i, {
        unlocked: i === 1,
        bestScore: 0,
        stars: 0
      });
    }
    this.saveToStorage();
  }

  private loadProgress(): void {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        for (const [key, value] of Object.entries(parsed)) {
          const stageNum = parseInt(key);
          this.progress.set(stageNum, value as StageProgress);
        }
      }
    } catch {
      // localStorage not available or parsing failed
    }
  }

  private saveToStorage(): void {
    try {
      const data: Record<number, StageProgress> = {};
      for (const [key, value] of this.progress.entries()) {
        data[key] = value;
      }
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch {
      // localStorage not available
    }
  }

  saveProgress(stage: number, score: number, stars: number): void {
    const current = this.progress.get(stage) || { unlocked: true, bestScore: 0, stars: 0 };
    current.bestScore = Math.max(current.bestScore, score);
    current.stars = Math.max(current.stars, stars);
    current.unlocked = true;

    this.progress.set(stage, current);

    // Unlock next stage
    if (stage < 10) {
      const next = this.progress.get(stage + 1) || { unlocked: false, bestScore: 0, stars: 0 };
      next.unlocked = true;
      this.progress.set(stage + 1, next);
    }

    this.saveToStorage();
  }

  isStageUnlocked(stage: number): boolean {
    return this.progress.get(stage)?.unlocked ?? false;
  }

  getStars(stage: number): number {
    return this.progress.get(stage)?.stars ?? 0;
  }

  getTotalStars(): number {
    let total = 0;
    for (let i = 1; i <= 10; i++) {
      total += this.getStars(i);
    }
    return total;
  }
}
