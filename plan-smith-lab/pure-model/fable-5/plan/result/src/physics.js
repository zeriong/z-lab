// Matter 래핑 — 엔진 생성, 바디 팩토리(새/돼지/블록/지면/발판), 좌표·물리 상수 (§1.1, §2.2).
// 물리 좌표 = 논리 좌표 1:1 (§1.2).

import { MATERIALS, PIG_SPEC } from './entities.js';

const { Engine, Bodies } = window.Matter;

export const WIDTH = 1280;
export const HEIGHT = 720;
export const GROUND_TOP = 680; // 지면 상단 y — 전 스테이지 공통 (§4.1)
export const FIXED_DT = 1000 / 60; // 고정 타임스텝 (§2.3)

// Matter 기본 중력(y=1, scale=0.001)이 1틱당 속도에 더하는 양(px/tick).
// 궤적 예측(§3.3)이 같은 수치를 공유한다.
export const GRAVITY_PER_TICK = 0.001 * FIXED_DT * FIXED_DT; // ≈ 0.278

export const BIRD_RADIUS = 20;

export function createEngine() {
  const engine = Engine.create();
  // 고속 발사체 터널링 대응 — iteration 상향 (§1.1 주의점)
  engine.positionIterations = 10;
  engine.velocityIterations = 8;
  return engine;
}

export function createGround() {
  const h = HEIGHT - GROUND_TOP + 200; // 두껍게 — 터널링 시에도 빠져나가지 않도록
  const body = Bodies.rectangle(WIDTH / 2, GROUND_TOP + h / 2, WIDTH + 400, h, {
    isStatic: true,
    friction: 0.9,
  });
  body.gameData = { kind: 'ground' };
  return body;
}

export function createStaticBlock({ x, y, w, h }) {
  const body = Bodies.rectangle(x, y, w, h, { isStatic: true, friction: 0.9 });
  body.gameData = { kind: 'static', w, h };
  return body;
}

export function createBlock({ x, y, w, h, material, angle = 0 }) {
  const spec = MATERIALS[material];
  const body = Bodies.rectangle(x, y, w, h, {
    density: spec.density,
    friction: 0.6,
    restitution: 0.05,
    angle,
  });
  body.gameData = { kind: 'block', material, w, h, hp: spec.hp, maxHp: spec.hp };
  return body;
}

export function createPig({ x, y, size = 20 }) {
  const body = Bodies.circle(x, y, size, {
    density: PIG_SPEC.density,
    friction: 0.5,
    restitution: 0.2,
  });
  body.gameData = { kind: 'pig', hp: PIG_SPEC.hp, maxHp: PIG_SPEC.hp };
  return body;
}

// 새는 장전 시 static으로 생성 — 발사 순간 setStatic(false) + setVelocity (§3.2).
// frictionAir 0: 공기저항 0 근사로 궤적 예측과 실탄을 일치시킨다 (§3.3).
export function createBird(x, y) {
  const body = Bodies.circle(x, y, BIRD_RADIUS, {
    density: 0.005,
    friction: 0.6,
    frictionAir: 0,
    restitution: 0.4,
    isStatic: true,
  });
  body.gameData = { kind: 'bird' };
  return body;
}
