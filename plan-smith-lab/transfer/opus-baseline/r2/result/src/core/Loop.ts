export type LoopCallback = (dt: number, alpha: number) => void;

export class GameLoop {
  private running = false;
  private lastTime = 0;
  private accumulator = 0;
  private readonly fixedDt = 1000 / 60; // 16.67ms
  private frameTimeClamp = 100; // ms

  private onFixedUpdate: LoopCallback | null = null;
  private onRender: LoopCallback | null = null;

  private fpsCounter = 0;
  private fpsTime = 0;

  start(
    onFixedUpdate: LoopCallback,
    onRender: LoopCallback
  ): void {
    this.onFixedUpdate = onFixedUpdate;
    this.onRender = onRender;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.loop(this.lastTime);
  }

  stop(): void {
    this.running = false;
  }

  isPaused(): boolean {
    return !this.running;
  }

  private loop = (currentTime: number): void => {
    if (!this.running) return;

    let frameTime = currentTime - this.lastTime;
    frameTime = Math.min(frameTime, this.frameTimeClamp);
    this.lastTime = currentTime;

    this.accumulator += frameTime;

    while (this.accumulator >= this.fixedDt) {
      if (this.onFixedUpdate) {
        this.onFixedUpdate(this.fixedDt / 1000, 1);
      }
      this.accumulator -= this.fixedDt;
    }

    const alpha = this.accumulator / this.fixedDt;
    if (this.onRender) {
      this.onRender(frameTime / 1000, alpha);
    }

    // FPS tracking
    this.fpsCounter++;
    this.fpsTime += frameTime;
    if (this.fpsTime >= 1000) {
      window.FPS = this.fpsCounter;
      this.fpsCounter = 0;
      this.fpsTime = 0;
    }

    requestAnimationFrame(this.loop);
  };

  resetAccumulator(): void {
    this.accumulator = 0;
    this.lastTime = performance.now();
  }
}

declare global {
  var FPS: number;
}
