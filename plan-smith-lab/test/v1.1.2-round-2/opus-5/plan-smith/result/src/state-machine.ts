/**
 * 상태 머신 (§1-B R6): 전이를 한 곳에 선언하고, 선언되지 않은 전이는 통과하지 못한다.
 * BOOT → MAIN → SELECT → PLAYING ⇄ PAUSED → CLEAR/FAIL
 */

import type { StateName } from './types';

const TRANSITIONS: Record<StateName, readonly StateName[]> = {
  BOOT: ['MAIN'],
  MAIN: ['SELECT', 'PLAYING'],
  SELECT: ['MAIN', 'PLAYING'],
  PLAYING: ['PAUSED', 'CLEAR', 'FAIL', 'MAIN'],
  PAUSED: ['PLAYING', 'SELECT', 'MAIN'],
  CLEAR: ['PLAYING', 'SELECT', 'MAIN'],
  FAIL: ['PLAYING', 'SELECT', 'MAIN'],
};

export type TransitionListener = (to: StateName, from: StateName) => void;

export class StateMachine {
  private state: StateName = 'BOOT';
  private listeners: TransitionListener[] = [];

  get current(): StateName {
    return this.state;
  }

  can(to: StateName): boolean {
    return TRANSITIONS[this.state].includes(to);
  }

  onChange(fn: TransitionListener): void {
    this.listeners.push(fn);
  }

  /** 선언되지 않은 전이는 실행하지 않고 false를 돌려준다(조용한 상태 누수 금지 → 콘솔 경고). */
  to(next: StateName): boolean {
    if (next === this.state) return false;
    if (!this.can(next)) {
      console.warn(`[state] 선언되지 않은 전이 차단: ${this.state} → ${next}`);
      return false;
    }
    const from = this.state;
    this.state = next;
    for (const fn of this.listeners) fn(next, from);
    return true;
  }
}
