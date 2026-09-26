import { BIRDS } from '../../config/catalog';
import type { BirdKind } from '../../config/catalog';
import type { Vec } from '../math';
import type { PhysBody, PhysicsWorld } from '../physics/world';

/** 새. 발사 순간에만 바디를 만든다(§5.1: setStatic 토글로 인한 질량 복원 문제 회피). */
export interface Bird {
  id: number;
  kind: BirdKind;
  radius: number;
  body: PhysBody | null;
  launchedAt: number;
  launchStep: number;
  abilityUsed: boolean;
  /** 첫 충돌 시각(simTime). 폭탄 새 자동 폭발 기준 */
  firstContactAt: number | null;
  /** 속도가 BIRD_DONE_SPEED 미만이 된 시각 */
  slowSince: number | null;
  done: boolean;
}

export function createBird(id: number, kind: BirdKind): Bird {
  return {
    id,
    kind,
    radius: BIRDS[kind].radius,
    body: null,
    launchedAt: 0,
    launchStep: 0,
    abilityUsed: false,
    firstContactAt: null,
    slowSince: null,
    done: false,
  };
}

/** pos: px, vel: m/s. 모든 새는 bullet=true(CCD), linearDamping=0 */
export function spawnBirdBody(physics: PhysicsWorld, bird: Bird, pos: Vec, vel: Vec): void {
  const spec = BIRDS[bird.kind];
  const body = physics.createDynamicCircle(pos.x, pos.y, spec.radius, { role: 'bird', id: bird.id }, spec, {
    bullet: true,
    linearDamping: 0,
    angularDamping: 0.3,
  });
  physics.setLinearVelocity(body, vel);
  bird.body = body;
}
