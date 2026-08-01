import { SCORE } from '../data/materials';

/** 점수/별 규칙 (플랜 §5). */
export const ScoreRule = {
  pig: SCORE.PIG,
  block: SCORE.BLOCK,
  birdLeft: SCORE.BIRD_LEFT,

  starsFor(score: number, thresholds: readonly [number, number, number]): number {
    if (score >= thresholds[2]) return 3;
    if (score >= thresholds[1]) return 2;
    if (score >= thresholds[0]) return 1;
    return 0;
  },

  starString(stars: number): string {
    return '★★★'.slice(0, stars) + '☆☆☆'.slice(0, 3 - stars);
  },
};
