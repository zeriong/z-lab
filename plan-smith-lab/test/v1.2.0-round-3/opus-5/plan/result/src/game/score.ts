/**
 * §7 / §10.1 점수 · 별.
 * 남은 새 1마리 = 10000점 보너스. 별 임계는 스테이지 데이터의 starThresholds.
 */

import type { StarCount } from '../core/storage';

export const REMAINING_BIRD_BONUS = 10000;

export function clearBonus(birdsRemaining: number): number {
  return birdsRemaining * REMAINING_BIRD_BONUS;
}

/**
 * 클리어한 경우의 별 계산.
 * 임계와 "정확히 같으면" 해당 별을 준다(경계값 규칙).
 * 클리어 자체는 최소 1별 — 임계 미만이어도 0별로 만들지 않는다.
 */
export function starsFor(score: number, thresholds: readonly [number, number, number]): StarCount {
  const [t1, t2, t3] = thresholds;
  if (score >= t3) return 3;
  if (score >= t2) return 2;
  if (score >= t1) return 1;
  return 1;
}

export function formatScore(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}
