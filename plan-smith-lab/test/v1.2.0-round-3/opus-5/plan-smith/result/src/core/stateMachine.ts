// B24 — 상태 머신 & 입력 가드
//
// 허용된 전이만 통과시키고, PLAYING 진입/이탈에서 inputEnabled 를 켜고 끈다.
// 오버레이가 떠 있는 동안(PAUSED·CLEAR·FAIL) 뒤쪽 월드는 입력을 받지 않는다.

export type GameState =
  | 'BOOT'
  | 'MENU'
  | 'STAGE_SELECT'
  | 'PLAYING'
  | 'PAUSED'
  | 'CLEAR'
  | 'FAIL';

const ALLOWED: Record<GameState, GameState[]> = {
  BOOT: ['MENU'],
  MENU: ['STAGE_SELECT'],
  STAGE_SELECT: ['PLAYING', 'MENU'],
  PLAYING: ['PAUSED', 'CLEAR', 'FAIL', 'MENU'],
  PAUSED: ['PLAYING', 'MENU'],
  CLEAR: ['PLAYING', 'MENU', 'STAGE_SELECT'],
  FAIL: ['PLAYING', 'MENU', 'STAGE_SELECT'],
};

export class StateMachine {
  private current: GameState = 'BOOT';
  private inputOn = false;
  private listeners: ((next: GameState, prev: GameState) => void)[] = [];

  get state(): GameState {
    return this.current;
  }

  /** 월드가 입력을 받아도 되는가. 오버레이 상태에서는 항상 false. */
  get inputEnabled(): boolean {
    return this.inputOn;
  }

  /** 오버레이가 떠 있는 상태인가(뒤쪽 캔버스 히트 테스트 차단 대상). */
  get overlayActive(): boolean {
    return this.current === 'PAUSED' || this.current === 'CLEAR' || this.current === 'FAIL';
  }

  onChange(fn: (next: GameState, prev: GameState) => void): void {
    this.listeners.push(fn);
  }

  canTransition(next: GameState): boolean {
    return ALLOWED[this.current].includes(next);
  }

  transition(next: GameState): void {
    if (!this.canTransition(next)) {
      throw new Error(`허용되지 않은 상태 전이: ${this.current} -> ${next}`);
    }
    const prev = this.current;
    this.current = next;

    // 진입/이탈 액션 — 입력 가드는 여기 한 곳에서만 바뀐다.
    this.inputOn = next === 'PLAYING';

    for (const fn of this.listeners) fn(next, prev);
  }

  /** 테스트·재시작용 강제 리셋(전이 표를 우회한다는 사실을 이름으로 드러낸다). */
  forceReset(): void {
    this.current = 'BOOT';
    this.inputOn = false;
  }
}
