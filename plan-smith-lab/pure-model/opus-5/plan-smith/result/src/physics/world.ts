/**
 * 엔진 생성/파기 (§4, §11).
 *
 * Matter는 **충돌 검출과 적분만** 산 것이다. 데미지·HP·파괴·폭발은
 * game/damage.ts + game/materials.ts 소유이며 이 파일은 그 규칙을 모른다.
 */

import { Engine, Composite, Events } from 'matter-js';
import { STEP_MS } from './loop';

/** Matter가 힘을 적분할 때 쓰는 기본 gravity.scale */
export const GRAVITY_SCALE = 0.001;

/**
 * 한 고정 스텝당 속도에 더해지는 중력(px/step).
 *
 * 파생: Matter는 body.force.y = mass * gravity.y * gravity.scale 을 넣고
 * 적분에서 acceleration * dt^2 를 속도에 더한다 →
 *   g_step = gravity.y * 0.001 * (1000/60)^2 ≒ 0.2778 (gravity.y = 1일 때)
 *
 * 궤적 예측(R6)과 리플레이 발사 해법(tests/replay)이 같은 값을 써야 하므로
 * 상수를 두 곳에 적지 않고 여기서만 계산한다.
 */
export function gravityPerStep(gravityY: number): number {
  return gravityY * GRAVITY_SCALE * STEP_MS * STEP_MS;
}

export interface PhysicsHandle {
  engine: Engine;
  world: Composite;
  gravityY: number;
}

export function createPhysics(gravityY = 1): PhysicsHandle {
  const engine = Engine.create({
    // position 8 / velocity 6: Matter 기본(6/4)보다 한 단계 위.
    // 스택이 높은 스테이지 6·9·10에서 블록이 서로 파고드는 것을 줄인다.
    // A1(80바디 8ms)이 틀리면 여기부터 기본값으로 되돌린다.
    positionIterations: 8,
    velocityIterations: 6,
    constraintIterations: 2,
    enableSleeping: true, // §12 완화책: 잔해가 잠들면 프레임 예산이 돌아온다
  });

  engine.gravity.x = 0;
  engine.gravity.y = gravityY;
  engine.gravity.scale = GRAVITY_SCALE;

  return { engine, world: engine.world, gravityY };
}

/**
 * 월드 전체 해제. 스테이지 전환 누수(R32)의 마지막 방어선.
 * 리스너 해제는 호출자(GameScene.unmount)가 자기가 등록한 것만 정확히 끄고,
 * 여기서는 남은 전부를 쓸어낸다.
 */
export function destroyPhysics(handle: PhysicsHandle | null): void {
  if (!handle) return;
  Composite.clear(handle.world, false, true);
  Engine.clear(handle.engine);
  // Matter는 events를 객체에 그대로 물고 있으므로 명시적으로 비운다.
  // (eventNames/callback 미지정 = 전부 해제)
  const off = Events.off as unknown as (obj: unknown, names?: string, cb?: unknown) => void;
  off(handle.engine);
}

/** 진단용 — 현재 월드에 남아 있는 바디 수 (R32 검증에 쓴다) */
export function bodyCount(handle: PhysicsHandle): number {
  return Composite.allBodies(handle.world).length;
}

/** 진단용 — engine에 등록된 이벤트 핸들러 총 개수 (§13-5c 검증에 쓴다) */
export function listenerCount(engine: Engine): number {
  const events = (engine as unknown as { events?: Record<string, unknown[]> }).events;
  if (!events) return 0;
  return Object.keys(events).reduce((sum, key) => {
    const handlers = events[key];
    return sum + (Array.isArray(handlers) ? handlers.length : 0);
  }, 0);
}
