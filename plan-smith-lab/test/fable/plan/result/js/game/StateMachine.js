// 단일 enum + 전이 함수. 전이표에 없는 전이는 방어적 no-op.

export const States = Object.freeze({
  MAIN_MENU: 'MainMenu',
  PLAYING: 'Playing',
  PAUSED: 'Paused',
  STAGE_CLEAR: 'StageClear',
  STAGE_FAILED: 'StageFailed',
});

const ALLOWED = {
  [States.MAIN_MENU]: [States.PLAYING],
  [States.PLAYING]: [States.PAUSED, States.STAGE_CLEAR, States.STAGE_FAILED],
  [States.PAUSED]: [States.PLAYING, States.MAIN_MENU],
  [States.STAGE_CLEAR]: [States.PLAYING, States.MAIN_MENU],
  [States.STAGE_FAILED]: [States.PLAYING, States.MAIN_MENU],
};

export class StateMachine {
  constructor(initial = States.MAIN_MENU) {
    this.state = initial;
    this.listeners = [];
  }

  is(state) {
    return this.state === state;
  }

  onChange(fn) {
    this.listeners.push(fn);
  }

  /** 허용된 전이면 상태를 바꾸고 true, 아니면 무시하고 false. */
  transition(to) {
    const allowed = ALLOWED[this.state];
    if (!allowed || !allowed.includes(to)) return false;
    const from = this.state;
    this.state = to;
    for (const fn of this.listeners) fn(to, from);
    return true;
  }
}
