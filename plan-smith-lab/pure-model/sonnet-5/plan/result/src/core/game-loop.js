import { FIXED_DT_MS, MAX_FRAME_DELTA_MS } from '../config.js';

/**
 * 계획서 §1-3: 고정 타임스텝(accumulator 패턴) + requestAnimationFrame 렌더 루프.
 * isRunning()이 false를 반환하는 동안(PLAYING이 아닌 상태)에는 update()를 호출하지 않고
 * accumulator를 0으로 유지한다 — Matter world를 정지시키는 것이 아니라 애초에 업데이트를 호출하지
 * 않는 방식(§2). 이는 §5-3 자동 일시정지(visibilitychange)와도 연동된다.
 *
 * isRunning()은 while 루프 매 반복마다 다시 확인한다 — update() 내부에서 상태 전이가 일어나
 * (예: 클리어 판정) PLAYING을 벗어나는 경우, 같은 프레임에 누적된 나머지 스텝까지 실행되어
 * "PLAYING 진입 시에만 스텝이 진행된다"는 §2 규칙이 깨지는 것을 방지한다.
 *
 * @param {{
 *   update: (dtMs: number) => void,
 *   render: () => void,
 *   isRunning: () => boolean,
 * }} options
 */
export function createGameLoop({ update, render, isRunning }) {
  let accumulator = 0;
  let lastTime = null;
  let rafId = null;

  function frame(timestamp) {
    if (lastTime === null) lastTime = timestamp;
    let delta = timestamp - lastTime;
    lastTime = timestamp;
    if (delta > MAX_FRAME_DELTA_MS) delta = MAX_FRAME_DELTA_MS;

    if (isRunning()) {
      accumulator += delta;
      while (accumulator >= FIXED_DT_MS && isRunning()) {
        update(FIXED_DT_MS);
        accumulator -= FIXED_DT_MS;
      }
    }
    if (!isRunning()) {
      accumulator = 0;
    }

    render();
    rafId = requestAnimationFrame(frame);
  }

  function resetAccumulator() {
    accumulator = 0;
    lastTime = null;
  }

  function start() {
    resetAccumulator();
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // 탭이 백그라운드로 갈 때 accumulator를 초기화해 "따라잡기 폭주"를 방지한다(§1-3).
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) resetAccumulator();
  });

  return { start, stop, resetAccumulator };
}
