import { IPhysicsBody } from '../physics/PhysicsWorld';

export class Settle {
  private frameCount: number = 0;
  private settleFrameThreshold: number = 45; // 0.75 seconds at 60fps
  private maxSettleTime: number = 6000; // 6 seconds in ms
  private settleStartTime: number = 0;

  isSettled(bodies: IPhysicsBody[]): boolean {
    // Check if all bodies are moving slowly
    let allSlow = true;
    const speedThreshold = 0.35;
    const angularThreshold = 0.02;

    for (const body of bodies) {
      const vx = body.body.velocity.x;
      const vy = body.body.velocity.y;
      const speed = Math.sqrt(vx * vx + vy * vy);
      const angularSpeed = Math.abs(body.body.angularVelocity);

      if (speed >= speedThreshold || angularSpeed >= angularThreshold) {
        allSlow = false;
        break;
      }
    }

    if (allSlow) {
      this.frameCount++;
    } else {
      this.frameCount = 0;
    }

    // Check timeout
    if (this.settleStartTime > 0) {
      const elapsed = Date.now() - this.settleStartTime;
      if (elapsed > this.maxSettleTime) {
        return true;
      }
    }

    return this.frameCount >= this.settleFrameThreshold;
  }

  start(): void {
    this.settleStartTime = Date.now();
    this.frameCount = 0;
  }

  reset(): void {
    this.frameCount = 0;
    this.settleStartTime = 0;
  }

  getFrameCount(): number {
    return this.frameCount;
  }
}
