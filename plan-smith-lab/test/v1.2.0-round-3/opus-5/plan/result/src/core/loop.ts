/**
 * §3 고정 타임스텝 루프.
 * 물리를 가변 dt로 돌리면 프레임 드랍 시 궤적이 달라져 레벨 밸런싱이 무의미해진다.
 */

export const FIXED_DT = 1000 / 60; // 16.6667ms
export const MAX_STEPS_PER_FRAME = 5; // 스파이럴 오브 데스 방지
const MAX_ELAPSED = 250; // 탭 복귀 시 점프 컷

export interface LoopCallbacks {
  /** true일 때만 fixedUpdate를 호출한다. PAUSED면 false. */
  shouldStep(): boolean;
  fixedUpdate(dt: number): void;
  /** alpha = acc / FIXED_DT (보간 계수) */
  render(alpha: number): void;
}

export interface LoopHandle {
  stop(): void;
  /** 탭 복귀 등으로 누적 부채를 버릴 때 */
  resetClock(): void;
}

export function startLoop(cb: LoopCallbacks): LoopHandle {
  let acc = 0;
  let last = performance.now();
  let rafId = 0;
  let running = true;

  function frame(now: number): void {
    if (!running) return;
    rafId = requestAnimationFrame(frame);

    let elapsed = now - last;
    last = now;
    if (elapsed > MAX_ELAPSED) elapsed = MAX_ELAPSED;
    acc += elapsed;

    let steps = 0;
    while (acc >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
      if (cb.shouldStep()) cb.fixedUpdate(FIXED_DT);
      acc -= FIXED_DT;
      steps++;
    }
    if (steps === MAX_STEPS_PER_FRAME) acc = 0; // 부채 탕감

    cb.render(acc / FIXED_DT);
  }

  rafId = requestAnimationFrame(frame);

  return {
    stop(): void {
      running = false;
      cancelAnimationFrame(rafId);
    },
    resetClock(): void {
      last = performance.now();
      acc = 0;
    },
  };
}
