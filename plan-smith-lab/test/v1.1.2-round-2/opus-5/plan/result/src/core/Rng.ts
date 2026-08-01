/**
 * 시드 난수 (플랜 R3).
 * 난수는 파티클 등 "시각 요소"에만 쓴다 — 물리/판정은 결정적으로 유지.
 */
export class Rng {
  private s: number;

  constructor(seed = 0x5eed1234) {
    this.s = seed >>> 0;
  }

  /** mulberry32 */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length) % arr.length];
  }

  reseed(seed: number): void {
    this.s = seed >>> 0;
  }
}
