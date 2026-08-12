export class ScoreCalculator {
  private score = 0;
  private initialBirds: number;
  private birdsUsed = 0;
  private targetScore: number;
  private blockDestroyedCount = 0;

  constructor(initialBirds: number, targetScore: number) {
    this.initialBirds = initialBirds;
    this.targetScore = targetScore;
  }

  addBlockPoints(): void {
    this.score += 500; // Block destroy points
    this.blockDestroyedCount++;
  }

  addPigPoints(isBoss: boolean = false): void {
    this.score += isBoss ? 10000 : 5000;
  }

  addTNTPoints(): void {
    this.score += 1000;
  }

  recordBirdUsed(): void {
    this.birdsUsed++;
  }

  finalizeScore(): void {
    const birdsRemaining = Math.max(0, this.initialBirds - this.birdsUsed);
    this.score += birdsRemaining * 10000;
  }

  getScore(): number {
    return this.score;
  }

  getStars(): number {
    const finalScore = this.score;
    if (finalScore >= this.targetScore) {
      return 3;
    } else if (finalScore >= this.targetScore * 0.75) {
      return 2;
    } else if (finalScore > 0) {
      return 1;
    }
    return 0;
  }

  reset(): void {
    this.score = 0;
    this.birdsUsed = 0;
    this.blockDestroyedCount = 0;
  }
}
