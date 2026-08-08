// B5 — 스테이지 로더 / 월드 빌더
//
// 정의 하나로 지형·구조·돼지·슬링샷·새 큐가 결정론적으로 재구성된다.
// loadStage() 는 충돌 구독 등록까지 마친 뒤에야 월드를 돌려준다.

import { PhysicsAdapter } from '../physics/PhysicsAdapter';
import type { PhysicsBody } from '../physics/PhysicsAdapter';
import { MATERIAL_HP, validateStage, worldWidthOf } from '../stages/schema';
import type { StageDef } from '../stages/schema';
import { Effects } from '../render/effects';
import { Camera } from './camera';
import { createScoreState } from './score';
import type { ScoreState } from './score';
import { handleCollision } from './damage';
import { PIG_HP } from './pigs';
import { loadNextBird } from './birdQueue';

export type TurnPhase = 'AIMING' | 'FLYING' | 'SETTLING' | 'RESOLVING';

export const BIRD_RADIUS = 22;

export interface World {
  def: StageDef;
  adapter: PhysicsAdapter;
  worldWidth: number;
  gravity: number;

  blocks: PhysicsBody[];
  pigs: PhysicsBody[];
  ground: PhysicsBody[];

  pigsAlive: number;
  birdsRemaining: number;
  birdsUsed: number;
  blocksDestroyed: number;
  pigsKilled: number;

  birdOnSling: PhysicsBody | null;
  activeBird: PhysicsBody | null;

  turnPhase: TurnPhase;
  turnStartedAt: number | null;
  settleFrames: number;
  simTime: number;

  score: ScoreState;
  effects: Effects;
  camera: Camera;

  collisionHandlerRegistered: boolean;
  pendingRemoval: PhysicsBody[];
}

/** 슬링샷에 장전된 새가 쉬는 자리(월드 좌표). */
export function birdRestPosition(def: StageDef): { x: number; y: number } {
  return { x: def.sling.x, y: def.sling.y - 46 };
}

export function loadStage(def: StageDef): World {
  const errors = validateStage(def);
  if (errors.length > 0) {
    throw new Error('스테이지 로드 실패\n' + errors.join('\n'));
  }

  const gravity = def.gravity ?? 1.0;
  const adapter = new PhysicsAdapter();
  adapter.create(gravity);

  const world: World = {
    def,
    adapter,
    worldWidth: worldWidthOf(def),
    gravity,
    blocks: [],
    pigs: [],
    ground: [],
    pigsAlive: def.pigs.length,
    birdsRemaining: def.birds,
    birdsUsed: 0,
    blocksDestroyed: 0,
    pigsKilled: 0,
    birdOnSling: null,
    activeBird: null,
    turnPhase: 'AIMING',
    turnStartedAt: null,
    settleFrames: 0,
    simTime: 0,
    score: createScoreState(),
    effects: new Effects(),
    camera: new Camera(),
    collisionHandlerRegistered: false,
    pendingRemoval: [],
  };

  // 지형 — 정적 바디. 세그먼트는 좌상단 기준이므로 중심으로 옮겨 넣는다.
  for (const g of def.ground) {
    world.ground.push(
      adapter.addRect('ground', g.x + g.w / 2, g.y + g.h / 2, g.w, g.h, {
        isStatic: true,
        friction: 0.9,
        restitution: 0.02,
      }),
    );
  }

  // 구조물
  for (const b of def.blocks) {
    world.blocks.push(
      adapter.addRect('block', b.x, b.y, b.w, b.h, {
        material: b.material,
        hp: MATERIAL_HP[b.material],
        angle: b.angle,
      }),
    );
  }

  // 돼지
  for (const p of def.pigs) {
    world.pigs.push(
      adapter.addCircle('pig', p.x, p.y, p.size, {
        hp: PIG_HP,
        density: 0.0016,
        restitution: 0.2,
        friction: 0.5,
      }),
    );
  }

  adapter.onCollision((ev) => handleCollision(world, ev));
  world.collisionHandlerRegistered = true;

  loadNextBird(world);
  world.camera.reset();

  return world;
}

/** 같은 스테이지를 처음 상태로 재구성한다(일시정지·실패·클리어의 '다시하기'). */
export function restartWorld(world: World): World {
  const def = world.def;
  destroyWorld(world);
  return loadStage(def);
}

export function destroyWorld(world: World): void {
  world.adapter.destroy();
  world.blocks = [];
  world.pigs = [];
  world.ground = [];
  world.birdOnSling = null;
  world.activeBird = null;
  world.pendingRemoval = [];
  world.effects.clear();
  world.collisionHandlerRegistered = false;
}
