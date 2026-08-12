import Engine from 'matter-js/Build/Engine';
import Matter from 'matter-js';

const DT = 1000 / 60; // 16.667ms
const MAX_STEPS = 5;

export class PhysicsLoop {
  private accumulator: number = 0;
  private isPaused: boolean = false;
  private lastTime: number = Date.now();

  pause(): void {
    this.isPaused = true;
    this.accumulator = 0;
  }

  resume(): void {
    this.isPaused = false;
    this.accumulator = 0;
    this.lastTime = Date.now();
  }

  tick(engine: Matter.Engine): void {
    if (this.isPaused) {
      return;
    }

    const now = Date.now();
    const elapsed = now - this.lastTime;
    this.lastTime = now;

    this.accumulator += elapsed;

    let steps = 0;
    while (this.accumulator >= DT && steps < MAX_STEPS) {
      Engine.update(engine, DT);
      this.accumulator -= DT;
      steps++;
    }

    // Discard remaining time
    if (steps === MAX_STEPS) {
      this.accumulator = 0;
    }
  }

  isPausedState(): boolean {
    return this.isPaused;
  }

  getAccumulator(): number {
    return this.accumulator;
  }
}
