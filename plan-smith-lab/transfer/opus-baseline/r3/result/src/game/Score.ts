export class Score {
  private score: number = 0;
  private blockPoints: number = 0;
  private pigPoints: number = 0;
  private birdBonusPoints: number = 0;

  addBlockScore(points: number): void {
    this.blockPoints += points;
    this.score += points;
  }

  addPigScore(): void {
    const points = 5000;
    this.pigPoints += points;
    this.score += points;
  }

  addBirdBonus(count: number): void {
    const bonus = count * 10000;
    this.birdBonusPoints += bonus;
    this.score += bonus;
  }

  getTotal(): number {
    return this.score;
  }

  getBlockPoints(): number {
    return this.blockPoints;
  }

  getPigPoints(): number {
    return this.pigPoints;
  }

  getBirdBonusPoints(): number {
    return this.birdBonusPoints;
  }

  getStars(thresholds: [number, number, number]): number {
    if (this.score >= thresholds[2]) return 3;
    if (this.score >= thresholds[1]) return 2;
    if (this.score >= thresholds[0]) return 1;
    return 0;
  }
}
