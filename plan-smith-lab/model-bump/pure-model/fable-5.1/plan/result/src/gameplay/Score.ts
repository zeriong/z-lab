/**
 * 점수·별 계산 (§6.5).
 * 점수 = Σ파괴 점수 + 돼지 5000/마리 + 클리어 시 남은 새 × 10000.
 */
import type { Entity } from '../entities/Entity';
import { BIRD, MATERIALS, PIG } from '../physics/Materials';

export type Stars = 0 | 1 | 2 | 3;

export function destroyScore(e: Entity): number {
  if (e.kind === 'pig') return PIG.score;
  if (e.kind === 'block' && e.material) return MATERIALS[e.material].score;
  return 0;
}

export function unusedBirdBonus(birdsLeft: number): number {
  return Math.max(0, birdsLeft) * BIRD.unusedScore;
}

export function starsFor(
  score: number,
  thresholds: { star2: number; star3: number },
  cleared: boolean,
): Stars {
  if (!cleared) return 0;
  if (score >= thresholds.star3) return 3;
  if (score >= thresholds.star2) return 2;
  return 1;
}

export class Score {
  value = 0;
  /** HUD 가 "+5000" 같은 팝업을 띄우기 위한 최근 가산 목록 */
  private listeners = new Set<(delta: number, total: number) => void>();

  add(delta: number): number {
    if (delta === 0) return this.value;
    this.value += delta;
    for (const l of this.listeners) l(delta, this.value);
    return this.value;
  }

  reset(): void {
    this.value = 0;
    for (const l of this.listeners) l(0, 0);
  }

  onChange(fn: (delta: number, total: number) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}
