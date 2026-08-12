import Matter from 'matter-js';
import { PhysicsAdapter } from '../engine/physicsAdapter';
import { StageDef } from '../types/stage';

export interface LoadedStage {
  stage: StageDef;
  projectilesRemaining: number;
  pigs: Matter.Body[];
  destructibles: Matter.Body[];
  terrain: Matter.Body[];
  slingAnchor: { x: number; y: number };
}

// 콜드스타트 테이블: 새총 앵커 반경 = 스테이지 데이터의 sling.anchor 좌표 + 고정 상수(60px, 초기값 태그).
const DEFAULT_ANCHOR_RADIUS = 60;

/**
 * 스텝 2 — 스테이지 로더. 지형(terrain)·파괴 가능 구조물(destructibles)·돼지(pigs)를
 * 스텝 1의 물리 world(adapter)에 등록한다.
 * 로드베어링 hop3: 발사체 body와 구조물/돼지 body가 동일 physics world에 존재해야 충돌이 성립한다.
 */
export function loadStage(adapter: PhysicsAdapter, stage: StageDef): LoadedStage {
  adapter.clearWorld();

  const terrain = stage.terrain.map((p) =>
    Matter.Bodies.rectangle(p.x, p.y, p.width, p.height, {
      isStatic: true,
      label: 'ground',
      density: 1,
      angle: p.angle ?? 0,
    })
  );

  const destructibles = stage.blocks.map((block) =>
    Matter.Bodies.rectangle(block.x, block.y, block.width, block.height, {
      label: `destructible:${block.material}:${block.id}`,
      density: 0.01,
      angle: block.angle ?? 0,
    })
  );

  const pigs = stage.pigs.map((pig) =>
    Matter.Bodies.circle(pig.x, pig.y, pig.radius, {
      label: `pig:${pig.id}`,
      density: 0.008,
    })
  );

  adapter.addBodies(terrain);
  adapter.addBodies(destructibles);
  adapter.addBodies(pigs);

  return {
    stage,
    projectilesRemaining: stage.projectileCount,
    pigs,
    destructibles,
    terrain,
    slingAnchor: {
      x: stage.slingshot.anchor.x,
      y: stage.slingshot.anchor.y,
    },
  };
}

export function anchorRadiusFor(stage: StageDef): number {
  return stage.slingshot.anchorRadius ?? DEFAULT_ANCHOR_RADIUS;
}
