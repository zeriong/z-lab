// 스테이지 = 선언적 JSON, 게임 = 그 인터프리터(A1).
// 로드 시 월드를 전체 재구축한다 — 재구축은 physics.createPhysicsWorld 신규 생성과 짝.

import { WIDTH, GROUND_Y, MATERIALS, PIG, BIRD } from './constants.js';

const { Bodies, Composite, Body } = Matter;

export async function loadStage(n) {
  const id = String(n).padStart(2, '0');
  const res = await fetch(`stages/stage${id}.json`);
  if (!res.ok) throw new Error(`stage load failed: ${n}`);
  return res.json();
}

export function buildWorld(ph, stage) {
  const world = ph.engine.world;

  const ground = Bodies.rectangle(WIDTH / 2, GROUND_Y + 20, WIDTH * 2, 40, {
    isStatic: true,
    friction: 0.9,
  });
  ground.plugin = { kind: 'ground' };
  Composite.add(world, ground);

  for (const blk of stage.blocks || []) {
    const mat = MATERIALS[blk.type];
    if (!mat) throw new Error(`unknown material: ${blk.type}`);
    const body = Bodies.rectangle(blk.x, blk.y, blk.w, blk.h, {
      angle: blk.angle || 0,
      density: mat.density,
      friction: mat.friction,
      restitution: mat.restitution,
    });
    body.plugin = {
      kind: 'block',
      material: blk.type,
      hp: mat.hp,
      maxHp: mat.hp,
      w: blk.w,
      h: blk.h,
    };
    Composite.add(world, body);
  }

  for (const pig of stage.pigs || []) {
    const r = pig.r || 16;
    const body = Bodies.circle(pig.x, pig.y, r, {
      density: PIG.density,
      friction: PIG.friction,
      restitution: PIG.restitution,
    });
    body.plugin = { kind: 'pig', hp: PIG.hp, maxHp: PIG.hp, r };
    Composite.add(world, body);
  }
}

// 새를 슬링샷 앵커 위치에 장전 상태(static)로 생성.
export function spawnBird(ph, x, y) {
  const body = Bodies.circle(x, y, BIRD.radius, {
    density: BIRD.density,
    friction: BIRD.friction,
    restitution: BIRD.restitution,
  });
  body.plugin = { kind: 'bird', r: BIRD.radius };
  Body.setStatic(body, true);
  Composite.add(ph.engine.world, body);
  return body;
}
