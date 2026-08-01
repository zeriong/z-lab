import { PIG_KILL_SCORE, BIRD_BONUS_SCORE } from '../constants';
import type { StageData } from '../types';

export class ScoreManager {
  static computeScore(pigsKilled: number, birdsRemaining: number): number {
    return pigsKilled * PIG_KILL_SCORE + birdsRemaining * BIRD_BONUS_SCORE;
  }

  static computeStars(score: number, stage: StageData): 0 | 1 | 2 | 3 {
    if (score >= stage.starCuts.three) return 3;
    if (score >= stage.starCuts.two) return 2;
    return 1;
  }
}
