import { BIRD_BONUS } from '../core/constants';

/** Score bookkeeping (plan §6.5). Kept separate so the breakdown is showable. */
export class Score {
  blockScore = 0;
  pigScore = 0;
  birdBonus = 0;

  reset(): void {
    this.blockScore = 0;
    this.pigScore = 0;
    this.birdBonus = 0;
  }

  addBlock(points: number): void {
    this.blockScore += points;
  }

  addPig(points: number): void {
    this.pigScore += points;
  }

  /** Called once on clear: every bird still in the queue is worth BIRD_BONUS. */
  awardRemainingBirds(count: number): number {
    this.birdBonus = Math.max(0, count) * BIRD_BONUS;
    return this.birdBonus;
  }

  get total(): number {
    return this.blockScore + this.pigScore + this.birdBonus;
  }
}

export function starsFor(total: number, thresholds: readonly number[]): number {
  let stars = 0;
  for (let i = 0; i < thresholds.length; i += 1) {
    if (total >= thresholds[i]) stars = i + 1;
  }
  return Math.min(3, stars);
}
