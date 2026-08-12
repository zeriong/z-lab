export class Score {
  private currentScore: number = 0;
  private blockScore: number = 0;
  private pigScore: number = 0;
  private birdBonusScore: number = 0;
  private starThresholds: [number, number, number];

  constructor(starThresholds: [number, number, number]) {
    this.starThresholds = starThresholds;
  }

  addBlockScore(amount: number) {
    this.blockScore += amount;
    this.currentScore = this.calculateTotal();
  }

  addPigScore(amount: number) {
    this.pigScore += amount;
    this.currentScore = this.calculateTotal();
  }

  addBirdBonusScore(amount: number) {
    this.birdBonusScore += amount;
    this.currentScore = this.calculateTotal();
  }

  private calculateTotal(): number {
    return this.blockScore + this.pigScore + this.birdBonusScore;
  }

  getScore(): number {
    return this.currentScore;
  }

  getStars(): number {
    if (this.currentScore >= this.starThresholds[2]) return 3;
    if (this.currentScore >= this.starThresholds[1]) return 2;
    if (this.currentScore >= this.starThresholds[0]) return 1;
    return 0;
  }

  getBreakdown(): {
    blocks: number;
    pigs: number;
    birds: number;
    total: number;
  } {
    return {
      blocks: this.blockScore,
      pigs: this.pigScore,
      birds: this.birdBonusScore,
      total: this.currentScore,
    };
  }
}
