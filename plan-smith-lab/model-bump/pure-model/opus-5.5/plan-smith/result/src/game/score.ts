// 점수·별 (§4.6)
import { SCORE_BIRD_LEFT, SCORE_BLOCK, SCORE_PIG, STAR2_RATIO, STAR3_RATIO } from '../config';
import type { StageData, StarThresholds } from '../types';

export function blocksScore(stage: StageData): number {
  return stage.blocks.reduce((sum, b) => sum + SCORE_BLOCK[b.material], 0);
}

export function pigsScore(stage: StageData): number {
  return stage.pigs.length * SCORE_PIG;
}

/** maxScore = Σ블록 + Σ돼지 + (새 수 − 1) × 10000 */
export function maxScore(stage: StageData): number {
  return blocksScore(stage) + pigsScore(stage) + Math.max(0, stage.birds.length - 1) * SCORE_BIRD_LEFT;
}

export function defaultStars(stage: StageData): StarThresholds {
  const max = maxScore(stage);
  return { two: Math.round(STAR2_RATIO * max), three: Math.round(STAR3_RATIO * max) };
}

export function starThresholds(stage: StageData): StarThresholds {
  return stage.stars ?? defaultStars(stage);
}

/** 클리어 = 1★, 기준 이상이면 2★/3★. 클리어하지 못했으면 0 */
export function starsFor(stage: StageData, score: number, cleared: boolean): number {
  if (!cleared) return 0;
  const t = starThresholds(stage);
  if (score >= t.three) return 3;
  if (score >= t.two) return 2;
  return 1;
}

/**
 * 여유가 0인 스테이지는 (새 수 − 1) × 10000 보너스를 절대 받을 수 없어
 * 기본 0.45 비율이 풀이로 도달 불가능해진다. 그런 스테이지용 덮어쓰기:
 * 2★ = min(기본값, 돼지 전부 + 여유 보너스) — "새를 낭비하지 않고 클리어"
 * 3★ = max(기본값, 2★ + 1)이되 maxScore 이하
 */
export function fairStars(stage: Omit<StageData, 'stars'>): StarThresholds {
  const s = stage as StageData;
  const max = maxScore(s);
  const def = defaultStars(s);
  const guaranteed = pigsScore(s) + stage.slack * SCORE_BIRD_LEFT;
  const two = Math.min(def.two, guaranteed);
  const three = Math.min(max, Math.max(def.three, two + 1));
  return { two, three };
}
