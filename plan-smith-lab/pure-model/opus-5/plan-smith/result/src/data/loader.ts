/**
 * loadStage / unloadStage (R31, R32) — §10 홉 1과 홉 4의 소재지.
 *
 * 이 파일의 두 가지 계약:
 *  1) 생성하는 모든 바디에 `plugin`(= EntityTag)을 붙인다. 홉 4의 통과 조건이
 *     "돼지 바디가 plugin.kind === 'pig' 태그를 갖는다"이고, 그 태그를 부여하는
 *     주체가 로더라고 §10 콜드스타트 표에 못 박혀 있다.
 *  2) unload는 자기가 만든 것만 정확히 되돌린다. 남기면 스테이지를 오갈수록
 *     프레임이 계단식으로 떨어진다.
 */

import { Bodies, Body, Composite, Constraint, Vector } from 'matter-js';
import type { StageDef, BodyDef, PigDef } from './schema';
import { MATERIALS, PIGS, BIRDS, type MaterialName, type PigSize, type BirdKind } from '../game/materials';
import type { PhysicsHandle } from '../physics/world';

export type EntityKind = 'ground' | 'block' | 'pig' | 'bird';

export interface EntityTag {
  kind: EntityKind;
  hp: number;
  maxHp: number;
  /** 이 임펄스 미만은 데미지 0 */
  threshold: number;
  /** 파괴 점수 */
  score: number;
  material?: MaterialName;
  pigSize?: PigSize;
  birdKind?: BirdKind;
  /** 렌더 색 */
  fill: string;
  stroke: string;
  shard: string;
  /** 파괴 처리를 두 번 하지 않기 위한 래치 */
  dead: boolean;
  /** 새 능력이 이번 비행에서 이미 쓰였는가 (R12: 비행당 1회) */
  abilityUsed: boolean;
  /** 최근 데미지 시각(ms) — 렌더러가 피격 플래시에 쓴다 */
  lastHitAt: number;
}

export interface StageRuntime {
  def: StageDef;
  ground: Body[];
  blocks: Body[];
  pigs: Body[];
  constraints: Constraint[];
  /** 발사 순서대로 남은 새 종류 */
  queue: BirdKind[];
  /** 스테이지 정의상의 전체 새 수 (HUD가 회색 pip을 그리는 데 필요) */
  birdPlan: BirdKind[];
  birdsUsed: number;
  activeBird: Body | null;
  pigsRemaining: number;
  score: number;
  anchor: Vector;
  /** 직전 발사의 실제 궤적 (R7 잔상) */
  lastTrail: Vector[];
  /** 현재 비행 중인 새의 궤적 샘플 */
  trail: Vector[];
}

export function tagOf(body: Body): EntityTag | null {
  const plugin = body.plugin as unknown as EntityTag | undefined;
  if (!plugin || typeof plugin !== 'object' || !('kind' in plugin)) return null;
  return plugin;
}

function polygonCentroid(points: Array<[number, number]>): Vector {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  area *= 0.5;
  if (Math.abs(area) < 1e-6) {
    // 퇴화 폴리곤 방어 — 평균점으로 떨어뜨린다.
    const sx = points.reduce((s, p) => s + p[0], 0) / points.length;
    const sy = points.reduce((s, p) => s + p[1], 0) / points.length;
    return { x: sx, y: sy };
  }
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

function groundTag(): EntityTag {
  return {
    kind: 'ground',
    hp: Infinity,
    maxHp: Infinity,
    threshold: Infinity,
    score: 0,
    fill: '#3d5a3a',
    stroke: '#2a3f28',
    shard: '#3d5a3a',
    dead: false,
    abilityUsed: false,
    lastHitAt: 0,
  };
}

function blockTag(material: MaterialName): EntityTag {
  const spec = MATERIALS[material];
  return {
    kind: 'block',
    hp: spec.hp,
    maxHp: spec.hp,
    threshold: spec.threshold,
    score: spec.score,
    material,
    fill: spec.fill,
    stroke: spec.stroke,
    shard: spec.shard,
    dead: false,
    abilityUsed: false,
    lastHitAt: 0,
  };
}

function pigTag(size: PigSize): EntityTag {
  const spec = PIGS[size];
  return {
    kind: 'pig',
    hp: spec.hp,
    maxHp: spec.hp,
    threshold: spec.threshold,
    score: spec.score,
    pigSize: size,
    fill: spec.fill,
    stroke: '#3f6b33',
    shard: '#8fd47c',
    dead: false,
    abilityUsed: false,
    lastHitAt: 0,
  };
}

function birdTag(kind: BirdKind): EntityTag {
  const spec = BIRDS[kind];
  return {
    kind: 'bird',
    // 새는 HP로 부서지지 않는다. 임계만 있고 파괴 경로가 없다.
    hp: Infinity,
    maxHp: Infinity,
    threshold: 0,
    score: 0,
    birdKind: kind,
    fill: spec.fill,
    stroke: 'rgba(0,0,0,0.35)',
    shard: spec.fill,
    dead: false,
    abilityUsed: false,
    lastHitAt: 0,
  };
}

function createBlock(def: BodyDef): Body {
  const spec = MATERIALS[def.material];
  const options = {
    density: spec.density,
    friction: spec.friction,
    frictionStatic: spec.friction + 0.1,
    restitution: spec.restitution,
    angle: def.angle ?? 0,
    // 잔해가 미세 진동하며 턴 종료를 막지 않도록 (§7.4)
    sleepThreshold: 45,
  };
  const body =
    def.shape === 'box'
      ? Bodies.rectangle(def.x, def.y, def.w ?? 1, def.h ?? 1, options)
      : Bodies.circle(def.x, def.y, def.r ?? 1, options);
  body.plugin = blockTag(def.material);
  return body;
}

function createPig(def: PigDef): Body {
  const spec = PIGS[def.size];
  const body = Bodies.circle(def.x, def.y, spec.radius, {
    density: spec.density,
    friction: spec.friction,
    restitution: spec.restitution,
    sleepThreshold: 45,
  });
  body.plugin = pigTag(def.size);
  return body;
}

/**
 * 새를 새총 위에 **정적으로** 얹는다.
 * isStatic=true가 §10 콜드스타트 표의 초기값이고,
 * 이걸 false로 바꾸는 유일한 주체가 SlingshotController.launch()다.
 */
export function createBird(kind: BirdKind, x: number, y: number): Body {
  const spec = BIRDS[kind];
  const body = Bodies.circle(x, y, spec.radius, {
    density: spec.density,
    friction: spec.friction,
    frictionAir: spec.frictionAir,
    restitution: spec.restitution,
    isStatic: true,
    sleepThreshold: 60,
  });
  body.plugin = birdTag(kind);
  return body;
}

export function loadStage(physics: PhysicsHandle, def: StageDef): StageRuntime {
  physics.engine.gravity.y = def.gravity; // 홉 3의 통과 조건: world.gravity.y > 0

  const ground = def.ground.map((g) => {
    const centroid = polygonCentroid(g.points);
    const verts = g.points.map(([x, y]) => ({ x, y }));
    const body = Bodies.fromVertices(centroid.x, centroid.y, [verts], {
      isStatic: true,
      friction: 0.9,
      restitution: 0,
    });
    body.plugin = groundTag();
    return body;
  });

  const blocks = def.bodies.map(createBlock);
  const pigs = def.pigs.map(createPig);

  const constraints: Constraint[] = (def.constraints ?? []).map((c) => {
    const bodyA = blocks[c.aIndex];
    const bodyB = c.bIndex === null ? undefined : blocks[c.bIndex];
    return Constraint.create({
      bodyA,
      bodyB,
      pointA: { x: c.pointA.x, y: c.pointA.y },
      // bIndex가 null이면 pointB는 월드 좌표다(시소 축 = 회전 핀).
      pointB: { x: c.pointB.x, y: c.pointB.y },
      stiffness: c.stiffness,
      length: c.length,
      damping: 0.1,
    });
  });

  Composite.add(physics.world, [...ground, ...blocks, ...pigs, ...constraints]);

  return {
    def,
    ground,
    blocks,
    pigs,
    constraints,
    queue: [...def.birds],
    birdPlan: [...def.birds],
    birdsUsed: 0,
    activeBird: null,
    pigsRemaining: def.pigs.length, // 콜드스타트 표: loadStage가 초기화
    score: 0,
    anchor: { x: def.slingshot.x, y: def.slingshot.y },
    lastTrail: [],
    trail: [],
  };
}

/** 로드가 넣은 것을 전부 되돌린다. 순서: 제약 → 바디 → 새. */
export function unloadStage(physics: PhysicsHandle, runtime: StageRuntime | null): void {
  if (!runtime) return;
  runtime.constraints.forEach((c) => Composite.remove(physics.world, c));
  [...runtime.ground, ...runtime.blocks, ...runtime.pigs].forEach((b) => Composite.remove(physics.world, b));
  if (runtime.activeBird) Composite.remove(physics.world, runtime.activeBird);
  runtime.constraints.length = 0;
  runtime.ground.length = 0;
  runtime.blocks.length = 0;
  runtime.pigs.length = 0;
  runtime.activeBird = null;
  runtime.trail.length = 0;
  runtime.lastTrail.length = 0;
}

/** 남은 새 수 — HUD(R20)와 실패 판정(§7.6), 잔여 새 보너스(§7.5)의 공통 출처 */
export function birdsLeft(runtime: StageRuntime): number {
  return runtime.queue.length + (runtime.activeBird ? 1 : 0);
}
