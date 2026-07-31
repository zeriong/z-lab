// 상태 머신: 메인 → 인게임 ⇄ 일시정지 → 클리어/실패.
// 루프가 물리 틱을 소유하고, PLAYING 이외 상태에서는 엔진 업데이트가 0회다(A3).

export const States = {
  MAIN: 'MAIN',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  CLEAR: 'CLEAR',
  FAIL: 'FAIL',
};

const TRANSITIONS = {
  MAIN:    ['PLAYING'],
  PLAYING: ['PAUSED', 'CLEAR', 'FAIL', 'MAIN'],
  PAUSED:  ['PLAYING', 'MAIN'],
  CLEAR:   ['PLAYING', 'MAIN'],
  FAIL:    ['PLAYING', 'MAIN'],
};

class StateMachine {
  constructor() {
    this.state = States.MAIN;
    this.listeners = [];
  }

  can(to) {
    return TRANSITIONS[this.state].includes(to);
  }

  transition(to) {
    if (!this.can(to)) {
      console.warn(`[fsm] invalid transition: ${this.state} -> ${to}`);
      return false;
    }
    const from = this.state;
    this.state = to;
    for (const fn of this.listeners) fn(from, to);
    return true;
  }

  onChange(fn) {
    this.listeners.push(fn);
  }
}

export const fsm = new StateMachine();
