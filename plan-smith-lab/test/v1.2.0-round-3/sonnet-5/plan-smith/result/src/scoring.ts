import type { Material, StageConfig } from "./types";

/**
 * 재질별 breakThreshold 비율 — derived: 앵그리버드류 장르 관습의 재질 강도
 * 서열(얼음이 가장 약함, 돌이 가장 강함)에서 도출된 비율(얼음:나무:돌 = 1:2:4).
 */
export const MATERIAL_RATIO: Record<Material, number> = {
  ice: 1,
  wood: 2,
  stone: 4
};

/**
 * declared arbitrary, lifetime cap: Step 8 플레이테스트에서 실측 교체.
 * 재질 비율(derived)에 곱해지는 기준값 자체는 첫 추정치.
 */
export const BASE_BREAK_THRESHOLD = 6;

export function breakThresholdFor(material: Material): number {
  return BASE_BREAK_THRESHOLD * MATERIAL_RATIO[material];
}

/**
 * 충격량이 파괴/제거 임계값을 넘는지 판정하는 단일 진입점 — GameScene의
 * tryBreakBlock/tryKillPig와 tests/collision.test.ts가 같은 함수를 공유한다.
 */
export function exceedsThreshold(impulse: number, threshold: number): boolean {
  return impulse >= threshold;
}

/**
 * 점수 모델 상수 — declared arbitrary, lifetime cap: Step 8 플레이테스트에서 조정.
 * parScore 자체는 이 상수들로부터 derived(아래 calcParScore 참조).
 */
export const BLOCK_DESTROY_POINTS = 100;
export const PIG_REMOVE_POINTS = 500;
export const REMAINING_BIRD_BONUS = 200;

/**
 * parScore — derived: "로드아웃 새 수 − 1마리"로 클리어했을 때 도달 가능한 점수.
 * 모든 블록·모든 pig를 제거하고, birdLoadout - 1마리를 사용했다고 가정하면
 * 남는 새는 항상 1마리이므로 remaining bonus는 1회만 더해진다.
 */
export function calcParScore(stage: StageConfig): number {
  const blockPoints = stage.blocks.length * BLOCK_DESTROY_POINTS;
  const pigPoints = stage.pigs.length * PIG_REMOVE_POINTS;
  const remainingBirdsAssumed = 1;
  return blockPoints + pigPoints + remainingBirdsAssumed * REMAINING_BIRD_BONUS;
}

/**
 * 별점 산정 — derived from parScore.
 * 3성: score >= parScore, 2성: score >= parScore*0.66, 1성: 클리어(score>0)했지만 그 미만.
 */
export function starsForScore(score: number, parScore: number, cleared: boolean): number {
  if (!cleared) return 0;
  if (score >= parScore) return 3;
  if (score >= parScore * 0.66) return 2;
  return 1;
}
