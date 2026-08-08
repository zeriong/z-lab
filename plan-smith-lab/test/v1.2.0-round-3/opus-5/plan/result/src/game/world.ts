/**
 * §10.2 buildWorld(stage): 데이터 → Matter 바디. 전역 상태를 참조하지 않는다.
 * §8.3 destroyWorld(): 다시하기/메인으로는 부분 리셋이 아니라 전체 파기 후 재생성이다.
 */

import { Composite, Engine, Events, Body } from 'matter-js';
import type { BirdType, StageData } from '../stages/schema';
import {
  BIRD,
  createBird,
  createBlock,
  createGround,
  createPig,
  getGame,
  type GameData,
  type Kind,
  type Material,
} from './entities';
import { attachCollisionDamage } from './damage';

export const PREROLL_STEPS = 60;
const PREROLL_WARN_PX = 8;

export interface DamageTicket {
  body: Body;
  dmg: number;
}

export interface DestroyEvent {
  x: number;
  y: number;
  kind: Kind;
  material: Material;
  score: number;
  radius: number;
}

export interface GameWorld {
  stage: StageData;
  engine: Engine;
  /** 현재 슬링샷에 올라가 있거나 비행 중인 새 */
  bird: Body | null;
  /** 아직 쏘지 않은 새 타입들(현재 장전된 새 제외) */
  birdQueue: BirdType[];
  /** 스테이지 전체 새 수 */
  birdsTotal: number;
  /** 사용한 새 수 */
  birdsUsed: number;
  pigsAlive: number;
  score: number;
  /** 시뮬레이션 스텝 카운터(폭탄 퓨즈 등에 사용) */
  step: number;
  /** 현재 새를 발사한 시점의 step. -1이면 미발사 */
  launchStep: number;
  damageQueue: DamageTicket[];
  removeQueue: Body[];
  /** 이번 프레임에 파괴된 것들 — 파티클/사운드가 소비하고 비운다 */
  destroyEvents: DestroyEvent[];
  /** 이번 프레임 충돌 사운드 큐 */
  hitEvents: Array<{ material: Material; intensity: number }>;
}

function makeEngine(): Engine {
  const engine = Engine.create();
  // §1.5 중력은 Matter 기본값 유지
  engine.gravity.x = 0;
  engine.gravity.y = 1;
  engine.gravity.scale = 0.001;
  // §17 스택 안정성
  engine.enableSleeping = true;
  engine.positionIterations = 8;
  engine.velocityIterations = 6;
  engine.constraintIterations = 2;
  return engine;
}

export function buildWorld(stage: StageData): GameWorld {
  const engine = makeEngine();

  const bodies: Body[] = [];
  for (const g of stage.ground) bodies.push(createGround(g));
  for (const b of stage.blocks) bodies.push(createBlock(b));
  for (const p of stage.pigs) bodies.push(createPig(p));
  Composite.add(engine.world, bodies);

  const birds = [...stage.birds];

  const gw: GameWorld = {
    stage,
    engine,
    bird: null,
    birdQueue: birds,
    birdsTotal: birds.length,
    birdsUsed: 0,
    pigsAlive: stage.pigs.length,
    score: 0,
    step: 0,
    launchStep: -1,
    damageQueue: [],
    removeQueue: [],
    destroyEvents: [],
    hitEvents: [],
  };

  attachCollisionDamage(gw);
  return gw;
}

/**
 * §10.2 (c) 안정화 프리롤 — 저작 시의 미세한 겹침으로 구조물이 스스로 튀는 것을
 * 플레이 시작 전에 흡수한다. 렌더 없이 물리만 60회 돌린다.
 */
export function prerollWorld(gw: GameWorld): void {
  const before = new Map<number, { x: number; y: number }>();
  for (const b of Composite.allBodies(gw.engine.world)) {
    if (!b.isStatic) before.set(b.id, { x: b.position.x, y: b.position.y });
  }

  for (let i = 0; i < PREROLL_STEPS; i++) {
    Engine.update(gw.engine, 1000 / 60);
  }
  // 프리롤 중 발생한 데미지/파괴는 스테이지 시작 상태에 반영하지 않는다.
  gw.damageQueue = [];
  gw.removeQueue = [];
  gw.destroyEvents = [];
  gw.hitEvents = [];

  if (import.meta.env.DEV) {
    for (const b of Composite.allBodies(gw.engine.world)) {
      const p0 = before.get(b.id);
      if (!p0) continue;
      const d = Math.hypot(b.position.x - p0.x, b.position.y - p0.y);
      if (d > PREROLL_WARN_PX) {
        console.warn(
          `[stage#${gw.stage.id}] 프리롤 중 바디가 ${d.toFixed(1)}px 이동했다 — 레벨 저작 버그 신호 (${b.label})`,
        );
      }
    }
  }
}

/** 다음 새를 슬링샷에 장전한다. 더 이상 없으면 false. */
export function loadNextBird(gw: GameWorld): boolean {
  const type = gw.birdQueue.shift();
  if (!type) {
    gw.bird = null;
    return false;
  }
  const anchor = gw.stage.sling;
  const bird = createBird(type, anchor.x, anchor.y - BIRD[type].radius);
  Body.setStatic(bird, true); // §5.1 조준 중에는 솔버 개입 차단
  Composite.add(gw.engine.world, bird);
  gw.bird = bird;
  gw.launchStep = -1;
  return true;
}

/** 현재 장전/비행 중인 새를 월드에서 제거하고 소모 처리한다. */
export function consumeBird(gw: GameWorld): void {
  if (gw.bird) {
    Composite.remove(gw.engine.world, gw.bird);
    gw.bird = null;
  }
  gw.launchStep = -1;
}

export function birdsRemaining(gw: GameWorld): number {
  return gw.birdQueue.length + (gw.bird ? 1 : 0);
}

/** §7 화면 밖 판정 */
export function isOffWorld(gw: GameWorld, body: Body): boolean {
  const { width, height } = gw.stage.world;
  const p = body.position;
  return p.y > height + 300 || p.x < -400 || p.x > width + 400;
}

/** §3-4 화면 밖 바디 정리. 돼지가 떨어지면 처치로 친다(§6.1). */
export function cleanupOffWorld(gw: GameWorld): void {
  for (const body of Composite.allBodies(gw.engine.world)) {
    if (body.isStatic) continue;
    if (body === gw.bird) continue; // 새는 settle 로직이 따로 판단한다
    if (!isOffWorld(gw, body)) continue;

    const g = getGame(body);
    if (g && !g.dead) {
      g.dead = true;
      if (g.kind === 'pig') {
        gw.pigsAlive = Math.max(0, gw.pigsAlive - 1);
        gw.score += 500;
        gw.destroyEvents.push({
          x: body.position.x,
          y: body.position.y,
          kind: 'pig',
          material: 'pig',
          score: 500,
          radius: g.radius ?? 16,
        });
      }
    }
    Composite.remove(gw.engine.world, body);
  }
}

/** §8.3 월드 파기 체크리스트 — 누락 시 메모리 누수 */
export function destroyWorld(gw: GameWorld | null): void {
  if (!gw) return;
  Events.off(gw.engine, undefined as unknown as string, undefined as unknown as () => void);
  Composite.clear(gw.engine.world, false);
  Engine.clear(gw.engine);
  gw.bird = null;
  gw.birdQueue = [];
  gw.damageQueue = [];
  gw.removeQueue = [];
  gw.destroyEvents = [];
  gw.hitEvents = [];
}

export function allBodies(gw: GameWorld): Body[] {
  return Composite.allBodies(gw.engine.world);
}

export type { GameData };
