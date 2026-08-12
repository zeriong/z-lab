import { PhysicsBody } from '../physics/PhysicsWorld';

export class Settle {
  private settledFrameCount: number = 0;
  private settledThreshold: number = 45; // 0.75 seconds at 60fps
  private settleTimeout: number = 360; // 6 seconds timeout

  reset() {
    this.settledFrameCount = 0;
  }

  checkSettled(bodies: PhysicsBody[], timeoutCounter: number): boolean {
    const speedThreshold = 0.35;
    const angularSpeedThreshold = 0.02;

    let allSettled = true;

    for (const body of bodies) {
      if (body.body.isStatic) continue;

      const speed = Math.sqrt(
        body.body.velocity.x ** 2 + body.body.velocity.y ** 2
      );
      const angularSpeed = Math.abs(body.body.angularVelocity);

      if (speed >= speedThreshold || angularSpeed >= angularSpeedThreshold) {
        allSettled = false;
        break;
      }
    }

    if (allSettled) {
      this.settledFrameCount++;
    } else {
      this.settledFrameCount = 0;
    }

    // Check timeout
    if (timeoutCounter >= this.settleTimeout) {
      return true;
    }

    return this.settledFrameCount >= this.settledThreshold;
  }
}
