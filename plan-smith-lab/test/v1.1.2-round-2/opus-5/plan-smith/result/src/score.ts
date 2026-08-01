/** 점수·별 (R4). 규칙은 플랜 §8: star1=클리어, star2=par×0.70, star3=par×0.90 */

import type { ScoreParts } from './types';
import { SCORE_BIRD_LEFT, SCORE_BLOCK, SCORE_PIG, STAR2_RATIO, STAR3_RATIO } from './tuning';

export function pigScore(parts: ScoreParts): number {
  return parts.pigs * SCORE_PIG;
}

export function blockScore(parts: ScoreParts): number {
  return parts.blocks * SCORE_BLOCK;
}

export function birdScore(parts: ScoreParts): number {
  return parts.birdsLeft * SCORE_BIRD_LEFT;
}

/** 인게임 진행 점수(잔여 새 보너스는 클리어 시점에만 더한다) */
export function runningScore(parts: ScoreParts): number {
  return pigScore(parts) + blockScore(parts);
}

export function totalScore(parts: ScoreParts): number {
  return pigScore(parts) + blockScore(parts) + birdScore(parts);
}

export function starThresholds(par: number): { star2: number; star3: number } {
  return { star2: Math.round(par * STAR2_RATIO), star3: Math.round(par * STAR3_RATIO) };
}

/** 클리어했을 때의 별. 클리어 자체가 별 1개. */
export function starsFor(score: number, par: number): number {
  const { star2, star3 } = starThresholds(par);
  if (score >= star3) return 3;
  if (score >= star2) return 2;
  return 1;
}
