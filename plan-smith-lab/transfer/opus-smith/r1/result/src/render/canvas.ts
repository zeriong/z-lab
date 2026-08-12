import { getWorld } from '../physics/world'
import { Vertex } from 'matter-js'

export interface Camera {
  x: number
  y: number
  zoom: number
  vx?: number
  vy?: number
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private dpr: number
  private displayWidth: number
  private displayHeight: number
  private worldWidth: number = 800
  private worldHeight: number = 600
  private shakeAmount: number = 0
  private shakeTime: number = 0
  private camera: Camera = { x: 400, y: 300, zoom: 1 }

  constructor() {
    this.dpr = window.devicePixelRatio || 1
    this.canvas = document.createElement('canvas')
    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get canvas context')
    this.ctx = ctx

    this.displayWidth = window.innerWidth
    this.displayHeight = window.innerHeight

    this.setupCanvas()
    document.body.appendChild(this.canvas)

    window.addEventListener('resize', () => this.onResize())
  }

  private setupCanvas() {
    this.canvas.width = this.displayWidth * this.dpr
    this.canvas.height = this.displayHeight * this.dpr
    this.canvas.style.width = this.displayWidth + 'px'
    this.canvas.style.height = this.displayHeight + 'px'
    this.canvas.style.display = 'block'
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  private onResize() {
    this.displayWidth = window.innerWidth
    this.displayHeight = window.innerHeight
    this.dpr = window.devicePixelRatio || 1
    this.setupCanvas()
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx
  }

  getDisplayWidth(): number {
    return this.displayWidth
  }

  getDisplayHeight(): number {
    return this.displayHeight
  }

  getWorldWidth(): number {
    return this.worldWidth
  }

  getWorldHeight(): number {
    return this.worldHeight
  }

  screenToWorld(x: number, y: number): { x: number; y: number } {
    const shake = Math.sin(this.shakeTime * 0.1) * this.shakeAmount
    const screenX = (x - this.displayWidth / 2) / this.camera.zoom + this.camera.x + shake
    const screenY = (y - this.displayHeight / 2) / this.camera.zoom + this.camera.y + shake
    return { x: screenX, y: screenY }
  }

  worldToScreen(x: number, y: number): { x: number; y: number } {
    const shake = Math.sin(this.shakeTime * 0.1) * this.shakeAmount
    const screenX = (x - this.camera.x - shake) * this.camera.zoom + this.displayWidth / 2
    const screenY = (y - this.camera.y - shake) * this.camera.zoom + this.displayHeight / 2
    return { x: screenX, y: screenY }
  }

  render(frameIndex: number) {
    this.updateShake()

    this.ctx.fillStyle = '#87CEEB'
    this.ctx.fillRect(0, 0, this.displayWidth, this.displayHeight)

    this.ctx.save()

    // Apply camera transform
    const shake = Math.sin(this.shakeTime * 0.1) * this.shakeAmount
    this.ctx.translate(this.displayWidth / 2, this.displayHeight / 2)
    this.ctx.scale(this.camera.zoom, this.camera.zoom)
    this.ctx.translate(-(this.camera.x + shake), -(this.camera.y + shake))

    // Draw world
    const world = getWorld()
    if (world) {
      this.drawBodies(world.bodies)
      this.drawConstraints(world.constraints)
    }

    this.ctx.restore()
  }

  private drawBodies(bodies: any[]) {
    for (const body of bodies) {
      if (body.isStatic && !body.label?.includes('ground')) continue

      const parts = body.parts
      for (const part of parts) {
        if (part === body) continue

        this.ctx.fillStyle = body.plugin?.color || '#999'
        this.ctx.strokeStyle = '#333'
        this.ctx.lineWidth = 2

        const vertices = part.vertices as Vertex[]
        if (vertices.length === 0) continue

        this.ctx.beginPath()
        this.ctx.moveTo(vertices[0].x, vertices[0].y)
        for (let i = 1; i < vertices.length; i++) {
          this.ctx.lineTo(vertices[i].x, vertices[i].y)
        }
        this.ctx.closePath()
        this.ctx.fill()
        this.ctx.stroke()
      }
    }
  }

  private drawConstraints(constraints: any[]) {
    this.ctx.strokeStyle = '#666'
    this.ctx.lineWidth = 1
    for (const constraint of constraints) {
      if (!constraint.bodyA || !constraint.bodyB) continue
      const pointA = constraint.pointA
      const pointB = constraint.pointB
      const posA = { x: constraint.bodyA.position.x + pointA.x, y: constraint.bodyA.position.y + pointA.y }
      const posB = constraint.bodyB ?
        { x: constraint.bodyB.position.x + pointB.x, y: constraint.bodyB.position.y + pointB.y } :
        { x: pointB.x, y: pointB.y }

      this.ctx.beginPath()
      this.ctx.moveTo(posA.x, posA.y)
      this.ctx.lineTo(posB.x, posB.y)
      this.ctx.stroke()
    }
  }

  setCamera(x: number, y: number, zoom: number) {
    this.camera.x = x
    this.camera.y = y
    this.camera.zoom = zoom
  }

  getCamera(): Camera {
    return this.camera
  }

  addShake(amount: number, duration: number) {
    this.shakeAmount = Math.max(this.shakeAmount, amount)
    this.shakeTime = duration
  }

  private updateShake() {
    if (this.shakeTime > 0) {
      this.shakeTime -= 16.667 / 1000
    } else {
      this.shakeAmount = 0
    }
  }
}
