// 새 4종의 비행 추적과 능력 (§4.7)
import Matter from 'matter-js';
import type { Body } from 'matter-js';
import {
  BIRD_MAX_STEPS,
  BIRD_POST_HIT_AIR,
  BIRD_REST_STEPS,
  BIRDS,
  BLACK_FUSE_STEPS,
  BLAST_DAMAGE,
  BLAST_PUSH,
  BLAST_RADIUS,
  BLAST_STONE_MUL,
  BLUE_SPLIT_DEG,
  BLUE_SPLIT_RADIUS,
  MAX_SPEED,
  OUT_MAX_X,
  OUT_MAX_Y,
  OUT_MIN_X,
  REST_SPEED,
  TRAIL_EVERY,
  YELLOW_BOOST,
} from '../config';
import type { BirdType, Vec2 } from '../types';
import { createBirdBody } from '../physics/world-factory';
import type { StageSession } from '../physics/session';
import { applyDamage } from '../physics/damage';

const { Body: MBody, Composite } = Matter;

export interface FlightPart {
  body: Body;
  restSteps: number;
  ended: boolean;
}

export interface Flight {
  type: BirdType;
  parts: FlightPart[];
  /** 발사 후 완료된 물리 스텝 수 */
  steps: number;
  abilityUsed: boolean;
  /** 첫 충돌이 일어난 flight.steps (검정 도화선) */
  firstHitStep: number | null;
  exploded: boolean;
}

export function createFlight(type: BirdType, body: Body): Flight {
  return {
    type,
    parts: [{ body, restSteps: 0, ended: false }],
    steps: 0,
    abilityUsed: false,
    firstHitStep: null,
    exploded: false,
  };
}

export function isFlightOver(f: Flight): boolean {
  return f.parts.every((p) => p.ended);
}

export function speedOf(b: Body): number {
  return Math.hypot(b.velocity.x, b.velocity.y);
}

/** 속도 상한 40 (§4.5) — 모든 새, 능력 발동 후 포함 */
export function clampBirdSpeed(b: Body): void {
  const s = speedOf(b);
  if (s > MAX_SPEED) {
    const k = MAX_SPEED / s;
    MBody.setVelocity(b, { x: b.velocity.x * k, y: b.velocity.y * k });
  }
}

function isOut(p: Vec2): boolean {
  return p.x < OUT_MIN_X || p.x > OUT_MAX_X || p.y > OUT_MAX_Y;
}

/** 새 조각 하나를 끝낸다 (연기와 함께 제거). 충돌 핸들러 밖에서만 호출된다 */
function endPart(session: StageSession, part: FlightPart, smoke = true): void {
  if (part.ended) return;
  part.ended = true;
  const { x, y } = part.body.position;
  Composite.remove(session.engine.world, part.body);
  session.registry.delete(part.body.id);
  if (smoke && !isOut(part.body.position)) session.effects.smoke(x, y, '#dddddd', 6);
}

/** 충돌 핸들러에서 호출: 첫 충돌 기록 + 구르기 방지용 공기 저항 (충돌 전 궤적에는 영향 없음) */
export function onBirdCollision(session: StageSession, body: Body): void {
  const f = session.flight;
  if (!f) return;
  if (!f.parts.some((p) => p.body === body)) return;
  if (f.firstHitStep === null) f.firstHitStep = f.steps;
  body.frictionAir = BIRD_POST_HIT_AIR;
}

/** Engine.update 직후 매 스텝 호출 */
export function updateFlight(session: StageSession): void {
  const f = session.flight;
  if (!f) return;
  f.steps++;
  // 첫 충돌 뒤 아직 터지지 않은 검정은 멈춰 있어도 도화선이 다 탈 때까지 남는다
  const blackArmed = f.type === 'black' && !f.exploded && f.firstHitStep !== null;

  for (const part of f.parts) {
    if (part.ended) continue;
    const b = part.body;
    clampBirdSpeed(b);
    if (isOut(b.position)) {
      endPart(session, part, false);
      continue;
    }
    if (speedOf(b) < REST_SPEED) part.restSteps++;
    else part.restSteps = 0;
    const timeUp = f.steps >= BIRD_MAX_STEPS;
    if (blackArmed) {
      if (timeUp) explode(session, f, part);
      continue;
    }
    if (part.restSteps >= BIRD_REST_STEPS || timeUp) endPart(session, part);
  }

  // 검정: 첫 충돌 후 90스텝이 지나면 자동 폭발
  if (f.type === 'black' && !f.exploded && f.firstHitStep !== null && f.steps - f.firstHitStep >= BLACK_FUSE_STEPS) {
    const part = f.parts.find((p) => !p.ended);
    if (part) explode(session, f, part);
  }

  // 직전 궤적 기록 (4스텝마다, 첫 충돌 전 구간)
  if (f.steps % TRAIL_EVERY === 0 && f.firstHitStep === null) {
    const lead = f.parts.find((p) => !p.ended);
    if (lead) session.trail.push({ x: lead.body.position.x, y: lead.body.position.y });
  }
}

/** 비행 중 탭. phase === FLYING이고 능력을 아직 안 썼을 때만. 발동하면 true */
export function activateAbility(session: StageSession): boolean {
  const f = session.flight;
  if (!f || session.phase !== 'FLYING' || f.abilityUsed) return false;
  const part = f.parts.find((p) => !p.ended);
  if (!part) return false;

  switch (f.type) {
    case 'red':
      return false;
    case 'blue':
      f.abilityUsed = true;
      splitBlue(session, f, part);
      return true;
    case 'yellow':
      f.abilityUsed = true;
      boostYellow(part.body);
      return true;
    case 'black':
      f.abilityUsed = true;
      explode(session, f, part);
      return true;
  }
}

/** 파랑: 반지름 12인 새 셋으로 교체. 방향 0°, ±12°, 속도 크기 유지 */
function splitBlue(session: StageSession, f: Flight, part: FlightPart): void {
  const src = part.body;
  const { x, y } = src.position;
  const vx = src.velocity.x;
  const vy = src.velocity.y;
  const speed = Math.hypot(vx, vy);
  const base = Math.atan2(vy, vx);
  const frictionAir = src.frictionAir;
  endPart(session, part, false);
  const perp = { x: -Math.sin(base), y: Math.cos(base) };
  for (const deg of [0, -BLUE_SPLIT_DEG, BLUE_SPLIT_DEG]) {
    const a = base + (deg * Math.PI) / 180;
    const off = deg === 0 ? 0 : Math.sign(deg) * (BLUE_SPLIT_RADIUS + 1);
    const b = createBirdBody('blue', x + perp.x * off, y + perp.y * off, BLUE_SPLIT_RADIUS);
    b.frictionAir = frictionAir;
    Composite.add(session.engine.world, b);
    MBody.setVelocity(b, { x: Math.cos(a) * speed, y: Math.sin(a) * speed });
    clampBirdSpeed(b);
    session.registry.add(b, { kind: 'bird', birdType: 'blue' });
    f.parts.push({ body: b, restSteps: 0, ended: false });
  }
}

/** 노랑: 현재 방향으로 속도 ×2, 상한 40 */
function boostYellow(b: Body): void {
  MBody.setVelocity(b, { x: b.velocity.x * YELLOW_BOOST, y: b.velocity.y * YELLOW_BOOST });
  clampBirdSpeed(b);
}

/**
 * 검정: 반경 140 안의 바디를 바깥으로 12×(1−d/140) 밀어내고
 * 데미지 30×(1−d/140)×배율(돌 ×1.5)을 준다. 화면 흔들림.
 */
export function explode(session: StageSession, f: Flight, part: FlightPart): void {
  if (f.exploded) return;
  f.exploded = true;
  f.abilityUsed = true;
  const c = { x: part.body.position.x, y: part.body.position.y };
  endPart(session, part, false);

  for (const rec of session.registry.list()) {
    const b = rec.body;
    if (b.isStatic || rec.entity.kind === 'bird') continue;
    const dx = b.position.x - c.x;
    const dy = b.position.y - c.y;
    const d = Math.hypot(dx, dy);
    if (d >= BLAST_RADIUS) continue;
    const k = 1 - d / BLAST_RADIUS;
    const nx = d > 1e-6 ? dx / d : 0;
    const ny = d > 1e-6 ? dy / d : -1;
    MBody.setVelocity(b, { x: b.velocity.x + nx * BLAST_PUSH * k, y: b.velocity.y + ny * BLAST_PUSH * k });
    const mul = rec.entity.kind === 'block' && rec.entity.material === 'stone' ? BLAST_STONE_MUL : 1;
    applyDamage(session, b.id, BLAST_DAMAGE * k * mul);
  }

  session.effects.blast(c.x, c.y);
  session.effects.shake();
  session.hooks.onSound?.('impact', 1);
  session.hooks.onSound?.('break-stone', 1);
}

export function birdRadius(type: BirdType): number {
  return BIRDS[type].radius;
}
