import * as Matter from 'matter-js';
import { STEP_MS } from '../core/constants';

/**
 * The ONLY file allowed to import matter-js (plan §1.1).
 *
 * Game code talks to this interface: addBody / removeBody / applyImpulse /
 * takeCollisions / step. That is not abstraction for its own sake — it is the
 * insurance policy that lets Planck.js replace Matter if stacks keep collapsing.
 */

/** Matter converts gravity to a force with this scale factor. */
const GRAVITY_SCALE = 0.001;

export interface BodyHandle {
  readonly id: number;
  /** Owner-defined back-reference (an EntityRef in this game). */
  userData: unknown;
}

export interface BodyMaterial {
  density: number;
  friction: number;
  frictionStatic: number;
  restitution: number;
  frictionAir?: number;
}

export interface RectBodyDef extends BodyMaterial {
  shape: 'rect';
  /** Centre of the body. */
  x: number;
  y: number;
  w: number;
  h: number;
  angle?: number;
  isStatic?: boolean;
  label?: string;
}

export interface CircleBodyDef extends BodyMaterial {
  shape: 'circle';
  x: number;
  y: number;
  r: number;
  angle?: number;
  isStatic?: boolean;
  label?: string;
}

export type BodyDef = RectBodyDef | CircleBodyDef;

export interface BodyState {
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
  speed: number;
  angularSpeed: number;
  mass: number;
  isStatic: boolean;
  isSleeping: boolean;
}

export interface CollisionInfo {
  a: BodyHandle;
  b: BodyHandle;
  /** |relative velocity projected on the contact normal|, px/step. */
  relativeNormalSpeed: number;
  /** Reduced mass of the pair. */
  effectiveMass: number;
  x: number;
  y: number;
}

export interface IntegrationParams {
  stepMs: number;
  /** Velocity gained per step from gravity, px/step. */
  gravityPerStep: number;
}

export interface DebugShape {
  verts: number[];
  isStatic: boolean;
  isSleeping: boolean;
}

class Handle implements BodyHandle {
  userData: unknown = null;
  constructor(
    readonly id: number,
    readonly body: Matter.Body,
  ) {}
}

const ZERO_STATE: BodyState = {
  x: 0,
  y: 0,
  angle: 0,
  vx: 0,
  vy: 0,
  speed: 0,
  angularSpeed: 0,
  mass: 0,
  isStatic: true,
  isSleeping: true,
};

export class PhysicsWorld {
  private readonly engine: Matter.Engine;
  private readonly handles = new Map<number, Handle>();
  private collisions: CollisionInfo[] = [];
  private disposed = false;

  constructor(gravityY: number) {
    this.engine = Matter.Engine.create({
      enableSleeping: true,
      // Raised from the 6/4 default: stacked towers must not shiver apart
      // on load (plan §9, first risk row).
      positionIterations: 10,
      velocityIterations: 8,
      constraintIterations: 4,
    });
    this.engine.gravity.x = 0;
    this.engine.gravity.y = gravityY;
    this.engine.gravity.scale = GRAVITY_SCALE;

    Matter.Events.on(this.engine, 'collisionStart', this.onCollisionStart);
  }

  get integration(): IntegrationParams {
    return {
      stepMs: STEP_MS,
      gravityPerStep: this.engine.gravity.y * GRAVITY_SCALE * STEP_MS * STEP_MS,
    };
  }

  // -------------------------------------------------------------- lifecycle

  addBody(def: BodyDef): BodyHandle {
    const options: Matter.IBodyDefinition = {
      density: def.density,
      friction: def.friction,
      frictionStatic: def.frictionStatic,
      restitution: def.restitution,
      frictionAir: def.frictionAir ?? 0.01,
      isStatic: def.isStatic ?? false,
      label: def.label ?? 'body',
      // Tighter than the 0.05 default: visible gaps between stacked blocks
      // read as "floating" at this scale.
      slop: 0.02,
      sleepThreshold: 40,
    };

    const body =
      def.shape === 'circle'
        ? Matter.Bodies.circle(def.x, def.y, def.r, options)
        : Matter.Bodies.rectangle(def.x, def.y, def.w, def.h, options);

    if (def.angle) Matter.Body.setAngle(body, def.angle);

    Matter.Composite.add(this.engine.world, body);
    const handle = new Handle(body.id, body);
    this.handles.set(body.id, handle);
    return handle;
  }

  removeBody(handle: BodyHandle): void {
    const h = this.handles.get(handle.id);
    if (!h) return;
    Matter.Composite.remove(this.engine.world, h.body);
    this.handles.delete(handle.id);
    h.userData = null;
  }

  has(handle: BodyHandle): boolean {
    return this.handles.has(handle.id);
  }

  /** Full teardown — the only reset path used by "restart" (plan §3). */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    Matter.Events.off(this.engine, 'collisionStart', this.onCollisionStart);
    Matter.Composite.clear(this.engine.world, false, true);
    Matter.Engine.clear(this.engine);
    this.handles.clear();
    this.collisions.length = 0;
  }

  // ------------------------------------------------------------------ step

  step(dtMs: number): void {
    if (this.disposed) return;
    Matter.Engine.update(this.engine, dtMs);
  }

  /** Drains the collision queue collected during the last step. */
  takeCollisions(): CollisionInfo[] {
    if (this.collisions.length === 0) return [];
    const out = this.collisions;
    this.collisions = [];
    return out;
  }

  // ------------------------------------------------------------ body access

  getState(handle: BodyHandle): BodyState {
    const h = this.handles.get(handle.id);
    if (!h) return ZERO_STATE;
    const b = h.body;
    return {
      x: b.position.x,
      y: b.position.y,
      angle: b.angle,
      vx: b.velocity.x,
      vy: b.velocity.y,
      speed: b.speed,
      angularSpeed: b.angularSpeed,
      mass: b.mass,
      isStatic: b.isStatic,
      isSleeping: b.isSleeping,
    };
  }

  setPosition(handle: BodyHandle, x: number, y: number): void {
    const h = this.handles.get(handle.id);
    if (!h) return;
    Matter.Body.setPosition(h.body, { x, y });
  }

  setStatic(handle: BodyHandle, isStatic: boolean): void {
    const h = this.handles.get(handle.id);
    if (!h) return;
    Matter.Body.setStatic(h.body, isStatic);
    if (!isStatic) Matter.Sleeping.set(h.body, false);
  }

  setVelocity(handle: BodyHandle, vx: number, vy: number): void {
    const h = this.handles.get(handle.id);
    if (!h || h.body.isStatic) return;
    Matter.Sleeping.set(h.body, false);
    Matter.Body.setVelocity(h.body, { x: vx, y: vy });
  }

  setAngularVelocity(handle: BodyHandle, omega: number): void {
    const h = this.handles.get(handle.id);
    if (!h || h.body.isStatic) return;
    Matter.Body.setAngularVelocity(h.body, omega);
  }

  /** Impulse in mass*px/step units: dv = impulse / mass. */
  applyImpulse(handle: BodyHandle, ix: number, iy: number): void {
    const h = this.handles.get(handle.id);
    if (!h || h.body.isStatic || h.body.mass <= 0) return;
    Matter.Sleeping.set(h.body, false);
    Matter.Body.setVelocity(h.body, {
      x: h.body.velocity.x + ix / h.body.mass,
      y: h.body.velocity.y + iy / h.body.mass,
    });
  }

  /** Dynamic bodies whose centre lies inside the circle (explosion query). */
  queryRadius(cx: number, cy: number, radius: number): Array<{ handle: BodyHandle; distance: number }> {
    const out: Array<{ handle: BodyHandle; distance: number }> = [];
    for (const h of this.handles.values()) {
      if (h.body.isStatic) continue;
      const d = Math.hypot(h.body.position.x - cx, h.body.position.y - cy);
      if (d <= radius) out.push({ handle: h, distance: d });
    }
    return out;
  }

  /** Outlines for the debug overlay — keeps Matter out of the render layer. */
  getDebugShapes(): DebugShape[] {
    const out: DebugShape[] = [];
    for (const h of this.handles.values()) {
      const verts: number[] = [];
      for (const v of h.body.vertices) {
        verts.push(v.x, v.y);
      }
      out.push({ verts, isStatic: h.body.isStatic, isSleeping: h.body.isSleeping });
    }
    return out;
  }

  get bodyCount(): number {
    return this.handles.size;
  }

  // -------------------------------------------------------------- internals

  private onCollisionStart = (event: Matter.IEventCollision<Matter.Engine>): void => {
    for (const pair of event.pairs) {
      const ha = this.handles.get(pair.bodyA.id);
      const hb = this.handles.get(pair.bodyB.id);
      if (!ha || !hb) continue;

      const collision = (pair as unknown as { collision?: { normal?: { x: number; y: number } } })
        .collision;
      const nx = collision?.normal?.x ?? 0;
      const ny = collision?.normal?.y ?? 0;

      const rvx = hb.body.velocity.x - ha.body.velocity.x;
      const rvy = hb.body.velocity.y - ha.body.velocity.y;
      // Fall back to the full relative speed if the normal is missing.
      const relativeNormalSpeed =
        nx === 0 && ny === 0 ? Math.hypot(rvx, rvy) : Math.abs(rvx * nx + rvy * ny);

      const ma = ha.body.isStatic ? Infinity : ha.body.mass;
      const mb = hb.body.isStatic ? Infinity : hb.body.mass;
      let effectiveMass: number;
      if (!Number.isFinite(ma) && !Number.isFinite(mb)) effectiveMass = 0;
      else if (!Number.isFinite(ma)) effectiveMass = mb;
      else if (!Number.isFinite(mb)) effectiveMass = ma;
      else effectiveMass = (ma * mb) / (ma + mb);

      const contact = pair.activeContacts?.[0]?.vertex;
      this.collisions.push({
        a: ha,
        b: hb,
        relativeNormalSpeed,
        effectiveMass,
        x: contact ? contact.x : (ha.body.position.x + hb.body.position.x) / 2,
        y: contact ? contact.y : (ha.body.position.y + hb.body.position.y) / 2,
      });
    }
  };
}
