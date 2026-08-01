import { MATERIALS, blockHp, type MaterialName } from '../data/materials';
import type { BodyRef } from '../physics/World';

/** 구조물 블록 (플랜 §5 충돌·파괴). */
export class Block {
  readonly maxHp: number;
  hp: number;
  alive = true;

  constructor(
    readonly ref: BodyRef,
    readonly material: MaterialName,
    readonly w: number,
    readonly h: number,
  ) {
    this.maxHp = blockHp(material, w, h);
    this.hp = this.maxHp;
  }

  get def() {
    return MATERIALS[this.material];
  }

  /** hp -= max(0, impact - breakThreshold). 파괴되면 true */
  damage(impulse: number): boolean {
    if (!this.alive) return false;
    const dmg = Math.max(0, impulse - this.def.breakThreshold);
    if (dmg <= 0) return false;
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  get healthRatio(): number {
    return Math.max(0, Math.min(1, this.hp / this.maxHp));
  }
}
