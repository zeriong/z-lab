// 상태 머신 (플랜 S2): MAIN → STAGE_SELECT → PLAYING ⇄ PAUSED, PLAYING → CLEAR | FAIL
// 상태는 단일 판별 유니언, 전이는 아래 전용 함수로만 일어난다.

export type GameState =
  | { kind: 'MAIN' }
  | { kind: 'STAGE_SELECT' }
  | { kind: 'PLAYING'; stage: number }
  | { kind: 'PAUSED'; stage: number }
  | { kind: 'CLEAR'; stage: number; score: number; stars: number }
  | { kind: 'FAIL'; stage: number };

let state: GameState = { kind: 'MAIN' }; // 콜드 스타트: 부팅 직후 MAIN

let listener: ((s: GameState) => void) | null = null;

export function getState(): GameState {
  return state;
}

export function onStateChange(fn: (s: GameState) => void): void {
  listener = fn;
}

function set(next: GameState): void {
  state = next;
  if (listener) listener(state);
}

/** CLEAR/FAIL/PLAYING/PAUSED이면 해당 스테이지 번호, 아니면 null */
export function stageOf(s: GameState): number | null {
  return s.kind === 'MAIN' || s.kind === 'STAGE_SELECT' ? null : s.stage;
}

export const transitions = {
  toMain(): void {
    set({ kind: 'MAIN' });
  },
  toSelect(): void {
    set({ kind: 'STAGE_SELECT' });
  },
  toPlaying(stage: number): void {
    set({ kind: 'PLAYING', stage });
  },
  toPaused(): void {
    if (state.kind === 'PLAYING') set({ kind: 'PAUSED', stage: state.stage });
  },
  resume(): void {
    if (state.kind === 'PAUSED') set({ kind: 'PLAYING', stage: state.stage });
  },
  toClear(stage: number, score: number, stars: number): void {
    if (state.kind === 'PLAYING') set({ kind: 'CLEAR', stage, score, stars });
  },
  toFail(stage: number): void {
    if (state.kind === 'PLAYING') set({ kind: 'FAIL', stage });
  },
};
