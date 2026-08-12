import Engine from 'matter-js/Build/Engine';
import { world } from './world';

export class PhysicsLoop {
  private isPaused = false;
  private accumulator = 0;
  private engine = world.engine;
  private readonly DT = 1000 / 60; // 16.67ms
  private readonly MAX_STEPS = 5;
  private rafId: number | null = null;

  start(): void {
    const tick = (now: number) => {
      this.tick();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  tick(deltaTime?: number): void {
    if (this.isPaused) return;

    const delta = deltaTime || 16.67;
    this.accumulator += delta;

    let steps = 0;
    while (this.accumulator >= this.DT && steps < this.MAX_STEPS) {
      Engine.update(this.engine, this.DT);
      this.accumulator -= this.DT;
      steps++;
    }
  }

  pause(): void {
    this.isPaused = true;
    this.accumulator = 0;
  }

  resume(): void {
    this.isPaused = false;
    this.accumulator = 0;
  }

  reset(): void {
    this.accumulator = 0;
    this.isPaused = false;
  }

  getEngine() {
    return this.engine;
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }
}
