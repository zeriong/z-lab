/**
 * §8 앱 상태 머신. 전이표(§8.2)를 데이터로 그대로 옮겼다.
 * 표에 없는 전이는 개발 모드에서 throw — "왜 화면이 안 바뀌지"를 침묵으로 만들지 않기 위해서다.
 */

export type AppState =
  | 'BOOT'
  | 'MAIN_MENU'
  | 'STAGE_SELECT'
  | 'LOADING'
  | 'PLAYING'
  | 'PAUSED'
  | 'CLEAR'
  | 'FAIL';

export type PlaySub = 'NONE' | 'AIMING' | 'DRAGGING' | 'FLYING' | 'SETTLING';

export type SmEvent =
  | 'assetsReady'
  | 'START'
  | 'SELECT'
  | 'BACK'
  | 'built'
  | 'pointerDownOnBird'
  | 'launch'
  | 'cancelDrag'
  | 'ability'
  | 'birdDone'
  | 'settledClear'
  | 'settledFail'
  | 'settledNext'
  | 'PAUSE'
  | 'RESUME'
  | 'RETRY'
  | 'TO_MAIN'
  | 'NEXT'
  | 'TO_SELECT';

export interface Snapshot {
  state: AppState;
  sub: PlaySub;
}

interface Row {
  from: AppState;
  /** PLAYING일 때만 의미가 있다. undefined면 서브상태 무관. */
  sub?: PlaySub[];
  event: SmEvent;
  to: AppState;
  toSub?: PlaySub;
}

const PLAY_SUBS: PlaySub[] = ['AIMING', 'DRAGGING', 'FLYING', 'SETTLING'];

/** §8.2 전이표 — 구현은 이 표 그대로. */
const TABLE: Row[] = [
  { from: 'BOOT', event: 'assetsReady', to: 'MAIN_MENU', toSub: 'NONE' },
  { from: 'MAIN_MENU', event: 'START', to: 'STAGE_SELECT', toSub: 'NONE' },
  { from: 'STAGE_SELECT', event: 'SELECT', to: 'LOADING', toSub: 'NONE' },
  // 표에는 없지만 스테이지 선택에서 되돌아갈 방법이 없으면 갇힌다(§9.2 "계속하기"와 같은 성격의 추가).
  { from: 'STAGE_SELECT', event: 'BACK', to: 'MAIN_MENU', toSub: 'NONE' },
  { from: 'LOADING', event: 'built', to: 'PLAYING', toSub: 'AIMING' },

  { from: 'PLAYING', sub: ['AIMING'], event: 'pointerDownOnBird', to: 'PLAYING', toSub: 'DRAGGING' },
  { from: 'PLAYING', sub: ['DRAGGING'], event: 'launch', to: 'PLAYING', toSub: 'FLYING' },
  { from: 'PLAYING', sub: ['DRAGGING'], event: 'cancelDrag', to: 'PLAYING', toSub: 'AIMING' },
  { from: 'PLAYING', sub: ['FLYING'], event: 'ability', to: 'PLAYING', toSub: 'FLYING' },
  { from: 'PLAYING', sub: ['FLYING'], event: 'birdDone', to: 'PLAYING', toSub: 'SETTLING' },
  { from: 'PLAYING', sub: ['SETTLING'], event: 'settledClear', to: 'CLEAR', toSub: 'NONE' },
  { from: 'PLAYING', sub: ['SETTLING'], event: 'settledFail', to: 'FAIL', toSub: 'NONE' },
  { from: 'PLAYING', sub: ['SETTLING'], event: 'settledNext', to: 'PLAYING', toSub: 'AIMING' },

  { from: 'PLAYING', sub: PLAY_SUBS, event: 'PAUSE', to: 'PAUSED', toSub: 'NONE' },

  { from: 'PAUSED', event: 'RETRY', to: 'LOADING', toSub: 'NONE' },
  { from: 'PAUSED', event: 'TO_MAIN', to: 'MAIN_MENU', toSub: 'NONE' },
  { from: 'CLEAR', event: 'RETRY', to: 'LOADING', toSub: 'NONE' },
  { from: 'CLEAR', event: 'TO_MAIN', to: 'MAIN_MENU', toSub: 'NONE' },
  { from: 'CLEAR', event: 'NEXT', to: 'LOADING', toSub: 'NONE' },
  { from: 'CLEAR', event: 'TO_SELECT', to: 'STAGE_SELECT', toSub: 'NONE' }, // 마지막 스테이지 클리어
  { from: 'FAIL', event: 'RETRY', to: 'LOADING', toSub: 'NONE' },
  { from: 'FAIL', event: 'TO_MAIN', to: 'MAIN_MENU', toSub: 'NONE' },
];

export type TransitionListener = (next: Snapshot, prev: Snapshot, event: SmEvent) => void;

export class StateMachine {
  private state: AppState = 'BOOT';
  private sub: PlaySub = 'NONE';
  private pausedFrom: Snapshot | null = null;
  private listeners: TransitionListener[] = [];

  get(): Snapshot {
    return { state: this.state, sub: this.sub };
  }

  is(state: AppState): boolean {
    return this.state === state;
  }

  isPlayingSub(sub: PlaySub): boolean {
    return this.state === 'PLAYING' && this.sub === sub;
  }

  /** §3 루프가 이 값으로 물리 진행 여부를 판단한다. PAUSED에서는 절대 true가 아니다. */
  isSimulating(): boolean {
    return this.state === 'PLAYING' && this.sub !== 'NONE';
  }

  onTransition(fn: TransitionListener): void {
    this.listeners.push(fn);
  }

  clearListeners(): void {
    this.listeners = [];
  }

  /** 전이 가능 여부만 검사(부수효과 없음). UI 활성화 판단용. */
  can(event: SmEvent): boolean {
    if (event === 'RESUME') return this.state === 'PAUSED' && this.pausedFrom !== null;
    return this.findRow(event) !== undefined;
  }

  dispatch(event: SmEvent): boolean {
    const prev: Snapshot = { state: this.state, sub: this.sub };

    // RESUME은 표가 아니라 pausedFrom으로 복귀한다(§8.2).
    if (event === 'RESUME') {
      if (this.state !== 'PAUSED' || !this.pausedFrom) {
        return this.reject(event);
      }
      this.state = this.pausedFrom.state;
      this.sub = this.pausedFrom.sub;
      this.pausedFrom = null;
      this.emit(prev, event);
      return true;
    }

    const row = this.findRow(event);
    if (!row) return this.reject(event);

    if (event === 'PAUSE') this.pausedFrom = prev;
    if (row.to !== 'PAUSED') this.pausedFrom = null;

    this.state = row.to;
    this.sub = row.toSub ?? 'NONE';
    this.emit(prev, event);
    return true;
  }

  /** 월드 파기 시 함께 초기화한다(§8.3). */
  reset(): void {
    this.state = 'BOOT';
    this.sub = 'NONE';
    this.pausedFrom = null;
  }

  private findRow(event: SmEvent): Row | undefined {
    return TABLE.find(
      (r) =>
        r.from === this.state &&
        r.event === event &&
        (r.sub === undefined || r.sub.includes(this.sub)),
    );
  }

  private reject(event: SmEvent): boolean {
    const msg = `[sm] 정의되지 않은 전이: ${this.state}/${this.sub} --${event}-->`;
    if (import.meta.env.DEV) throw new Error(msg);
    console.warn(msg);
    return false;
  }

  private emit(prev: Snapshot, event: SmEvent): void {
    const next: Snapshot = { state: this.state, sub: this.sub };
    for (const fn of this.listeners) fn(next, prev, event);
  }
}
