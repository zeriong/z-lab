import Matter from 'matter-js';
import { PhysicsAdapter } from '../engine/physicsAdapter';
import { LoadedStage } from '../stages/loadStage';
import { MATERIAL_THRESHOLDS, PIG_IMPACT_THRESHOLD } from '../stages/materials';
import { MaterialType } from '../types/stage';

export interface CollisionOutcome {
  destroyedDestructibleIds: string[];
  removedPigIds: string[];
}

interface ParsedLabel {
  kind: 'destructible' | 'pig' | 'ground' | 'projectile' | 'unknown';
  material?: MaterialType;
  id?: string;
}

function parseLabel(label: string): ParsedLabel {
  if (label.startsWith('destructible:')) {
    const [, material, id] = label.split(':');
    return { kind: 'destructible', material: material as MaterialType, id };
  }
  if (label.startsWith('pig:')) {
    const [, id] = label.split(':');
    return { kind: 'pig', id };
  }
  if (label === 'ground') return { kind: 'ground' };
  if (label === 'projectile') return { kind: 'projectile' };
  return { kind: 'unknown' };
}

/**
 * 스텝 5 — 충돌/파괴/제거 규칙. collisionStart를 body 라벨(destructible/pig)별로 분기한다.
 * 로드베어링 hop4: 충돌 라벨이 destructible/pig 태그를 가지고 충격량이 material.threshold를
 * 초과하면 파괴/제거를 실행한다.
 */
export function registerCollisionRules(
  adapter: PhysicsAdapter,
  loaded: LoadedStage,
  onOutcome: (outcome: CollisionOutcome) => void
): void {
  adapter.onCollisionStart((pairs) => {
    const destroyedDestructibleIds: string[] = [];
    const removedPigIds: string[] = [];

    pairs.forEach(({ bodyA, bodyB, collision }) => {
      const a = parseLabel(bodyA.label);
      const b = parseLabel(bodyB.label);
      const impulse = Matter.Vector.magnitude(collision.penetration ?? { x: 0, y: 0 });

      [
        { info: a, body: bodyA },
        { info: b, body: bodyB },
      ].forEach(({ info, body }) => {
        if (info.kind === 'destructible' && info.material && info.id) {
          const threshold = MATERIAL_THRESHOLDS[info.material];
          if (impulse > threshold) {
            adapter.removeBody(body);
            loaded.destructibles = loaded.destructibles.filter((d) => d.id !== body.id);
            destroyedDestructibleIds.push(info.id);
          }
        }
        if (info.kind === 'pig' && info.id) {
          if (impulse > PIG_IMPACT_THRESHOLD) {
            adapter.removeBody(body);
            loaded.pigs = loaded.pigs.filter((p) => p.id !== body.id);
            removedPigIds.push(info.id);
          }
        }
      });
    });

    if (destroyedDestructibleIds.length > 0 || removedPigIds.length > 0) {
      onOutcome({ destroyedDestructibleIds, removedPigIds });
    }
  });
}
