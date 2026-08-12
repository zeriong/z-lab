export class Loop {
  private lastTime: number = 0;
  private accumulator: number = 0;
  private frameTime: number = 0;
  private frameRate: number = 60;
  private fixedDt: number = 1 / 60; // 16.666ms
  private isRunning: boolean = false;
  private rafId: number = 0;

  constructor(private onFixedUpdate: () => void, private onRender: (alpha: number) => void) {}

  start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.step(performance.now());
  }

  stop() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private step = (now: number) => {
    if (!this.isRunning) return;

    // Calculate frame time, clamp to prevent death spiral on tab switch
    this.frameTime = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.accumulator += this.frameTime;

    // Fixed timestep loop
    while (this.accumulator >= this.fixedDt) {
      this.onFixedUpdate();
      this.accumulator -= this.fixedDt;
    }

    // Render with interpolation alpha
    const alpha = this.accumulator / this.fixedDt;
    this.onRender(alpha);

    this.rafId = requestAnimationFrame(this.step);
  };

  pause() {
    this.accumulator = 0;
    this.lastTime = performance.now();
  }

  getFrameRate(): number {
    return this.frameRate;
  }
}
