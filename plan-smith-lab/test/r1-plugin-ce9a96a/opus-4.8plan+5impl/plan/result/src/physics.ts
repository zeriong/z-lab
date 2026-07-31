import Matter from 'matter-js';
import {
  BIRD_DENSITY,
  BIRD_FRICTION,
  BIRD_FRICTION_AIR,
  BIRD_RADIUS,
  BIRD_RESTITUTION,
  GRAVITY_SCALE,
  GRAVITY_Y,
  GROUND_Y,
  IMPACT_MASS_CAP,
  LOGICAL_H,
  LOGICAL_W,
  MATERIALS,
  MIN_IMPACT_SPEED,
  PIG_DAMAGE_THRESHOLD,
  PIG_DENSITY,
  PIG_HP,
  SCORE_PIG,
  STATIC_MASS_PROXY,
} from './constants';
import type { BlockDef, GameBody, GameData, PigDef } from './types';

const { Bodies, Body, Composite, Engine, Events, Vector } = Matter;

export function createEngine(): Matter.Engine {
  const engine = Engine.create({ enableSleeping: true });
  engine.gravity.y = GRAVITY_Y;
  engine.gravity.scale = GRAVITY_SCALE;
  // 스택 안정성: 반복 횟수를 살짝 올려 지터를 줄인다.
  engine.positionIterations = 8;
  engine.velocityIterations = 6;
  return engine;
}

function setGameData(body: Matter.Body, data: GameData): GameBody {
  const b = body as GameBody;
  b.plugin = { ...(b.plugin ?? {}), game: data };
  return b;
}

export function getGameData(body: Matter.Body): GameData | undefined {
  return (body as GameBody).plugin?.game;
}

/* ------------------------------------------------------------------ *
 * 바디 팩토리
 * ------------------------------------------------------------------ */

export function createGround(): GameBody {
  const h = LOGICAL_H - GROUND_Y + 200;
  const body = Bodies.rectangle(LOGICAL_W / 2, GROUND_Y + h / 2, LOGICAL_W * 3, h, {
    isStatic: true,
    friction: 0.9,
    label: 'ground',
  });
  return setGameData(body, {
    gameType: 'ground',
    hp: Infinity,
    maxHp: Infinity,
    damageThreshold: Infinity,
    score: 0,
    color: '#6b4a2a',
  });
}

/** 왼쪽 벽 — 새가 뒤로 튕겨 화면 밖으로 굴러가는 것을 막는다. */
export function createLeftWall(): Matter.Body {
  return Bodies.rectangle(-40, LOGICAL_H / 2, 80, LOGICAL_H * 3, {
    isStatic: true,
    label: 'wall',
  });
}

export function createBlock(def: BlockDef): GameBody {
  const spec = MATERIALS[def.material];
  const body = Bodies.rectangle(def.x, def.y, def.w, def.h, {
    angle: def.angle ?? 0,
    density: spec.density,
    friction: spec.friction,
    frictionStatic: spec.friction + 0.2,
    restitution: spec.restitution,
    label: `block:${def.material}`,
    slop: 0.03,
  });
  // 큰 블록은 조금 더 튼튼하게 (면적 기준 0.7~1.6배)
  const hpScale = Math.max(0.7, Math.min(1.6, (def.w * def.h) / 2600));
  const hp = Math.round(spec.hp * hpScale);
  return setGameData(body, {
    gameType: 'block',
    hp,
    maxHp: hp,
    material: def.material,
    damageThreshold: spec.damageThreshold,
    score: spec.score,
    color: spec.fill,
  });
}

export function createPig(def: PigDef): GameBody {
  const body = Bodies.circle(def.x, def.y, def.r, {
    density: PIG_DENSITY,
    friction: 0.4,
    frictionStatic: 0.6,
    restitution: 0.12,
    label: 'pig',
    slop: 0.03,
  });
  const hp = def.hp ?? PIG_HP;
  return setGameData(body, {
    gameType: 'pig',
    hp,
    maxHp: hp,
    damageThreshold: PIG_DAMAGE_THRESHOLD,
    score: SCORE_PIG,
    color: '#7ec850',
  });
}

export function createBird(x: number, y: number): GameBody {
  const body = Bodies.circle(x, y, BIRD_RADIUS, {
    density: BIRD_DENSITY,
    friction: BIRD_FRICTION,
    frictionAir: BIRD_FRICTION_AIR,
    restitution: BIRD_RESTITUTION,
    label: 'bird',
    isStatic: true, // 장전 상태에서는 정적, 발사 순간 해제
  });
  return setGameData(body, {
    gameType: 'bird',
    hp: Infinity,
    maxHp: Infinity,
    damageThreshold: Infinity,
    score: 0,
    color: '#e8452f',
  });
}

/* ------------------------------------------------------------------ *
 * 충돌 → 데미지
 *
 * 주의: 이 핸들러 안에서 절대 월드를 변경하지 않는다 (Matter 반복자 손상).
 * 파괴 대상은 콜백으로 넘기고, 호출자가 Engine.update 이후에 제거한다.
 * ------------------------------------------------------------------ */

export interface DamageSink {
  /** hp가 0 이하가 된 바디 (아직 월드에 남아 있음) */
  onDestroyed(body: GameBody, data: GameData): void;
  /** hp가 깎였으나 살아남음 */
  onDamaged(body: GameBody, data: GameData, impact: number, at: Matter.Vector): void;
  /** 데미지와 무관한 유효 충격 (사운드/먼지용) */
  onImpact(impact: number, at: Matter.Vector): void;
}

function effectiveMass(body: Matter.Body): number {
  if (body.isStatic || !Number.isFinite(body.mass)) return STATIC_MASS_PROXY;
  return Math.min(body.mass, IMPACT_MASS_CAP);
}

type PairWithCollision = Matter.Pair & {
  collision?: { supports?: Matter.Vector[] };
};

/** 엔진 생애 동안 단 한 번만 호출한다 (스테이지 전환 시 재등록 금지). */
export function attachCollisionDamage(engine: Matter.Engine, sink: DamageSink): void {
  Events.on(engine, 'collisionStart', (event) => {
    for (const rawPair of event.pairs) {
      const pair = rawPair as PairWithCollision;
      const a = pair.bodyA;
      const b = pair.bodyB;
      const rel = Vector.magnitude(Vector.sub(a.velocity, b.velocity));
      if (rel < MIN_IMPACT_SPEED) continue;

      const support = pair.collision?.supports?.[0];
      const at = support ?? Vector.mult(Vector.add(a.position, b.position), 0.5);
      sink.onImpact(rel, at);

      applyDamage(a, b, rel, at, sink);
      applyDamage(b, a, rel, at, sink);
    }
  });
}

function applyDamage(
  target: Matter.Body,
  other: Matter.Body,
  rel: number,
  at: Matter.Vector,
  sink: DamageSink,
): void {
  const data = getGameData(target);
  if (!data || data.dead) return;
  if (data.gameType !== 'pig' && data.gameType !== 'block') return;

  const impact = rel * effectiveMass(other);
  if (impact <= data.damageThreshold) return;

  data.hp -= impact - data.damageThreshold;
  if (data.hp <= 0) {
    data.dead = true;
    sink.onDestroyed(target as GameBody, data);
  } else {
    sink.onDamaged(target as GameBody, data, impact, at);
  }
}

/* ------------------------------------------------------------------ *
 * 월드 유틸
 * ------------------------------------------------------------------ */

export function removeBody(engine: Matter.Engine, body: Matter.Body): void {
  Composite.remove(engine.world, body, true);
}

export function clearWorld(engine: Matter.Engine): void {
  // keepStatic=false: 정적 바디까지 제거한다. 엔진 이벤트 리스너는 유지된다.
  Composite.clear(engine.world, false, true);
}

export function addBodies(engine: Matter.Engine, bodies: Matter.Body[]): void {
  Composite.add(engine.world, bodies);
}

/** 장전된 새를 발사한다. */
export function launchBird(bird: Matter.Body, velocity: Matter.Vector): void {
  Body.setStatic(bird, false);
  Matter.Sleeping.set(bird, false);
  Body.setAngularVelocity(bird, velocity.x * 0.02);
  Body.setVelocity(bird, velocity);
}

/** 장전 위치로 새를 옮긴다(정적 상태 유지). */
export function placeBird(bird: Matter.Body, x: number, y: number): void {
  Body.setPosition(bird, { x, y });
  Body.setVelocity(bird, { x: 0, y: 0 });
  Body.setAngle(bird, 0);
  Body.setAngularVelocity(bird, 0);
}

/** 비정적 바디 중 최대 속도 (px/step) */
export function maxDynamicSpeed(engine: Matter.Engine): number {
  let max = 0;
  for (const body of Composite.allBodies(engine.world)) {
    if (body.isStatic || body.isSleeping) continue;
    const s = Vector.magnitude(body.velocity);
    if (s > max) max = s;
  }
  return max;
}
