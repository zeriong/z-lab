import { Body } from 'matter-js'

const VELOCITY_THRESHOLD = 0.35 // Initial value
const SETTLE_TIME = 0.8 // 0.8 seconds
const MAX_FLIGHT_TIME = 6 // 6 seconds

export class SettleJudge {
  private settleTimer = 0
  private flightTimer = 0
  private isFlying = false

  update(bodies: Body[], dt: number) {
    const dynamicBodies = bodies.filter(b => !b.isStatic)

    if (dynamicBodies.length === 0) {
      this.isFlying = false
      this.settleTimer = 0
      this.flightTimer = 0
      return
    }

    const maxSpeed = Math.max(...dynamicBodies.map(b => b.speed))

    if (maxSpeed < VELOCITY_THRESHOLD) {
      this.settleTimer += dt
    } else {
      this.settleTimer = 0
    }

    if (this.isFlying) {
      this.flightTimer += dt
    }
  }

  startFlight() {
    this.isFlying = true
    this.flightTimer = 0
    this.settleTimer = 0
  }

  isSettled(): boolean {
    const byTime = this.settleTimer >= SETTLE_TIME
    const byFlight = this.flightTimer >= MAX_FLIGHT_TIME
    return byTime || byFlight
  }

  reset() {
    this.settleTimer = 0
    this.flightTimer = 0
    this.isFlying = false
  }
}
