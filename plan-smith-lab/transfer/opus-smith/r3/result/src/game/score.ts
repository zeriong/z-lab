export interface ScoreBreakdown {
  pigsKilled: number;
  blocksDestroyed: number;
  tntExploded: number;
  remainingBirds: number;
  total: number;
}

const PIG_SCORE = 5000;
const BOSS_SCORE = 10000;
const BLOCK_SCORE = 500;
const TNT_SCORE = 1000;
const REMAINING_BIRD_SCORE = 10000;

export class ScoreManager {
  private currentScore: number = 0;
  private breakdown: ScoreBreakdown = {
    pigsKilled: 0,
    blocksDestroyed: 0,
    tntExploded: 0,
    remainingBirds: 0,
    total: 0,
  };

  addPigScore(isBoss: boolean = false): void {
    const points = isBoss ? BOSS_SCORE : PIG_SCORE;
    this.currentScore += points;
    this.breakdown.pigsKilled += points;
    this.breakdown.total = this.currentScore;
  }

  addBlockScore(count: number = 1): void {
    const points = BLOCK_SCORE * count;
    this.currentScore += points;
    this.breakdown.blocksDestroyed += points;
    this.breakdown.total = this.currentScore;
  }

  addTNTScore(): void {
    this.currentScore += TNT_SCORE;
    this.breakdown.tntExploded += TNT_SCORE;
    this.breakdown.total = this.currentScore;
  }

  addRemainingBirdBonus(count: number): void {
    const points = REMAINING_BIRD_SCORE * count;
    this.currentScore += points;
    this.breakdown.remainingBirds += points;
    this.breakdown.total = this.currentScore;
  }

  getCurrentScore(): number {
    return this.currentScore;
  }

  getStars(targetScore: number): number {
    // 1 star = clear, 2 stars = 75% of target, 3 stars = 100% of target
    if (this.currentScore < targetScore * 0.75) {
      return 1;
    } else if (this.currentScore < targetScore) {
      return 2;
    }
    return 3;
  }

  reset(): void {
    this.currentScore = 0;
    this.breakdown = {
      pigsKilled: 0,
      blocksDestroyed: 0,
      tntExploded: 0,
      remainingBirds: 0,
      total: 0,
    };
  }

  getBreakdown(): ScoreBreakdown {
    return { ...this.breakdown };
  }
}
