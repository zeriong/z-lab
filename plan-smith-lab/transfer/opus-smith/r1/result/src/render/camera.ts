import { CanvasRenderer, Camera } from './canvas'
import { Body } from 'matter-js'

export class CameraController {
  private renderer: CanvasRenderer
  private targetBird: Body | null = null
  private isPreviewMode = false
  private previewRect = { x: 400, y: 300, w: 800, h: 600 }
  private minZoom = 0.5
  private maxZoom = 2

  constructor(renderer: CanvasRenderer) {
    this.renderer = renderer
  }

  setPreviewMode(enabled: boolean, rect?: { x: number; y: number; w: number; h: number }) {
    this.isPreviewMode = enabled
    if (rect) {
      this.previewRect = rect
    }
  }

  setTargetBird(bird: Body | null) {
    this.targetBird = bird
  }

  setZoomBounds(min: number, max: number) {
    this.minZoom = min
    this.maxZoom = max
  }

  update(dt: number) {
    const camera = this.renderer.getCamera()

    if (this.isPreviewMode) {
      this.updatePreview(dt, camera)
    } else if (this.targetBird) {
      this.updateTracking(dt, camera)
    }
  }

  private updatePreview(dt: number, camera: Camera) {
    // Preview mode: show full stage then smooth zoom to slingshot
    const targetX = this.previewRect.x
    const targetY = this.previewRect.y
    const targetZoom = Math.min(
      this.renderer.getDisplayWidth() / this.previewRect.w,
      this.renderer.getDisplayHeight() / this.previewRect.h
    )

    camera.x += (targetX - camera.x) * dt * 2
    camera.y += (targetY - camera.y) * dt * 2
    camera.zoom += (targetZoom - camera.zoom) * dt * 2
  }

  private updateTracking(dt: number, camera: Camera) {
    if (!this.targetBird) return

    // Keep bird at left 1/3 of screen
    const targetX = this.targetBird.position.x - this.renderer.getDisplayWidth() / (6 * camera.zoom)
    const targetY = this.targetBird.position.y

    camera.x += (targetX - camera.x) * dt * 3
    camera.y += (targetY - camera.y) * dt * 3

    // Clamp zoom
    camera.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, camera.zoom))
  }

  returnToSlingshot(slingshot: { x: number; y: number }, duration: number) {
    const camera = this.renderer.getCamera()
    const startX = camera.x
    const startY = camera.y
    const startZoom = camera.zoom
    const targetZoom = 1

    const startTime = performance.now()

    const animate = () => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease-out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3)

      camera.x = startX + (slingshot.x - startX) * easeProgress
      camera.y = startY + (slingshot.y - startY) * easeProgress
      camera.zoom = startZoom + (targetZoom - startZoom) * easeProgress

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    animate()
  }
}
