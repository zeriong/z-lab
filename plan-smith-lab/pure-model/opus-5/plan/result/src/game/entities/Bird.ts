import type { BirdKind } from '../../data/levelSchema';
import { BIRDS, type BirdSpec } from '../../physics/materials';
import type { PhysicsWorld } from '../../physics/PhysicsWorld';
import { Entity } from './Entity';

/**
 * The projectile. Created STATIC on the sling anchor (plan §5.1 step 1) and
 * flipped to dynamic on release, so the aiming phase cannot be disturbed by
 * the simulation.
 */
export class Bird extends Entity {
  readonly kind: BirdKind;
  readonly spec: BirdSpec;
  launched = false;
  abilityUsed = false;
  /** Frames spent below the "basically stopped" speed while flying. */
  restFrames = 0;

  constructor(kind: BirdKind, x: number, y: number, physics: PhysicsWorld) {
    const spec = BIRDS[kind];
    super(
      physics.addBody({
        shape: 'circle',
        x,
        y,
        r: spec.radius,
        density: spec.density,
        friction: spec.friction,
        frictionStatic: spec.frictionStatic,
        restitution: spec.restitution,
        frictionAir: spec.frictionAir,
        isStatic: true,
        label: `bird:${kind}`,
      }),
    );
    this.kind = kind;
    this.spec = spec;
    this.handle.userData = { kind: 'bird', bird: this };
    this.initTransform(physics);
  }

  get radius(): number {
    return this.spec.radius;
  }

  /** Only `speed` and `bomb` have an ability, and only once per bird. */
  get canUseAbility(): boolean {
    return this.launched && !this.abilityUsed && this.kind !== 'basic';
  }
}
