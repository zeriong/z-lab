// EntityRegistry: body.id → { kind, material|pigType, hp, maxHp } (§4.9)
import type { Body } from 'matter-js';
import type { Entity } from '../types';

export interface EntityRecord {
  body: Body;
  entity: Entity;
}

export class EntityRegistry {
  private readonly records = new Map<number, EntityRecord>();

  add(body: Body, entity: Entity): void {
    this.records.set(body.id, { body, entity });
  }

  get(id: number): Entity | undefined {
    return this.records.get(id)?.entity;
  }

  getBody(id: number): Body | undefined {
    return this.records.get(id)?.body;
  }

  has(id: number): boolean {
    return this.records.has(id);
  }

  delete(id: number): boolean {
    return this.records.delete(id);
  }

  clear(): void {
    this.records.clear();
  }

  get size(): number {
    return this.records.size;
  }

  values(): IterableIterator<EntityRecord> {
    return this.records.values();
  }

  /** 스냅샷 배열 (순회 중 삭제에 안전) */
  list(): EntityRecord[] {
    return Array.from(this.records.values());
  }

  count(kind: Entity['kind']): number {
    let n = 0;
    for (const r of this.records.values()) if (r.entity.kind === kind) n++;
    return n;
  }
}

/** 부술 수 있는 엔티티인가 (블록·돼지) */
export function isDamageable(e: Entity | undefined): e is Extract<Entity, { hp: number }> {
  return !!e && (e.kind === 'block' || e.kind === 'pig');
}
