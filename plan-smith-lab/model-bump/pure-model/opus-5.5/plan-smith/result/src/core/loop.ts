// 고정 스텝 누적기 (§4.2). 물리 스텝은 shouldStep()이 참일 때만, 렌더링은 항상.
import { MAX_FRAME_MS, MAX_STEPS_PER_FRAME, STEP_MS } from '../config';

export interface LoopHooks {
  shouldStep(): boolean;
  step(): void;
  render(): void;
}

export interface LoopScheduler {
  request(cb: (now: number) => void): number;
  cancel(id: number): void;
}

const browserScheduler: LoopScheduler = {
  request: (cb) => requestAnimationFrame(cb),
  cancel: (id) => cancelAnimationFrame(id),
};

export class GameLoop {
  private acc = 0;
  private last: number | null = null;
  private handle: number | null = null;
  running = false;

  constructor(
    private readonly hooks: LoopHooks,
    private readonly scheduler: LoopScheduler = browserScheduler,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = null;
    this.handle = this.scheduler.request(this.tick);
  }

  stop(): void {
    this.running = false;
    if (this.handle !== null) this.scheduler.cancel(this.handle);
    this.handle = null;
  }

  /** RESUME·RESTART 때 호출: 밀린 시간을 한꺼번에 처리하지 않는다 (R16) */
  resetAccumulator(): void {
    this.acc = 0;
  }

  /** 한 프레임 처리. 반환값 = 이번 프레임에 돈 스텝 수 */
  frame(now: number): number {
    const dt = this.last === null ? 0 : Math.min(Math.max(0, now - this.last), MAX_FRAME_MS);
    this.last = now;
    let steps = 0;
    if (this.hooks.shouldStep()) {
      this.acc += dt;
      while (this.acc >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
        if (!this.hooks.shouldStep()) break;
        this.hooks.step();
        this.acc -= STEP_MS;
        steps++;
      }
      if (steps >= MAX_STEPS_PER_FRAME && this.acc >= STEP_MS) this.acc = 0;
    } else {
      this.acc = 0;
    }
    this.hooks.render();
    return steps;
  }

  private readonly tick = (now: number): void => {
    if (!this.running) return;
    this.frame(now);
    this.handle = this.scheduler.request(this.tick);
  };
}
