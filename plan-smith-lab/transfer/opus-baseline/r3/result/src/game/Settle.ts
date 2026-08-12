import { PhysicsWorld } from '../physics/PhysicsWorld';

export class Settle {
  private quietFrames: number = 0;
  private readonly quietThreshold: number = 45; // 0.75 seconds at 60fps
  private readonly timeoutFrames: number = 360; // 6 seconds at 60fps
  private settleStartFrame: number = 0;
  private isSettling: boolean = false;

  start(): void {
    this.isSettling = true;
    this.settleStartFrame = 0;
    this.quietFrames = 0;
  }

  update(physics: PhysicsWorld): boolean {
    if (!this.isSettling) return false;

    this.settleStartFrame++;

    // Check if all bodies are quiet
    const bodies = physics.getBodies();
    let allQuiet = true;

    for (const pb of bodies) {
      const vel = pb.body.velocity;
      const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
      const angularSpeed = Math.abs(pb.body.angularVelocity);

      if (speed > 0.35 || angularSpeed > 0.02) {
        allQuiet = false;
        break;
      }
    }

    if (allQuiet) {
      this.quietFrames++;
    } else {
      this.quietFrames = 0;
    }

    // Check for settle conditions
    if (this.quietFrames >= this.quietThreshold) {
      return true; // Settled
    }

    if (this.settleStartFrame >= this.timeoutFrames) {
      return true; // Timeout
    }

    return false;
  }

  reset(): void {
    this.quietFrames = 0;
    this.settleStartFrame = 0;
    this.isSettling = false;
  }

  isActive(): boolean {
    return this.isSettling;
  }
}
