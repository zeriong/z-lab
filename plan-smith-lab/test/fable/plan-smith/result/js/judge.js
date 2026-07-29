// 판정 규칙(A4): 돼지 전멸 → settle 대기 → 클리어.
// 발사체 소진 + 돼지 잔존 → settle 대기 → 실패.
// settle 미도달 시 JUDGE_TIMEOUT_MS 후 강제 판정 — 영원한 대기 상태 금지.

import { JUDGE_TIMEOUT_MS } from './constants.js';
import { isSettled } from './physics.js';

export class Judge {
  constructor() {
    this.awaitElapsed = 0;
    this.result = null;   // null | 'CLEAR' | 'FAIL'
    this.timedOut = false;
  }

  // 매 물리 틱 호출. pigs: 잔존 돼지 수, birdsExhausted: 대기·장전·비행 새 전부 없음.
  tick(ph, dtMs, pigs, birdsExhausted) {
    if (this.result) return this.result;

    const pending = pigs === 0 || birdsExhausted;
    if (!pending) {
      this.awaitElapsed = 0;
      ph.settleTicks = 0;
      return null;
    }

    this.awaitElapsed += dtMs;
    const settled = isSettled(ph);
    const timeout = this.awaitElapsed >= JUDGE_TIMEOUT_MS;

    if (settled || timeout) {
      this.timedOut = timeout && !settled;
      // 판정 시점의 돼지 수로 결정 — 지연 붕괴로 대기 중 돼지가 죽어도 반영된다.
      this.result = pigs === 0 ? 'CLEAR' : 'FAIL';
    }
    return this.result;
  }
}
