import { lerp, lerpAngle } from '../../core/math';
import type { BodyHandle, PhysicsWorld } from '../../physics/PhysicsWorld';

/**
 * Anything with a physics body. Keeps the previous and current transform so the
 * renderer can interpolate with the loop's `alpha` (plan §2.2) — without this,
 * a 144 Hz display shows 60 Hz stepping as visible stutter.
 */
export abstract class Entity {
  x = 0;
  y = 0;
  angle = 0;
  prevX = 0;
  prevY = 0;
  prevAngle = 0;
  speed = 0;
  angularSpeed = 0;
  dead = false;

  protected constructor(readonly handle: BodyHandle) {}

  /** Called once after creation so prev == cur (no first-frame smear). */
  initTransform(physics: PhysicsWorld): void {
    const s = physics.getState(this.handle);
    this.x = this.prevX = s.x;
    this.y = this.prevY = s.y;
    this.angle = this.prevAngle = s.angle;
    this.speed = 0;
    this.angularSpeed = 0;
  }

  sync(physics: PhysicsWorld): void {
    this.prevX = this.x;
    this.prevY = this.y;
    this.prevAngle = this.angle;
    const s = physics.getState(this.handle);
    this.x = s.x;
    this.y = s.y;
    this.angle = s.angle;
    this.speed = s.speed;
    this.angularSpeed = s.angularSpeed;
  }

  renderX(alpha: number): number {
    return lerp(this.prevX, this.x, alpha);
  }

  renderY(alpha: number): number {
    return lerp(this.prevY, this.y, alpha);
  }

  renderAngle(alpha: number): number {
    return lerpAngle(this.prevAngle, this.angle, alpha);
  }
}
