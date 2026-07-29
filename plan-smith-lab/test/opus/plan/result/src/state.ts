import type { GameStateName } from './types';

/** 허용된 전이만 통과시킨다 (플랜 §3). */
const TRANSITIONS: Record<GameStateName, GameStateName[]> = {
  MENU: ['PLAYING'],
  PLAYING: ['PAUSED', 'CLEAR', 'FAIL', 'MENU'],
  PAUSED: ['PLAYING', 'MENU'],
  CLEAR: ['PLAYING', 'MENU'],
  FAIL: ['PLAYING', 'MENU'],
};

type Listener = (next: GameStateName, prev: GameStateName) => void;

export class StateMachine {
  private state: GameStateName = 'MENU';
  private listeners: Listener[] = [];

  get current(): GameStateName {
    return this.state;
  }

  is(...names: GameStateName[]): boolean {
    return names.includes(this.state);
  }

  can(next: GameStateName): boolean {
    return TRANSITIONS[this.state].includes(next);
  }

  /** 전이 성공 시 true. 잘못된 전이는 조용히 무시(경고만). */
  set(next: GameStateName): boolean {
    if (next === this.state) return false;
    if (!this.can(next)) {
      console.warn(`[state] 무효한 전이: ${this.state} → ${next}`);
      return false;
    }
    const prev = this.state;
    this.state = next;
    for (const fn of this.listeners) fn(next, prev);
    return true;
  }

  onChange(fn: Listener): void {
    this.listeners.push(fn);
  }
}

/** 상태별 책임 분리 — 물리를 돌리는가 / 입력을 받는가 */
export const updatesPhysics = (s: GameStateName): boolean => s === 'PLAYING';
export const acceptsAimInput = (s: GameStateName): boolean => s === 'PLAYING';
export const drawsWorld = (s: GameStateName): boolean =>
  s === 'PLAYING' || s === 'PAUSED' || s === 'CLEAR' || s === 'FAIL';
