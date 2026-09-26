import { MATERIAL_SPECS, SCORE, TNT } from '../../config/catalog';
import type { Material } from '../../config/catalog';

/** 점수와 별 (§5.7, §6.6). 순수 함수. */

export function pigScore(): number {
  return SCORE.pig;
}

export function blockScore(material: Material): number {
  return MATERIAL_SPECS[material].score;
}

export function tntScore(): number {
  return TNT.score;
}

export function birdsLeftBonus(birdsLeft: number): number {
  return Math.max(0, birdsLeft) * SCORE.birdLeft;
}

/**
 * 클리어하면 1★, stars[0] 이상이면 2★, stars[1] 이상이면 3★. 실패하면 0.
 * 임계값과 정확히 같은 점수는 그 별을 받는다.
 */
export function starsFor(score: number, thresholds: readonly [number, number], cleared: boolean): 0 | 1 | 2 | 3 {
  if (!cleared) return 0;
  if (score >= thresholds[1]) return 3;
  if (score >= thresholds[0]) return 2;
  return 1;
}

/** §6.6 별 기준: 3★ = 기준 해법 점수의 95%를 1,000 단위로 내림, 2★ = 3★의 75%(1,000 단위 내림) */
export function starThresholdsFromReference(referenceScore: number): [number, number] {
  const three = Math.floor((referenceScore * 0.95) / 1000) * 1000;
  const two = Math.floor((three * 0.75) / 1000) * 1000;
  return [two, three];
}
