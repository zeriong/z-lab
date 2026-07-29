import {
  DEFAULT_SLINGSHOT_ANCHOR,
  GRAB_RADIUS,
  MAX_PULL_RADIUS,
  LAUNCH_FORCE_SCALE,
  TRAJECTORY_GRAVITY,
  TRAJECTORY_POINTS,
} from './constants.js';

// Drag-to-aim input + trajectory preview. Holds the "pending bird" render
// position itself (dragPos, defaulting to the anchor) so main.js doesn't
// need a second source of truth for where the waiting bird is drawn.
export class Slingshot {
  constructor(anchor = DEFAULT_SLINGSHOT_ANCHOR) {
    this.anchor = anchor;
    this.dragging = false;
    this.dragPos = { ...anchor };
  }

  reset() {
    this.dragging = false;
    this.dragPos = { ...this.anchor };
  }

  tryGrab(pointerPos) {
    const dx = pointerPos.x - this.dragPos.x;
    const dy = pointerPos.y - this.dragPos.y;
    if (Math.hypot(dx, dy) <= GRAB_RADIUS) {
      this.dragging = true;
      return true;
    }
    return false;
  }

  updateDrag(pointerPos) {
    if (!this.dragging) return;
    const dx = pointerPos.x - this.anchor.x;
    const dy = pointerPos.y - this.anchor.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, MAX_PULL_RADIUS);
    const angle = Math.atan2(dy, dx);
    this.dragPos = {
      x: this.anchor.x + Math.cos(angle) * clamped,
      y: this.anchor.y + Math.sin(angle) * clamped,
    };
  }

  // Force = (anchor - dragPos) * scale -> fires opposite the pull direction,
  // the familiar slingshot feel.
  getLaunchVector() {
    return {
      x: (this.anchor.x - this.dragPos.x) * LAUNCH_FORCE_SCALE,
      y: (this.anchor.y - this.dragPos.y) * LAUNCH_FORCE_SCALE,
    };
  }

  release() {
    this.dragging = false;
    const launch = this.getLaunchVector();
    this.dragPos = { ...this.anchor };
    return launch;
  }

  // Cheap parabola preview, stepped the same way Matter integrates
  // (v += g; pos += v per step) so it tracks the real flight reasonably
  // well without running a shadow physics world (see constants.js).
  getTrajectoryPoints() {
    if (!this.dragging) return [];
    const v = this.getLaunchVector();
    let vx = v.x;
    let vy = v.y;
    let x = this.anchor.x;
    let y = this.anchor.y;
    const points = [];
    for (let i = 0; i < TRAJECTORY_POINTS; i++) {
      vy += TRAJECTORY_GRAVITY;
      x += vx;
      y += vy;
      points.push({ x, y });
    }
    return points;
  }
}
