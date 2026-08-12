/**
 * 점수·별 산정 (§7.5).
 *
 * 잔여 새 10,000은 파생값이다: 새 1마리의 가치가 돼지 1마리(5,000)보다 커야
 * "적은 새로 끝내기"가 우세 전략이 되고, 그때만 별 3개가 실력의 신호가 된다.
 * 이 부등식이 깨지면(예: 돼지 점수를 12,000으로 올리면) 별 등급의 의미도 같이 깨진다.
 */

export const SCORE = {
  pigSmall: 5000,
  pigBoss: 10000,
  block: 500, // 임의값 — 무너뜨리기 자체엔 최소 보상만. 수명: Step 10.
  tnt: 1000,
  birdLeft: 10000,
} as const;

/** 2별 계수. 초기값 0.75 (§7.5). 교체 트리거도 같은 절에 있다. */
export const STAR2_RATIO = 0.75;

export interface StageResult {
  stageId: number;
  /** 파괴로 쌓인 점수 */
  baseScore: number;
  birdsLeft: number;
  birdBonus: number;
  total: number;
  stars: 0 | 1 | 2 | 3;
  targetScore: number;
  cleared: boolean;
}

export function birdBonus(birdsLeft: number): number {
  return Math.max(0, birdsLeft) * SCORE.birdLeft;
}

/**
 * 별 산정. 1별 = 클리어, 2별 = target × 0.75, 3별 = target.
 * 클리어하지 못했으면 0별이고 점수는 저장하되 해금은 하지 않는다.
 */
export function starsFor(total: number, targetScore: number, cleared: boolean): 0 | 1 | 2 | 3 {
  if (!cleared) return 0;
  if (total >= targetScore) return 3;
  if (total >= targetScore * STAR2_RATIO) return 2;
  return 1;
}

export function settleResult(params: {
  stageId: number;
  baseScore: number;
  birdsLeft: number;
  targetScore: number;
  cleared: boolean;
}): StageResult {
  const bonus = params.cleared ? birdBonus(params.birdsLeft) : 0;
  const total = params.baseScore + bonus;
  return {
    stageId: params.stageId,
    baseScore: params.baseScore,
    birdsLeft: params.birdsLeft,
    birdBonus: bonus,
    total,
    stars: starsFor(total, params.targetScore, params.cleared),
    targetScore: params.targetScore,
    cleared: params.cleared,
  };
}
