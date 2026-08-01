import {
  SLINGSHOT_ANCHOR,
  MAX_DRAG_DISTANCE,
  LAUNCH_POWER_MULTIPLIER,
  TRAJECTORY_POINT_COUNT,
  TRAJECTORY_GRAVITY_APPROX,
} from '../constants';

export interface Point {
  x: number;
  y: number;
}

/**
 * Pointer-based (mouse + touch, via the unified Pointer Events API) drag-aim-
 * release slingshot control. Plan §매트릭스 #2 quality floor requires the
 * trajectory prediction line to update every frame during the drag with no
 * perceived input lag; getTrajectoryPreview() is recomputed from the current
 * aim position each render call rather than cached.
 */
export class SlingshotInput {
  private dragging = false;
  private aimPos: Point | null = null;
  enabled = true;

  constructor(
    private canvas: HTMLCanvasElement,
    private cameraXGetter: () => number,
    private onLaunch: (vx: number, vy: number) => void,
    private onDragStart?: () => void,
  ) {
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
  }

  private toWorld(clientX: number, clientY: number): Point {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX + this.cameraXGetter();
    const y = (clientY - rect.top) * scaleY;
    return { x, y };
  }

  private handlePointerDown = (e: PointerEvent) => {
    if (!this.enabled) return;
    const p = this.toWorld(e.clientX, e.clientY);
    const dx = p.x - SLINGSHOT_ANCHOR.x;
    const dy = p.y - SLINGSHOT_ANCHOR.y;
    if (Math.sqrt(dx * dx + dy * dy) > 60) return; // must grab near the idle bird
    this.dragging = true;
    this.aimPos = { ...SLINGSHOT_ANCHOR };
    this.onDragStart?.();
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (!this.dragging || !this.enabled) return;
    const p = this.toWorld(e.clientX, e.clientY);
    const dx = p.x - SLINGSHOT_ANCHOR.x;
    const dy = p.y - SLINGSHOT_ANCHOR.y;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), MAX_DRAG_DISTANCE);
    const angle = Math.atan2(dy, dx);
    this.aimPos = {
      x: SLINGSHOT_ANCHOR.x + Math.cos(angle) * dist,
      y: SLINGSHOT_ANCHOR.y + Math.sin(angle) * dist,
    };
  };

  private handlePointerUp = () => {
    if (!this.dragging || !this.enabled) return;
    this.dragging = false;
    if (this.aimPos) {
      const vx = (SLINGSHOT_ANCHOR.x - this.aimPos.x) * LAUNCH_POWER_MULTIPLIER;
      const vy = (SLINGSHOT_ANCHOR.y - this.aimPos.y) * LAUNCH_POWER_MULTIPLIER;
      this.onLaunch(vx, vy);
    }
    this.aimPos = null;
  };

  isDragging(): boolean {
    return this.dragging;
  }

  getAimBirdPos(): Point | null {
    return this.aimPos;
  }

  /** 30-point (plan §숫자 태그) simplified parabolic preview. Intentionally
   *  decoupled from Matter's internal gravity/mass integration — see
   *  TRAJECTORY_GRAVITY_APPROX in constants.ts. */
  getTrajectoryPreview(): Point[] | undefined {
    if (!this.aimPos) return undefined;
    const vx = (SLINGSHOT_ANCHOR.x - this.aimPos.x) * LAUNCH_POWER_MULTIPLIER;
    const vy = (SLINGSHOT_ANCHOR.y - this.aimPos.y) * LAUNCH_POWER_MULTIPLIER;
    const points: Point[] = [];
    let x = SLINGSHOT_ANCHOR.x;
    let y = SLINGSHOT_ANCHOR.y;
    let curVx = vx;
    let curVy = vy;
    for (let i = 0; i < TRAJECTORY_POINT_COUNT; i++) {
      x += curVx;
      y += curVy;
      curVy += TRAJECTORY_GRAVITY_APPROX;
      points.push({ x, y });
    }
    return points;
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
  }
}
