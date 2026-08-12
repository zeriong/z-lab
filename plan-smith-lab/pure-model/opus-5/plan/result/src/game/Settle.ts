/**
 * "Has the world stopped moving?" (plan §6.3)
 *
 * Round resolution hangs on this: judging too early cuts the collapse
 * animation, judging never means the round never ends. Two exits:
 *   1. every dynamic body below the speed thresholds for 45 consecutive frames
 *   2. a hard timeout (default 6s) for the ball that rolls forever
 */

const SPEED_EPS = 0.35;
const ANGULAR_EPS = 0.02;
const QUIET_FRAMES = 45;

export interface SettleSample {
  speed: number;
  angularSpeed: number;
}

export class SettleDetector {
  private quiet = 0;
  private elapsed = 0;
  private timeoutFrames = 360;
  private active = false;
  timedOut = false;

  /** @param timeoutSeconds hard cap from this moment on. */
  begin(timeoutSeconds = 6): void {
    this.quiet = 0;
    this.elapsed = 0;
    this.timeoutFrames = Math.round(timeoutSeconds * 60);
    this.active = true;
    this.timedOut = false;
  }

  stop(): void {
    this.active = false;
  }

  get isActive(): boolean {
    return this.active;
  }

  get quietFrames(): number {
    return this.quiet;
  }

  /** @returns true once the world counts as settled. */
  update(samples: Iterable<SettleSample>): boolean {
    if (!this.active) return false;
    this.elapsed += 1;

    let moving = false;
    for (const s of samples) {
      if (s.speed > SPEED_EPS || Math.abs(s.angularSpeed) > ANGULAR_EPS) {
        moving = true;
        break;
      }
    }

    if (moving) this.quiet = 0;
    else this.quiet += 1;

    if (this.quiet >= QUIET_FRAMES) {
      this.active = false;
      return true;
    }
    if (this.elapsed >= this.timeoutFrames) {
      this.active = false;
      this.timedOut = true;
      return true;
    }
    return false;
  }
}
