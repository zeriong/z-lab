// 물리 통합: Matter.js 수동 틱(고정 dt), 충격량 누적 파괴, settle 감지.
// 엔진은 스테이지 로드마다 새로 생성·해체해 리스너/바디 잔존을 원천 차단한다(A1 검증 대비).

import {
  DAMAGE_FACTOR, MIN_DAMAGE_SPEED, STATIC_IMPACT_MASS,
  SETTLE_SPEED, SETTLE_ANGULAR, SETTLE_TICKS,
} from './constants.js';

const { Engine, Events, Composite } = Matter;

export function createPhysicsWorld() {
  const engine = Engine.create({ enableSleeping: true });
  engine.gravity.y = 1;

  const ph = {
    engine,
    settleTicks: 0,
    toRemove: new Set(),
  };

  Events.on(engine, 'collisionStart', (ev) => {
    for (const pair of ev.pairs) applyImpact(ph, pair);
  });

  return ph;
}

export function destroyPhysicsWorld(ph) {
  if (!ph) return;
  Events.off(ph.engine); // 모든 리스너 해제
  Matter.World.clear(ph.engine.world, false);
  Engine.clear(ph.engine);
}

function applyImpact(ph, pair) {
  const { bodyA, bodyB } = pair;
  const rel = Math.hypot(
    bodyA.velocity.x - bodyB.velocity.x,
    bodyA.velocity.y - bodyB.velocity.y
  );
  if (rel < MIN_DAMAGE_SPEED) return;
  damage(ph, bodyA, rel, bodyB);
  damage(ph, bodyB, rel, bodyA);
}

function damage(ph, body, relSpeed, other) {
  if (!body.plugin || body.plugin.hp == null) return;
  const otherMass = other.isStatic ? STATIC_IMPACT_MASS : Math.min(other.mass, 10);
  const dmg = (relSpeed - MIN_DAMAGE_SPEED) * DAMAGE_FACTOR * (otherMass * 0.5 + 0.5);
  body.plugin.hp -= dmg;
  if (body.plugin.hp <= 0) ph.toRemove.add(body);
}

// 파괴 예약된 바디를 실제 제거. 콜리전 콜백 내 제거는 위험하므로 틱 끝에서 일괄 처리.
export function flushRemovals(ph) {
  for (const b of ph.toRemove) {
    Composite.remove(ph.engine.world, b);
  }
  ph.toRemove.clear();
}

export function stepPhysics(ph, dt) {
  Engine.update(ph.engine, dt);
}

// settle: 모든 동적 바디가 속도·각속도 임계 이하를 SETTLE_TICKS 동안 유지.
export function isSettled(ph) {
  const bodies = Composite.allBodies(ph.engine.world);
  let calm = true;
  for (const b of bodies) {
    if (b.isStatic || b.isSleeping) continue;
    if (b.speed > SETTLE_SPEED || b.angularSpeed > SETTLE_ANGULAR) {
      calm = false;
      break;
    }
  }
  ph.settleTicks = calm ? ph.settleTicks + 1 : 0;
  return ph.settleTicks >= SETTLE_TICKS;
}

export function countKind(ph, kind) {
  return Composite.allBodies(ph.engine.world)
    .filter((b) => b.plugin && b.plugin.kind === kind).length;
}

export function bodyCount(ph) {
  return Composite.allBodies(ph.engine.world).length;
}
