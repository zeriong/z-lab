import Matter from 'matter-js';

const SETTLE_VELOCITY_THRESHOLD = 0.35;
const SETTLE_DURATION = 0.8;
const MAX_FLIGHT_TIME = 6;

export class SettleDetector {
  private settleTimer: number = 0;
  private flightTime: number = 0;
  private isFlying: boolean = false;

  startFlight(): void {
    this.isFlying = true;
    this.flightTime = 0;
    this.settleTimer = 0;
  }

  update(bodies: Matter.Body[], dt: number): boolean {
    if (!this.isFlying) {
      return false;
    }

    this.flightTime += dt;

    // Check if max flight time exceeded
    if (this.flightTime >= MAX_FLIGHT_TIME) {
      this.isFlying = false;
      return true;
    }

    // Get maximum speed among all dynamic bodies
    let maxSpeed = 0;
    for (const body of bodies) {
      if (body.isStatic) continue;
      const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
      maxSpeed = Math.max(maxSpeed, speed);
    }

    // Check if settled
    if (maxSpeed < SETTLE_VELOCITY_THRESHOLD) {
      this.settleTimer += dt;
      if (this.settleTimer >= SETTLE_DURATION) {
        this.isFlying = false;
        return true;
      }
    } else {
      this.settleTimer = 0;
    }

    return false;
  }

  reset(): void {
    this.isFlying = false;
    this.settleTimer = 0;
    this.flightTime = 0;
  }

  isSettled(): boolean {
    return !this.isFlying;
  }
}
