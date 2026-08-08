// B25 — 고정 타임스텝 루프
//
// 프레임 간격이 흔들려도 물리 결과가 흔들리지 않도록 누적기(accumulator)로
// 1/120초 고정 스텝을 프레임당 최대 4회까지 진행시킨다.
// 물리 라이브러리가 제공하는 자체 러너는 쓰지 않는다 — 스텝 통제권을 잃으면
// 결정성 검증(가정 A1)이 불가능해지기 때문이다.

import { FIXED_STEP_SEC, MAX_STEPS_PER_FRAME } from '../physics/units';

export interface LoopCallbacks {
  /** 고정 스텝 1회. 물리·턴 판정이 여기서만 진행된다. */
  fixedStep: (dt: number) => void;
  /** 프레임당 1회. 렌더·연출 갱신(프레임 가변 시간). */
  frame: (dtSec: number, alpha: number) => void;
}

export class Loop {
  private rafId: number | null = null;
  private accumulator = 0;
  private lastMs = 0;
  private readonly cb: LoopCallbacks;

  constructor(cb: LoopCallbacks) {
    this.cb = cb;
  }

  get running(): boolean {
    return this.rafId !== null;
  }

  start(): void {
    if (this.rafId !== null) return;
    this.accumulator = 0;
    this.lastMs = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (this.rafId === null) return;
    cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  private tick = (nowMs: number): void => {
    this.rafId = requestAnimationFrame(this.tick);

    let elapsed = (nowMs - this.lastMs) / 1000;
    this.lastMs = nowMs;

    // 탭 비활성 등으로 튄 프레임은 잘라낸다(최대 스텝 수만큼만 인정).
    const maxElapsed = FIXED_STEP_SEC * MAX_STEPS_PER_FRAME;
    if (elapsed > maxElapsed) elapsed = maxElapsed;
    if (elapsed < 0) elapsed = 0;

    this.accumulator += elapsed;

    let steps = 0;
    while (this.accumulator >= FIXED_STEP_SEC && steps < MAX_STEPS_PER_FRAME) {
      this.cb.fixedStep(FIXED_STEP_SEC);
      this.accumulator -= FIXED_STEP_SEC;
      steps++;
    }
    if (steps >= MAX_STEPS_PER_FRAME) {
      // 남은 누적은 버린다 — 밀린 시간을 갚으려 하면 저사양에서 더 밀린다.
      this.accumulator = 0;
    }

    const alpha = this.accumulator / FIXED_STEP_SEC;
    this.cb.frame(elapsed, alpha);
  };
}
