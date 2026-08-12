import { Body } from 'matter-js'
import { CanvasRenderer } from '../render/canvas'

const MAX_DRAG_DISTANCE = 96

export class SlingshotController {
  private slingshot: { x: number; y: number }
  private currentBird: Body | null = null
  private isDragging = false
  private dragStart = { x: 0, y: 0 }
  private trajectoryPoints: { x: number; y: number }[] = []
  private lastTrajectory: { x: number; y: number }[] = []
  private renderer: CanvasRenderer
  private onLaunch: () => void = () => {}

  constructor(slingshot: { x: number; y: number }, renderer: CanvasRenderer) {
    this.slingshot = slingshot
    this.renderer = renderer

    const canvas = renderer.getCanvas()
    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e))
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e))
    canvas.addEventListener('pointerup', (e) => this.onPointerUp(e))
  }

  setCurrentBird(bird: Body) {
    this.currentBird = bird
  }

  setLaunchCallback(cb: () => void) {
    this.onLaunch = cb
  }

  private onPointerDown(e: PointerEvent) {
    if (!this.currentBird || this.currentBird.isStatic === false) return

    const rect = this.renderer.getCanvas().getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const world = this.renderer.screenToWorld(x, y)

    const dx = world.x - this.slingshot.x
    const dy = world.y - this.slingshot.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 50) return // Not in grab radius

    this.isDragging = true
    this.dragStart = { x: world.x, y: world.y }
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.isDragging || !this.currentBird) return

    const rect = this.renderer.getCanvas().getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const world = this.renderer.screenToWorld(x, y)

    const dx = world.x - this.slingshot.x
    const dy = world.y - this.slingshot.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > MAX_DRAG_DISTANCE) {
      const ratio = MAX_DRAG_DISTANCE / dist
      this.currentBird.position.x = this.slingshot.x + dx * ratio
      this.currentBird.position.y = this.slingshot.y + dy * ratio
    } else {
      this.currentBird.position.x = world.x
      this.currentBird.position.y = world.y
    }

    // Calculate trajectory
    this.updateTrajectory()
  }

  private onPointerUp(e: PointerEvent) {
    if (!this.isDragging || !this.currentBird) return
    this.isDragging = false

    const dx = this.currentBird.position.x - this.slingshot.x
    const dy = this.currentBird.position.y - this.slingshot.y

    // Record trajectory before clearing
    this.lastTrajectory = [...this.trajectoryPoints]
    this.trajectoryPoints = []

    // Launch bird
    this.launch(-dx, -dy)
  }

  private launch(forceX: number, forceY: number) {
    if (!this.currentBird || !this.currentBird.isStatic) return

    this.currentBird.isStatic = false
    Body.setVelocity(this.currentBird, { x: forceX * 0.01, y: forceY * 0.01 })
    this.onLaunch()
  }

  private updateTrajectory() {
    if (!this.currentBird) return

    this.trajectoryPoints = []
    const forceX = -(this.currentBird.position.x - this.slingshot.x)
    const forceY = -(this.currentBird.position.y - this.slingshot.y)

    let x = this.slingshot.x
    let y = this.slingshot.y
    let vx = forceX * 0.01
    let vy = forceY * 0.01

    for (let i = 0; i < 10; i++) {
      x += vx * 0.08
      y += vy * 0.08 + 9.8 * 0.08 * 0.08 * 0.5
      vy += 9.8 * 0.08
      this.trajectoryPoints.push({ x, y })
    }
  }

  isDraggingNow(): boolean {
    return this.isDragging
  }

  getTrajectoryPoints(): { x: number; y: number }[] {
    return this.trajectoryPoints
  }

  getLastTrajectory(): { x: number; y: number }[] {
    return this.lastTrajectory
  }

  reset() {
    this.isDragging = false
    this.trajectoryPoints = []
    this.lastTrajectory = []
  }
}
