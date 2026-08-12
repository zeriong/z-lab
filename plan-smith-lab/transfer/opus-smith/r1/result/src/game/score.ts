export class ScoreManager {
  private score = 0
  private brokkenBlockCount = 0
  private pigsKilled = 0
  private bossKilled = 0
  private remainingBirds = 0

  reset(birdsCount: number) {
    this.score = 0
    this.brokkenBlockCount = 0
    this.pigsKilled = 0
    this.bossKilled = 0
    this.remainingBirds = birdsCount
  }

  addBlockBreak() {
    this.brokkenBlockCount++
    this.score += 500 // Initial value
  }

  addPigKill() {
    this.pigsKilled++
    this.score += 5000
  }

  addBossKill() {
    this.bossKilled++
    this.score += 10000
  }

  addTNTExplosion() {
    this.score += 1000
  }

  useBird() {
    if (this.remainingBirds > 0) {
      this.remainingBirds--
      this.score += this.remainingBirds > 0 ? 10000 : 0
    }
  }

  getScore(): number {
    return this.score
  }

  getRemainingBirds(): number {
    return this.remainingBirds
  }

  getStars(targetScore: number): number {
    // 0.75 is initial value
    const star1Threshold = 0
    const star2Threshold = targetScore * 0.75
    const star3Threshold = targetScore

    if (this.score >= star3Threshold) return 3
    if (this.score >= star2Threshold) return 2
    if (this.score >= star1Threshold) return 1
    return 0
  }

  getCurrentScore(): number {
    let total = 0
    total += this.brokkenBlockCount * 500
    total += this.pigsKilled * 5000
    total += this.bossKilled * 10000
    total += this.remainingBirds > 0 ? this.remainingBirds * 10000 : 0
    return total
  }
}
