import { BIRDS, type BirdType } from '../data/materials';
import type { BodyRef } from '../physics/World';

/** 발사체. §9에 따라 특수 능력 없는 1종만. */
export class Bird {
  ref: BodyRef | null = null;
  launched = false;
  /** 월드에서 제거됐는지 */
  retired = false;

  constructor(readonly type: BirdType = 'basic') {}

  get def() {
    return BIRDS[this.type];
  }

  get r(): number {
    return this.def.r;
  }
}
