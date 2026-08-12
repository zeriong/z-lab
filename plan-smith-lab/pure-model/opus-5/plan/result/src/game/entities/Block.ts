import type { BlockDef, MaterialKind } from '../../data/levelSchema';
import { MATERIALS, type MaterialSpec } from '../../physics/materials';
import type { BodyDef, PhysicsWorld } from '../../physics/PhysicsWorld';
import { Entity } from './Entity';

/**
 * A structural block. Level JSON gives BOTTOM-CENTER coordinates; the
 * conversion to the physics body centre happens here (plan §4.1).
 */
export class Block extends Entity {
  readonly spec: MaterialSpec;
  readonly type: MaterialKind;
  readonly shape: 'rect' | 'circle';
  readonly w: number;
  readonly h: number;
  readonly r: number;
  readonly maxHp: number;
  hp: number;
  /** Rises with each survived hit — drives the crack overlay. */
  damageFlash = 0;

  constructor(def: BlockDef, physics: PhysicsWorld) {
    const spec = MATERIALS[def.type];
    const angle = def.angle ?? 0;

    let bodyDef: BodyDef;
    let w = 0;
    let h = 0;
    let r = 0;

    if (def.shape === 'circle') {
      r = def.r;
      bodyDef = {
        shape: 'circle',
        x: def.x,
        y: def.y - r,
        r,
        angle,
        density: spec.density,
        friction: spec.friction,
        frictionStatic: spec.frictionStatic,
        restitution: spec.restitution,
        frictionAir: spec.frictionAir,
        label: `block:${def.type}`,
      };
    } else {
      w = def.w;
      h = def.h;
      bodyDef = {
        shape: 'rect',
        x: def.x,
        y: def.y - h / 2,
        w,
        h,
        angle,
        density: spec.density,
        friction: spec.friction,
        frictionStatic: spec.frictionStatic,
        restitution: spec.restitution,
        frictionAir: spec.frictionAir,
        label: `block:${def.type}`,
      };
    }

    super(physics.addBody(bodyDef));

    this.spec = spec;
    this.type = def.type;
    this.shape = def.shape;
    this.w = w;
    this.h = h;
    this.r = r;
    this.maxHp = spec.hp;
    this.hp = spec.hp;

    this.handle.userData = { kind: 'block', block: this };
    this.initTransform(physics);
  }

  /** @returns true when this hit was the killing one. */
  applyDamage(amount: number): boolean {
    if (this.dead || amount <= 0) return false;
    this.hp -= amount;
    this.damageFlash = 1;
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    return false;
  }

  get hpRatio(): number {
    return Math.max(0, this.hp / this.maxHp);
  }

  /** Rough radius, used for debris spread. */
  get extent(): number {
    return this.shape === 'circle' ? this.r : Math.max(this.w, this.h) / 2;
  }

  update(): void {
    if (this.damageFlash > 0) this.damageFlash = Math.max(0, this.damageFlash - 0.06);
  }
}
