/**
 * 계획서 §2: 게임 전체 상태 머신. 상태 전이는 transition() 한 곳을 통해서만 일어난다
 * (산발적인 if 분기로 상태를 바꾸지 않는다 — 버그 재현성을 위해 전이 지점을 한 곳에 모은다).
 */
export const GameState = Object.freeze({
  MAIN_MENU: 'MAIN_MENU',
  STAGE_LOADING: 'STAGE_LOADING',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  STAGE_CLEAR: 'STAGE_CLEAR',
  STAGE_FAILED: 'STAGE_FAILED',
});

/**
 * @param {Partial<Record<keyof typeof GameState, { onEnter?: (payload:any)=>void, onExit?: (payload:any)=>void }>>} handlers
 */
export function createStateMachine(handlers) {
  let current = null;

  /**
   * @param {string} next
   * @param {any} [payload]
   */
  function transition(next, payload) {
    const prevHandlers = current ? handlers[current] : null;
    prevHandlers?.onExit?.(payload);
    current = next;
    handlers[current]?.onEnter?.(payload);
  }

  function getState() {
    return current;
  }

  return { transition, getState };
}
