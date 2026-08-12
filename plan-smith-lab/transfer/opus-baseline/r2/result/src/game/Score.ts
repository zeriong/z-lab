export class Score {
  private blockScore: number = 0;
  private pigScore: number = 0;
  private birdScore: number = 0;
  private total: number = 0;

  addBlockScore(score: number): void {
    this.blockScore += score;
    this.updateTotal();
  }

  addPigScore(score: number): void {
    this.pigScore += score;
    this.updateTotal();
  }

  addBirdScore(birdCount: number): void {
    this.birdScore = birdCount * 10000;
    this.updateTotal();
  }

  private updateTotal(): void {
    this.total = this.blockScore + this.pigScore + this.birdScore;
  }

  getTotal(): number {
    return this.total;
  }

  getBlockScore(): number {
    return this.blockScore;
  }

  getPigScore(): number {
    return this.pigScore;
  }

  getBirdScore(): number {
    return this.birdScore;
  }

  getStars(thresholds: number[]): number {
    let stars = 0;
    for (const threshold of thresholds) {
      if (this.total >= threshold) {
        stars++;
      }
    }
    return Math.min(stars, 3);
  }

  reset(): void {
    this.blockScore = 0;
    this.pigScore = 0;
    this.birdScore = 0;
    this.total = 0;
  }
}
