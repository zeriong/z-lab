import { LoadedStage } from '../stages/loadStage';

export type OutcomeEvent = { type: 'cleared' } | { type: 'failed' } | { type: 'none' };

/**
 * 스텝 6 — 클리어/실패 판정.
 * 로드베어링 hop5: pigs 배열 길이 체크가 매 충돌 이후 실행된다(App.ts의 충돌 콜백에서 호출).
 */
export function evaluateOutcome(loaded: LoadedStage): OutcomeEvent {
  if (loaded.pigs.length === 0) {
    return { type: 'cleared' };
  }
  if (loaded.projectilesRemaining <= 0) {
    return { type: 'failed' };
  }
  return { type: 'none' };
}

export function consumeProjectile(loaded: LoadedStage): void {
  loaded.projectilesRemaining = Math.max(0, loaded.projectilesRemaining - 1);
}
