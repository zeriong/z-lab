// B7: 정착 판정 + 클리어/실패. 하중 경로 hop 5. "월드가 멈춘 뒤" 한 번만, 비행 중엔 절대 아님.
import { maxDynamicSpeed, type StageWorld } from './physics';
import { TUNING } from './types';

export type Verdict = 'CLEARED' | 'FAILED' | null;

export interface JudgeResult {
  /** 이 프레임에 정착이 확정됐는가(한 번만 true). */
  settled: boolean;
  verdict: Verdict;
}

export interface ScoreSummary {
  base: number;
  bonus: number;
  total: number;
  stars: number;
}

export class Judge {
  /** 마지막 발사(또는 스폰) 이후 정착 여부. 발사 시 false로 리셋. */
  settled = false;
  inFlight = false;
  lowFrames = 0;
  framesSinceLaunch = 0;

  reset(): void {
    this.settled = false;
    this.inFlight = false;
    this.lowFrames = 0;
    this.framesSinceLaunch = 0;
  }

  onLaunch(): void {
    this.inFlight = true;
    this.settled = false;
    this.lowFrames = 0;
    this.framesSinceLaunch = 0;
  }

  /** advanceBird 이후 호출: 다음 비행을 기다린다. */
  onAdvanced(): void {
    this.inFlight = false;
    this.settled = false;
    this.lowFrames = 0;
    this.framesSinceLaunch = 0;
  }

  /**
   * PLAYING 프레임마다 물리 스텝 뒤에 호출.
   * 정착 = 모든 동적 body 속도 < settleSpeed 가 settleFrames 연속 || 발사 후 settleTimeoutFrames 경과.
   */
  tick(world: StageWorld): JudgeResult {
    // 비행 중이 아니고 돼지가 남아 있으면 판정할 것이 없다(대기 상태).
    if (!this.inFlight && world.pigsRemaining > 0) {
      return { settled: false, verdict: null };
    }
    if (this.settled) return { settled: false, verdict: null };

    this.framesSinceLaunch += 1;
    const slow = maxDynamicSpeed(world.engine) < TUNING.settleSpeed;
    this.lowFrames = slow ? this.lowFrames + 1 : 0;

    const byRest = this.lowFrames >= TUNING.settleFrames;
    const byTimeout = this.framesSinceLaunch >= TUNING.settleTimeoutFrames;
    if (!byRest && !byTimeout) return { settled: false, verdict: null };

    this.settled = true;
    if (world.pigsRemaining === 0) return { settled: true, verdict: 'CLEARED' };
    const noBirdsLeft = world.queue.length === 0 && world.currentBird === null;
    if (noBirdsLeft) return { settled: true, verdict: 'FAILED' };
    return { settled: true, verdict: null };
  }
}

/** 클리어 점수 요약: 기본 점수 + 남은 새 × birdBonus, 별은 starThresholds 기준. */
export function summarizeScore(world: StageWorld): ScoreSummary {
  const bonus = Math.max(0, world.birdsRemaining) * TUNING.birdBonus;
  const total = world.score + bonus;
  return { base: world.score, bonus, total, stars: starsFor(total, world.def.starThresholds) };
}

export function starsFor(total: number, thresholds: readonly [number, number, number]): number {
  let stars = 0;
  for (const t of thresholds) if (total >= t) stars += 1;
  return stars;
}
