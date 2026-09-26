/**
 * 클리어/실패 판정 (§6.6).
 * - 클리어: 살아있는 돼지 0 → clearDelay 틱 후 'clear'. 유예 동안 점수는 계속 집계.
 * - 실패: 남은 새 0 ∧ 현재 샷 정착 완료 ∧ 돼지 ≥ 1.
 * - 동시에 성립하면 클리어 우선 (돼지 0이면 실패를 절대 내지 않는다).
 */
import { CLEAR_DELAY_TICKS } from '../core/config';

export type Verdict = 'none' | 'clear' | 'failed';

export interface JudgeInput {
  pigsAlive: number;
  birdsRemaining: number;
  /** 현재 샷(마지막 샷 포함)이 정착을 끝냈는가 */
  shotSettled: boolean;
}

export class Judge {
  verdict: Verdict = 'none';
  /** 돼지 0 이후 경과 틱. -1 이면 미시작 */
  clearTimer = -1;

  constructor(private readonly clearDelay: number = CLEAR_DELAY_TICKS) {}

  reset(): void {
    this.verdict = 'none';
    this.clearTimer = -1;
  }

  get clearPending(): boolean {
    return this.verdict === 'none' && this.clearTimer >= 0;
  }

  /** 매 틱 호출. 확정된 판정은 바뀌지 않는다. */
  update(input: JudgeInput): Verdict {
    if (this.verdict !== 'none') return this.verdict;

    if (input.pigsAlive <= 0) {
      this.clearTimer = this.clearTimer < 0 ? 1 : this.clearTimer + 1;
      if (this.clearTimer >= this.clearDelay) this.verdict = 'clear';
      return this.verdict;
    }

    this.clearTimer = -1;
    if (input.birdsRemaining <= 0 && input.shotSettled) {
      this.verdict = 'failed';
    }
    return this.verdict;
  }
}
