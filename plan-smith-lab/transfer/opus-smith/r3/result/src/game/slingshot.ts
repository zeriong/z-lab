import Matter from 'matter-js';

const MAX_DRAG_DISTANCE = 96;
const TRAJECTORY_DOT_COUNT = 10;
const TRAJECTORY_DOT_INTERVAL = 0.08;
const TRAJECTORY_FADE_TIME = 2;

export interface TrajectoryPoint {
  x: number;
  y: number;
}

export interface TrajectoryTrail {
  points: TrajectoryPoint[];
  age: number;
}

export class SlingshotController {
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private currentDragX: number = 0;
  private currentDragY: number = 0;
  private trajectoryPoints: TrajectoryPoint[] = [];
  private trajectoryTrail: TrajectoryTrail | null = null;
  private canvas: HTMLCanvasElement;
  private onLaunch: ((vx: number, vy: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    this.canvas.addEventListener('pointerup', (e) => this.handlePointerUp(e));
  }

  private canvasToWorldCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return {
      x: (clientX - rect.left) / (rect.width / this.canvas.offsetWidth),
      y: (clientY - rect.top) / (rect.height / this.canvas.offsetHeight),
    };
  }

  private handlePointerDown(e: PointerEvent): void {
    const coords = this.canvasToWorldCoords(e.clientX, e.clientY);
    this.isDragging = true;
    this.dragStartX = coords.x;
    this.dragStartY = coords.y;
    this.currentDragX = coords.x;
    this.currentDragY = coords.y;
  }

  private handlePointerMove(e: PointerEvent): void {
    if (!this.isDragging) return;

    const coords = this.canvasToWorldCoords(e.clientX, e.clientY);
    const dx = coords.x - this.dragStartX;
    const dy = coords.y - this.dragStartY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= MAX_DRAG_DISTANCE) {
      this.currentDragX = coords.x;
      this.currentDragY = coords.y;
    } else {
      const angle = Math.atan2(dy, dx);
      this.currentDragX = this.dragStartX + Math.cos(angle) * MAX_DRAG_DISTANCE;
      this.currentDragY = this.dragStartY + Math.sin(angle) * MAX_DRAG_DISTANCE;
    }

    this.updateTrajectoryPreview();
  }

  private handlePointerUp(e: PointerEvent): void {
    if (!this.isDragging) return;

    const dx = this.currentDragX - this.dragStartX;
    const dy = this.currentDragY - this.dragStartY;
    const velocityX = -dx * 5; // Multiplier for velocity
    const velocityY = -dy * 5;

    if (this.onLaunch) {
      this.onLaunch(velocityX, velocityY);
    }

    // Store trail for visual feedback
    if (this.trajectoryPoints.length > 0) {
      this.trajectoryTrail = {
        points: [...this.trajectoryPoints],
        age: 0,
      };
    }

    this.isDragging = false;
    this.trajectoryPoints = [];
  }

  private updateTrajectoryPreview(): void {
    this.trajectoryPoints = [];

    const dx = this.currentDragX - this.dragStartX;
    const dy = this.currentDragY - this.dragStartY;

    const vx = -dx * 5;
    const vy = -dy * 5;

    let simX = this.dragStartX;
    let simY = this.dragStartY;
    let simVx = vx;
    let simVy = vy;

    for (let i = 0; i < TRAJECTORY_DOT_COUNT; i++) {
      const time = i * TRAJECTORY_DOT_INTERVAL;

      // Simple physics simulation: y = y0 + vy*t + 0.5*g*t^2
      const simGravity = 500 / 1000; // Gravity in pixels/ms
      const predictX = this.dragStartX + vx * time * 0.06;
      const predictY = this.dragStartY + vy * time * 0.06 + 0.5 * simGravity * time * time * 0.0036;

      this.trajectoryPoints.push({
        x: predictX,
        y: predictY,
      });
    }
  }

  setOnLaunchCallback(callback: (vx: number, vy: number) => void): void {
    this.onLaunch = callback;
  }

  isDraggingNow(): boolean {
    return this.isDragging;
  }

  getDragPosition(): { startX: number; startY: number; currentX: number; currentY: number } {
    return {
      startX: this.dragStartX,
      startY: this.dragStartY,
      currentX: this.currentDragX,
      currentY: this.currentDragY,
    };
  }

  getTrajectoryPoints(): TrajectoryPoint[] {
    return this.trajectoryPoints;
  }

  getTrajectoryTrail(): TrajectoryTrail | null {
    return this.trajectoryTrail;
  }

  updateTrajectoryAge(dt: number): void {
    if (this.trajectoryTrail) {
      this.trajectoryTrail.age += dt;
      if (this.trajectoryTrail.age >= TRAJECTORY_FADE_TIME) {
        this.trajectoryTrail = null;
      }
    }
  }

  clearTrail(): void {
    this.trajectoryTrail = null;
  }
}
