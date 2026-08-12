import type { LevelData } from '../data/levelSchema';
import type { Bird } from './entities/Bird';

/** Fat-finger radius around the loaded bird (plan §5.1 step 2). */
const GRAB_RADIUS = 46;
/** Below this pull length the release is treated as a cancel (step 5). */
const CANCEL_PULL = 10;

export interface LaunchVector {
  vx: number;
  vy: number;
}

/**
 * Aim state. Owns the pull vector only — it never touches physics, so the
 * "cancelled drag" path cannot leave a half-launched bird behind.
 */
export class Slingshot {
  readonly anchorX: number;
  readonly anchorY: number;
  readonly maxPull: number;
  readonly power: number;

  bird: Bird | null = null;
  dragging = false;
  pullX = 0;
  pullY = 0;

  constructor(data: LevelData['slingshot']) {
    this.anchorX = data.x;
    this.anchorY = data.y;
    this.maxPull = data.maxPull;
    this.power = data.power;
  }

  loadBird(bird: Bird | null): void {
    this.bird = bird;
    this.dragging = false;
    this.pullX = 0;
    this.pullY = 0;
  }

  /** Current bird position: the anchor displaced by the pull. */
  get birdX(): number {
    return this.anchorX - this.pullX;
  }

  get birdY(): number {
    return this.anchorY - this.pullY;
  }

  get pullLength(): number {
    return Math.hypot(this.pullX, this.pullY);
  }

  /** 0..1 — drives the band tension art and the power read-out. */
  get pullRatio(): number {
    return this.maxPull > 0 ? Math.min(1, this.pullLength / this.maxPull) : 0;
  }

  hitTest(wx: number, wy: number): boolean {
    if (!this.bird) return false;
    return Math.hypot(wx - this.birdX, wy - this.birdY) <= GRAB_RADIUS;
  }

  beginDrag(wx: number, wy: number): boolean {
    if (!this.bird || this.bird.launched) return false;
    if (!this.hitTest(wx, wy)) return false;
    this.dragging = true;
    this.updateDrag(wx, wy);
    return true;
  }

  updateDrag(wx: number, wy: number): void {
    if (!this.dragging) return;
    let px = this.anchorX - wx;
    let py = this.anchorY - wy;

    // Only pull backwards (pointer left of the anchor): the bird always flies
    // to the right, so a negative pull would mean "shoot into the sling".
    if (px < 0) px = 0;

    const len = Math.hypot(px, py);
    if (len > this.maxPull) {
      const k = this.maxPull / len;
      px *= k;
      py *= k;
    }
    this.pullX = px;
    this.pullY = py;
  }

  /** @returns the launch velocity (px/step) or null when the drag was a cancel. */
  release(): LaunchVector | null {
    if (!this.dragging) return null;
    this.dragging = false;
    if (this.pullLength < CANCEL_PULL) {
      this.pullX = 0;
      this.pullY = 0;
      return null;
    }
    const v = { vx: this.pullX * this.power, vy: this.pullY * this.power };
    this.pullX = 0;
    this.pullY = 0;
    return v;
  }

  cancel(): void {
    this.dragging = false;
    this.pullX = 0;
    this.pullY = 0;
  }
}
