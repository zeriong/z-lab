import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from './constants';
import { clamp, lerp } from './math';

export interface LogicalPoint {
  x: number;
  y: number;
}

export interface WorldPoint {
  x: number;
  y: number;
}

export interface CameraBounds {
  minX: number;
  maxX: number;
  worldHeight: number;
  minZoom: number;
  maxZoom: number;
}

/**
 * World <-> screen transform with lerped follow and world clamping (plan §5.3).
 * "screen" here always means LOGICAL screen space (1280x720); the letterbox
 * scaling on top of that is Renderer's business.
 */
export class Camera {
  x = LOGICAL_WIDTH / 2;
  y = LOGICAL_HEIGHT / 2;
  zoom = 1;

  private targetX = this.x;
  private targetY = this.y;
  private targetZoom = 1;
  private followLerp = 0.08;

  /** Screen-space shake offset, decays every fixed update. */
  private shake = 0;
  private shakeX = 0;
  private shakeY = 0;
  private shakeTick = 0;

  bounds: CameraBounds = {
    minX: 0,
    maxX: 2400,
    worldHeight: LOGICAL_HEIGHT,
    minZoom: 0.6,
    maxZoom: 1.2,
  };

  setBounds(bounds: CameraBounds): void {
    this.bounds = bounds;
  }

  /** Set the follow target. `lerpAmount` 1 = snap. */
  moveTo(x: number, y: number, zoom: number, lerpAmount = 0.08): void {
    this.targetX = x;
    this.targetY = y;
    this.targetZoom = clamp(zoom, this.bounds.minZoom, this.bounds.maxZoom);
    this.followLerp = lerpAmount;
  }

  snapToTarget(): void {
    this.x = this.targetX;
    this.y = this.targetY;
    this.zoom = this.targetZoom;
    this.clampSelf();
  }

  /** Manual pan (drag on empty space) — moves the target, not the raw pos. */
  panBy(dxScreen: number, dyScreen: number): void {
    this.targetX -= dxScreen / this.zoom;
    this.targetY -= dyScreen / this.zoom;
    this.followLerp = 0.35;
  }

  addShake(strength: number): void {
    this.shake = Math.min(18, this.shake + strength);
  }

  update(): void {
    this.zoom = lerp(this.zoom, this.targetZoom, this.followLerp);
    this.x = lerp(this.x, this.targetX, this.followLerp);
    this.y = lerp(this.y, this.targetY, this.followLerp);
    this.clampSelf();

    if (this.shake > 0.05) {
      this.shakeTick += 1;
      this.shakeX = Math.sin(this.shakeTick * 1.9) * this.shake;
      this.shakeY = Math.cos(this.shakeTick * 2.7) * this.shake * 0.6;
      this.shake *= 0.86;
    } else {
      this.shake = 0;
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  private clampSelf(): void {
    const { minX, maxX, worldHeight, minZoom, maxZoom } = this.bounds;
    this.zoom = clamp(this.zoom, minZoom, maxZoom);

    const halfW = LOGICAL_WIDTH / (2 * this.zoom);
    const halfH = LOGICAL_HEIGHT / (2 * this.zoom);

    const worldW = maxX - minX;
    if (worldW <= halfW * 2) {
      this.x = (minX + maxX) / 2;
    } else {
      this.x = clamp(this.x, minX + halfW, maxX - halfW);
    }

    if (worldHeight <= halfH * 2) {
      // World is shorter than the view: pin the ground to the bottom edge.
      this.y = worldHeight - halfH;
    } else {
      this.y = clamp(this.y, halfH, worldHeight - halfH);
    }

    // Never clamp the target harder than the camera itself, otherwise a pan
    // against the wall builds up an invisible offset.
    this.targetX = clamp(this.targetX, minX - halfW, maxX + halfW);
    this.targetY = clamp(this.targetY, -halfH, worldHeight + halfH);
  }

  /** Applies the camera transform to a 2D context in logical space. */
  apply(ctx: CanvasRenderingContext2D): void {
    ctx.translate(LOGICAL_WIDTH / 2 + this.shakeX, LOGICAL_HEIGHT / 2 + this.shakeY);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  worldToScreen(wx: number, wy: number): LogicalPoint {
    return {
      x: (wx - this.x) * this.zoom + LOGICAL_WIDTH / 2 + this.shakeX,
      y: (wy - this.y) * this.zoom + LOGICAL_HEIGHT / 2 + this.shakeY,
    };
  }

  screenToWorld(sx: number, sy: number): WorldPoint {
    return {
      x: (sx - LOGICAL_WIDTH / 2 - this.shakeX) / this.zoom + this.x,
      y: (sy - LOGICAL_HEIGHT / 2 - this.shakeY) / this.zoom + this.y,
    };
  }

  /** Visible world rect — used to skip off-screen draws. */
  viewRect(): { left: number; top: number; right: number; bottom: number } {
    const halfW = LOGICAL_WIDTH / (2 * this.zoom);
    const halfH = LOGICAL_HEIGHT / (2 * this.zoom);
    return {
      left: this.x - halfW,
      top: this.y - halfH,
      right: this.x + halfW,
      bottom: this.y + halfH,
    };
  }
}
