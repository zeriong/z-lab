import type { BirdKind, ExplosionSource, Material, PigSize } from '../config/catalog';
import type { TurnState } from './rules/turn';

/** GameSession이 내보내는 이벤트 (§3.1). 렌더러와 UI는 구독하거나 상태를 읽기만 한다. */
export interface SessionEventMap {
  pigKilled: { id: number; x: number; y: number; size: PigSize; reason: 'damage' | 'outOfBounds' | 'test' };
  blockDestroyed: { id: number; x: number; y: number; material: Material | 'tnt'; w: number; h: number };
  scoreChanged: { score: number; delta: number; x: number; y: number };
  turnChanged: { from: TurnState; to: TurnState };
  cleared: { score: number; stars: number; birdsLeft: number };
  failed: { score: number; pigsLeft: number };
  explosion: { x: number; y: number; radius: number; source: ExplosionSource };
  birdLaunched: { kind: BirdKind; x: number; y: number };
  birdRemoved: { x: number; y: number };
  abilityUsed: { kind: BirdKind; x: number; y: number };
}

type AnyListener = (payload: unknown) => void;

/** 아주 작은 타입 안전 이벤트 버스. destroy 시 clear()로 구독을 전부 끊는다. */
export class Emitter<M extends object> {
  private readonly map = new Map<keyof M, Set<AnyListener>>();

  on<K extends keyof M>(type: K, fn: (payload: M[K]) => void): () => void {
    let set = this.map.get(type);
    if (!set) {
      set = new Set();
      this.map.set(type, set);
    }
    set.add(fn as AnyListener);
    return () => this.off(type, fn);
  }

  off<K extends keyof M>(type: K, fn: (payload: M[K]) => void): void {
    const set = this.map.get(type);
    if (!set) return;
    set.delete(fn as AnyListener);
    if (set.size === 0) this.map.delete(type);
  }

  emit<K extends keyof M>(type: K, payload: M[K]): void {
    const set = this.map.get(type);
    if (!set) return;
    for (const fn of [...set]) fn(payload);
  }

  listenerCount(): number {
    let n = 0;
    for (const set of this.map.values()) n += set.size;
    return n;
  }

  clear(): void {
    this.map.clear();
  }
}
