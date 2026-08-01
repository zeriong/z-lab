import type { GameStateName } from '../types';

/**
 * Mirrors the plan's §상태 머신 transition table exactly. Notably:
 *  - PAUSED has no "resume" transition back into PLAYING other than via a
 *    full stage restart ("다시하기") — the requirement text only names
 *    다시하기/메인으로, so there is no "이어서 재개" button/transition here
 *    by design (plan: n/a, not in the original requirement).
 *  - STAGE_SELECT -> MAIN is added beyond the plan's literal table so the
 *    stage-select screen is not a dead end (implementer filler, not a
 *    contradiction of any stated constraint).
 */
const TRANSITIONS: Record<GameStateName, GameStateName[]> = {
  MAIN: ['STAGE_SELECT'],
  STAGE_SELECT: ['PLAYING', 'MAIN'],
  PLAYING: ['PAUSED', 'CLEARED', 'FAILED'],
  PAUSED: ['PLAYING', 'MAIN'],
  CLEARED: ['STAGE_SELECT', 'PLAYING'],
  FAILED: ['PLAYING', 'MAIN'],
};

export class StateMachine {
  current: GameStateName = 'MAIN';

  transition(to: GameStateName): boolean {
    if (!TRANSITIONS[this.current].includes(to)) {
      console.warn(`invalid state transition: ${this.current} -> ${to}`);
      return false;
    }
    this.current = to;
    return true;
  }
}
