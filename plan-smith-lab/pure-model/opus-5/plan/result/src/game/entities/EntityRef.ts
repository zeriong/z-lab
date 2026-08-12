import type { Bird } from './Bird';
import type { Block } from './Block';
import type { Pig } from './Pig';

/**
 * What a physics body belongs to. Stored in `BodyHandle.userData` so a
 * collision can be routed back to gameplay without a lookup table.
 */
export type EntityRef =
  | { kind: 'block'; block: Block }
  | { kind: 'pig'; pig: Pig }
  | { kind: 'bird'; bird: Bird }
  | { kind: 'ground' };

export function asEntityRef(value: unknown): EntityRef | null {
  if (!value || typeof value !== 'object') return null;
  const kind = (value as { kind?: unknown }).kind;
  if (kind === 'block' || kind === 'pig' || kind === 'bird' || kind === 'ground') {
    return value as EntityRef;
  }
  return null;
}
