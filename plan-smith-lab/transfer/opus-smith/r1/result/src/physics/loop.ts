import { Engine } from 'matter-js'
import { getWorld } from './world'

const DT = 1000 / 60 // 16.667ms per frame
const MAX_STEPS = 5

export class PhysicsLoop {
  private accumulator = 0
  private isRunning = false
  private lastTimestamp = 0
  private updateSpyCount = 0
  private rafId: number | null = null

  constructor() {
    this.lastTimestamp = performance.now()
  }

  private loop = () => {
    const now = performance.now()
    const delta = Math.min(now - this.lastTimestamp, 50) // Clamp to 50ms max
    this.lastTimestamp = now
    this.accumulator += delta

    const world = getWorld()
    if (world && this.isRunning) {
      let steps = 0
      while (this.accumulator >= DT && steps < MAX_STEPS) {
        Engine.update(world, DT / 1000)
        this.updateSpyCount++
        this.accumulator -= DT
        steps++
      }
    }

    this.rafId = requestAnimationFrame(this.loop)
  }

  play() {
    if (this.isRunning) return
    this.isRunning = true
    this.accumulator = 0
    this.updateSpyCount = 0
    this.lastTimestamp = performance.now()
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(this.loop)
    }
  }

  pause() {
    this.isRunning = false
    this.accumulator = 0
    this.updateSpyCount = 0
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.isRunning = false
  }

  getUpdateSpyCount(): number {
    return this.updateSpyCount
  }

  resetUpdateSpyCount() {
    this.updateSpyCount = 0
  }

  isActive(): boolean {
    return this.isRunning
  }
}
