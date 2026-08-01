import { PIGS, type PigSize } from '../data/materials';
import type { BodyRef } from '../physics/World';

/** 목표(돼지). 임팩트 누적 또는 화면 하단 낙하로 제거 (플랜 §5). */
export class Pig {
  readonly maxHp: number;
  hp: number;
  alive = true;

  constructor(
    readonly ref: BodyRef,
    readonly size: PigSize,
  ) {
    this.maxHp = PIGS[size].hp;
    this.hp = this.maxHp;
  }

  get def() {
    return PIGS[this.size];
  }

  get r(): number {
    return this.def.r;
  }

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

  kill(): void {
    this.hp = 0;
    this.alive = false;
  }

  get healthRatio(): number {
    return Math.max(0, Math.min(1, this.hp / this.maxHp));
  }
}
