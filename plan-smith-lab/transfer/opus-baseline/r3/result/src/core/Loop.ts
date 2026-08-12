const FIXED_TIMESTEP = 1000 / 60; // 60 FPS

export class Loop {
  private accumulator: number = 0;
  private lastTime: number = 0;
  private isPaused: boolean = false;

  update(currentTime: number): number {
    if (this.lastTime === 0) {
      this.lastTime = currentTime;
      return 0;
    }

    let frameTime = currentTime - this.lastTime;
    frameTime = Math.min(frameTime, 100); // Clamp to prevent death spiral

    this.lastTime = currentTime;

    if (!this.isPaused) {
      this.accumulator += frameTime;
    }

    return this.accumulator;
  }

  tick(): { shouldTick: boolean; alpha: number } {
    if (this.accumulator >= FIXED_TIMESTEP) {
      this.accumulator -= FIXED_TIMESTEP;
      const alpha = this.accumulator / FIXED_TIMESTEP;
      return { shouldTick: true, alpha };
    }
    return { shouldTick: false, alpha: 0 };
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
    this.lastTime = performance.now();
    this.accumulator = 0;
  }

  reset(): void {
    this.accumulator = 0;
    this.lastTime = 0;
    this.isPaused = false;
  }

  getFixedDeltaTime(): number {
    return FIXED_TIMESTEP;
  }
}
