import { MAX_FRAME_MS, STEP_MS } from './constants';

/**
 * requestAnimationFrame driver with a fixed-timestep accumulator (plan §2.2).
 *
 *   frameTime = min(now - last, 100ms)
 *   while (acc >= STEP_MS) { fixedUpdate(STEP_MS); acc -= STEP_MS }
 *   render(acc / STEP_MS)
 *
 * While paused the accumulator is frozen and fixedUpdate is never called, so
 * the simulation is *actually* stopped (requirement R3), not just hidden.
 * Render still runs so the frozen frame survives a window resize.
 */
export class Loop {
  fps = 0;

  private acc = 0;
  private last = 0;
  private rafId = 0;
  private running = false;
  private paused = false;
  private fpsWindowMs = 0;
  private fpsFrames = 0;

  /** Steps executed in the most recent frame — surfaced in the debug overlay. */
  lastStepCount = 0;

  constructor(
    private readonly fixedUpdate: (dtMs: number) => void,
    private readonly render: (alpha: number) => void,
  ) {}

  get isPaused(): boolean {
    return this.paused;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.acc = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    if (!paused) {
      // Resume without dumping the paused wall-clock time into the simulation.
      this.last = performance.now();
      this.acc = 0;
    }
  }

  private tick = (now: number): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.tick);

    const frameTime = Math.min(now - this.last, MAX_FRAME_MS);
    this.last = now;

    this.fpsWindowMs += frameTime;
    this.fpsFrames += 1;
    if (this.fpsWindowMs >= 400) {
      this.fps = Math.round((this.fpsFrames * 1000) / this.fpsWindowMs);
      this.fpsWindowMs = 0;
      this.fpsFrames = 0;
    }

    let steps = 0;
    if (!this.paused) {
      this.acc += frameTime;
      while (this.acc >= STEP_MS && steps < 6) {
        this.fixedUpdate(STEP_MS);
        this.acc -= STEP_MS;
        steps += 1;
      }
      // Hard cap reached: drop the backlog instead of chasing it forever.
      if (steps === 6) this.acc = 0;
    }
    this.lastStepCount = steps;

    this.render(this.paused ? 1 : this.acc / STEP_MS);
  };
}
