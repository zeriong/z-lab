// B15 — 점수 & 별 3단계
//
// 점수 구성: 파괴 점수 + 제거 점수 + 잔여 새 점수. 별은 스테이지 정의의 임계로 판정한다.

import type { StageDef } from '../stages/schema';

export const SCORE_PIG = 5000;
export const SCORE_BLOCK = 500;
export const SCORE_BIRD_LEFT = 10000;

export interface ScoreState {
  /** 블록 파괴 누적 */
  destruction: number;
  /** 돼지 제거 누적 */
  removal: number;
  /** 잔여 새 보너스(클리어 시에만 확정) */
  leftover: number;
  total: number;
}

export function createScoreState(): ScoreState {
  return { destruction: 0, removal: 0, leftover: 0, total: 0 };
}

function recompute(s: ScoreState): void {
  s.total = s.destruction + s.removal + s.leftover;
}

export function addBlockScore(s: ScoreState): void {
  s.destruction += SCORE_BLOCK;
  recompute(s);
}

export function addPigScore(s: ScoreState): void {
  s.removal += SCORE_PIG;
  recompute(s);
}

/** 클리어 시점에 잔여 새 보너스를 확정한다. */
export function finalizeScore(s: ScoreState, birdsRemaining: number): number {
  s.leftover = Math.max(0, birdsRemaining) * SCORE_BIRD_LEFT;
  recompute(s);
  return s.total;
}

export function starsFor(def: StageDef, total: number): number {
  if (total >= def.starScore.three) return 3;
  if (total >= def.starScore.two) return 2;
  return 1;
}
