// B1: Matter.js 물리 월드. 엔진 생성, 바닥/벽, spawnStage(라벨·메타 부여), 발사(k), 다음 새 교체, 궤적 예측.
import Matter from 'matter-js';
import {
  BIRD,
  MATERIAL,
  PIG,
  SLINGSHOT,
  TUNING,
  WORLD,
  type BlockDef,
  type EntityMeta,
  type PigDef,
  type StageDef,
  type Vec2,
} from './types';

const { Engine, Bodies, Body, Composite } = Matter;

export type MBody = Matter.Body;

/** 발사 계수. velocity = -dragVector × K (초기값 0.18). */
export const K = TUNING.k;

/** body → 게임 메타(HP·점수). 라벨은 디버깅용, 로직은 메타를 본다. */
export const metaOf = new WeakMap<MBody, EntityMeta>();

export function getMeta(body: MBody): EntityMeta | undefined {
  return metaOf.get(body);
}

export interface StageWorld {
  def: StageDef;
  engine: Matter.Engine;
  /** 아직 발사되지 않은 새(슬링샷에 올라간 새 제외). */
  queue: MBody[];
  /** 슬링샷 위에 올라가 발사를 기다리는 새. */
  currentBird: MBody | null;
  /** 발사되어 비행/구르는 중인 새. 정착 후 제거. */
  flyingBird: MBody | null;
  pigsRemaining: number;
  /** 아직 발사하지 않은 새 수(현재 새 포함). launch()가 감소. */
  birdsRemaining: number;
  score: number;
  launched: number;
  /** 첫 발사 전엔 피해 계산을 하지 않는다(스폰 직후 미세 접촉 보호). */
  armed: boolean;
  /** 스폰 이후 PLAYING 프레임 수. */
  frame: number;
}

export function createEngine(): Matter.Engine {
  const engine = Engine.create();
  engine.gravity.x = 0;
  engine.gravity.y = TUNING.gravityY;
  engine.gravity.scale = 0.001;
  engine.enableSleeping = false;
  engine.positionIterations = 8;
  engine.velocityIterations = 6;

  const t = WORLD.wallThickness;
  const ground = Bodies.rectangle(WORLD.w / 2, WORLD.groundY + t / 2, WORLD.w + t * 2, t, {
    isStatic: true,
    label: 'ground',
    friction: 0.9,
    restitution: 0.1,
  });
  const left = Bodies.rectangle(-t / 2, WORLD.h / 2, t, WORLD.h * 6, {
    isStatic: true,
    label: 'wall',
    friction: 0.3,
  });
  const right = Bodies.rectangle(WORLD.w + t / 2, WORLD.h / 2, t, WORLD.h * 6, {
    isStatic: true,
    label: 'wall',
    friction: 0.3,
  });
  metaOf.set(ground, { kind: 'ground', hp: Infinity, maxHp: Infinity, score: 0 });
  metaOf.set(left, { kind: 'wall', hp: Infinity, maxHp: Infinity, score: 0 });
  metaOf.set(right, { kind: 'wall', hp: Infinity, maxHp: Infinity, score: 0 });
  Composite.add(engine.world, [ground, left, right]);
  return engine;
}

export function makeBird(x: number, y: number): MBody {
  // density 등을 먼저 확정한 뒤 static으로 바꿔야 setStatic(false) 때 원래 질량이 복원된다.
  const bird = Bodies.circle(x, y, BIRD.r, {
    label: 'bird',
    density: BIRD.density,
    frictionAir: BIRD.frictionAir,
    restitution: BIRD.restitution,
    friction: BIRD.friction,
  });
  Body.setStatic(bird, true);
  metaOf.set(bird, { kind: 'bird', hp: Infinity, maxHp: Infinity, score: 0 });
  return bird;
}

export function makePig(def: PigDef): MBody {
  const r = def.r ?? PIG.r;
  const pig = Bodies.circle(def.x, def.y, r, {
    label: 'pig',
    density: PIG.density,
    restitution: PIG.restitution,
    friction: 0.5,
    frictionAir: 0.01,
  });
  metaOf.set(pig, { kind: 'pig', hp: def.hp, maxHp: def.hp, score: PIG.score });
  return pig;
}

export function makeBlock(def: BlockDef): MBody {
  const spec = MATERIAL[def.material];
  const block = Bodies.rectangle(def.x, def.y, def.w, def.h, {
    label: `block:${def.material}`,
    density: spec.density,
    friction: 0.6,
    restitution: 0.05,
    frictionAir: 0.01,
    angle: def.angle ?? 0,
  });
  metaOf.set(block, { kind: 'block', material: def.material, hp: spec.hp, maxHp: spec.hp, score: spec.score });
  return block;
}

function queueSlot(i: number): Vec2 {
  return { x: SLINGSHOT.x - 90 - i * 56, y: WORLD.groundY - BIRD.r };
}

/** 이전 스테이지의 동적 body를 모두 치우고 def대로 배치. 첫 새는 슬링샷 위 static. */
export function spawnStage(engine: Matter.Engine, def: StageDef): StageWorld {
  for (const b of Composite.allBodies(engine.world)) {
    const m = metaOf.get(b);
    if (!m || (m.kind !== 'ground' && m.kind !== 'wall')) Composite.remove(engine.world, b);
  }

  const blocks = def.blocks.map(makeBlock);
  const pigs = def.pigs.map(makePig);
  const birds = def.birds.map((_, i) => {
    const slot = queueSlot(i);
    return makeBird(slot.x, slot.y);
  });
  Composite.add(engine.world, [...blocks, ...pigs, ...birds]);

  const world: StageWorld = {
    def,
    engine,
    queue: birds,
    currentBird: null,
    flyingBird: null,
    pigsRemaining: def.pigs.length,
    birdsRemaining: def.birds.length,
    score: 0,
    launched: 0,
    armed: false,
    frame: 0,
  };
  advanceBird(world);
  return world;
}

export function clampDrag(drag: Vec2): Vec2 {
  const len = Math.hypot(drag.x, drag.y);
  if (len <= TUNING.maxPull || len === 0) return { x: drag.x, y: drag.y };
  const s = TUNING.maxPull / len;
  return { x: drag.x * s, y: drag.y * s };
}

/** 당기는 동안 새를 손 위치(컵 + 클램프된 drag)로 옮긴다. static이라 물리 영향 없음. */
export function holdBird(world: StageWorld, drag: Vec2): void {
  const bird = world.currentBird;
  if (!bird) return;
  const d = clampDrag(drag);
  Body.setPosition(bird, { x: SLINGSHOT.x + d.x, y: SLINGSHOT.y + d.y });
}

export function returnBirdToCup(world: StageWorld): void {
  const bird = world.currentBird;
  if (!bird) return;
  Body.setPosition(bird, { x: SLINGSHOT.x, y: SLINGSHOT.y });
}

/**
 * 하중 경로 hop 3. |drag| > minPull 이면 static 해제 + velocity = -drag × K.
 * 짧으면 새를 컵으로 되돌리고 null.
 */
export function launch(world: StageWorld, drag: Vec2): MBody | null {
  const bird = world.currentBird;
  if (!bird) return null;
  const d = clampDrag(drag);
  if (Math.hypot(d.x, d.y) <= TUNING.minPull) {
    returnBirdToCup(world);
    return null;
  }
  Body.setPosition(bird, { x: SLINGSHOT.x + d.x, y: SLINGSHOT.y + d.y });
  Body.setStatic(bird, false);
  Body.setAngularVelocity(bird, 0);
  Body.setVelocity(bird, { x: -d.x * K, y: -d.y * K });
  world.currentBird = null;
  world.flyingBird = bird;
  world.birdsRemaining -= 1;
  world.launched += 1;
  world.armed = true;
  return bird;
}

/** 정착 후: 날아간 새 제거, 대기열의 다음 새를 컵으로. 다음 새가 있으면 true. */
export function advanceBird(world: StageWorld): boolean {
  if (world.flyingBird) {
    Composite.remove(world.engine.world, world.flyingBird);
    world.flyingBird = null;
  }
  const next = world.queue.shift();
  if (!next) {
    world.currentBird = null;
    return false;
  }
  Body.setAngle(next, 0);
  Body.setPosition(next, { x: SLINGSHOT.x, y: SLINGSHOT.y });
  world.currentBird = next;
  world.queue.forEach((b, i) => {
    const slot = queueSlot(i);
    Body.setPosition(b, slot);
  });
  return true;
}

export function removeBody(world: StageWorld, body: MBody): void {
  Composite.remove(world.engine.world, body);
  if (world.flyingBird === body) world.flyingBird = null;
  if (world.currentBird === body) world.currentBird = null;
}

export function dynamicBodies(engine: Matter.Engine): MBody[] {
  return Composite.allBodies(engine.world).filter((b) => !b.isStatic);
}

export function maxDynamicSpeed(engine: Matter.Engine): number {
  let max = 0;
  for (const b of dynamicBodies(engine)) {
    const s = Math.hypot(b.velocity.x, b.velocity.y);
    if (s > max) max = s;
  }
  return max;
}

/** 고정 스텝 한 번. 실제 경과시간은 쓰지 않는다. */
export function stepEngine(engine: Matter.Engine): void {
  Engine.update(engine, TUNING.fixedDeltaMs);
}

/** B3: 현재 drag로 발사했을 때의 예상 궤적 점(dots개, stepPerDot 스텝 간격). */
export function predictTrajectory(
  engine: Matter.Engine,
  drag: Vec2,
  dots: number = TUNING.trajectoryDots,
  stepPerDot: number = TUNING.trajectoryStepPerDot,
): Vec2[] {
  const d = clampDrag(drag);
  const dt = TUNING.fixedDeltaMs;
  const g = engine.gravity.y * engine.gravity.scale * dt * dt;
  const air = 1 - BIRD.frictionAir;
  const p = { x: SLINGSHOT.x + d.x, y: SLINGSHOT.y + d.y };
  const v = { x: -d.x * K, y: -d.y * K };
  const out: Vec2[] = [];
  for (let i = 0; i < dots; i++) {
    for (let s = 0; s < stepPerDot; s++) {
      v.x *= air;
      v.y = v.y * air + g;
      p.x += v.x;
      p.y += v.y;
    }
    out.push({ x: p.x, y: p.y });
    if (p.y > WORLD.groundY - BIRD.r) break;
  }
  return out;
}
