import { DT, MAX_FRAME_DELTA, MAX_STEPS } from '../config/constants';

/**
 * rAF + 고정 스텝 누산기 (ADR-4, §3.4). App이 하나만 소유하고 화면이 바뀌어도 유지한다.
 * - 프레임 델타는 MAX_FRAME_DELTA로 클램프, 한 프레임의 스텝은 MAX_STEPS회로 제한한다.
 * - resetClock()은 재개 시 멈춰 있던 동안의 델타가 한꺼번에 들어오지 않게 한다.
 */
export interface LoopHooks {
  /** 이번 프레임에 물리 스텝을 돌려도 되는가 (PLAYING일 때만 true) */
  shouldStep(): boolean;
  step(dt: number): void;
  /** 렌더링. realDt는 시각 전용 이펙트에 쓴다 */
  frame(realDt: number, stepsThisFrame: number, stepMs: number): void;
}

export class FixedStepLoop {
  private rafId: number | null = null;
  private lastTime: number | null = null;
  private acc = 0;

  constructor(private readonly hooks: LoopHooks) {}

  start(): void {
    if (this.rafId !== null) return;
    this.lastTime = null;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  resetClock(): void {
    this.lastTime = null;
    this.acc = 0;
  }

  private readonly tick = (now: number): void => {
    this.rafId = requestAnimationFrame(this.tick);
    const dt = this.lastTime === null ? 0 : Math.min(Math.max((now - this.lastTime) / 1000, 0), MAX_FRAME_DELTA);
    this.lastTime = now;

    let steps = 0;
    let stepMs = 0;
    if (this.hooks.shouldStep()) {
      this.acc += dt;
      const t0 = performance.now();
      while (this.acc >= DT && steps < MAX_STEPS && this.hooks.shouldStep()) {
        this.hooks.step(DT);
        this.acc -= DT;
        steps++;
      }
      stepMs = performance.now() - t0;
      // 과부하 악순환 방지: 제한에 걸리면 밀린 시간을 버린다.
      if (steps >= MAX_STEPS) this.acc = 0;
    } else {
      this.acc = 0;
    }
    this.hooks.frame(dt, steps, stepMs);
  };
}
