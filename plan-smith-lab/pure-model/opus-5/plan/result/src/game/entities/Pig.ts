import { PIG_RADIUS, type PigDef, type PigSize } from '../../data/levelSchema';
import { PIG_HP, PIG_MATERIAL } from '../../physics/materials';
import type { PhysicsWorld } from '../../physics/PhysicsWorld';
import { Entity } from './Entity';

/** The objective. Dies from impact damage, crushing, or a hard landing. */
export class Pig extends Entity {
  readonly size: PigSize;
  readonly radius: number;
  readonly maxHp: number;
  hp: number;
  hurtFlash = 0;

  constructor(def: PigDef, physics: PhysicsWorld) {
    const radius = PIG_RADIUS[def.size];
    super(
      physics.addBody({
        shape: 'circle',
        x: def.x,
        y: def.y - radius, // bottom-center -> centre
        r: radius,
        density: PIG_MATERIAL.density,
        friction: PIG_MATERIAL.friction,
        frictionStatic: PIG_MATERIAL.frictionStatic,
        restitution: PIG_MATERIAL.restitution,
        frictionAir: PIG_MATERIAL.frictionAir,
        label: 'pig',
      }),
    );

    this.size = def.size;
    this.radius = radius;
    this.maxHp = PIG_HP[def.size];
    this.hp = this.maxHp;

    this.handle.userData = { kind: 'pig', pig: this };
    this.initTransform(physics);
  }

  get spec() {
    return PIG_MATERIAL;
  }

  applyDamage(amount: number): boolean {
    if (this.dead || amount <= 0) return false;
    this.hp -= amount;
    this.hurtFlash = 1;
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    return false;
  }

  get hpRatio(): number {
    return Math.max(0, this.hp / this.maxHp);
  }

  update(): void {
    if (this.hurtFlash > 0) this.hurtFlash = Math.max(0, this.hurtFlash - 0.05);
  }
}
