import type Body from 'matter-js/Build/Body';

export class SettleDetector {
  private maxSpeedThreshold = 0.35;
  private maintainTime = 0.8; // seconds
  private timeBelowThreshold = 0;
  private launchTime: number | null = null;
  private readonly maxFlightTime = 6000; // milliseconds

  reset(): void {
    this.timeBelowThreshold = 0;
    this.launchTime = null;
  }

  recordLaunch(): void {
    this.launchTime = performance.now();
  }

  update(bodies: Body[], dt: number): boolean {
    const maxSpeed = this.getMaxSpeed(bodies);

    if (maxSpeed < this.maxSpeedThreshold) {
      this.timeBelowThreshold += dt;
    } else {
      this.timeBelowThreshold = 0;
    }

    // Check if settled by time threshold
    if (this.timeBelowThreshold >= this.maintainTime * 1000) {
      return true;
    }

    // Check if settled by max flight time
    if (this.launchTime !== null && performance.now() - this.launchTime > this.maxFlightTime) {
      return true;
    }

    return false;
  }

  private getMaxSpeed(bodies: Body[]): number {
    let max = 0;
    for (const body of bodies) {
      if (body.isStatic) continue;
      const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
      if (speed > max) max = speed;
    }
    return max;
  }
}
