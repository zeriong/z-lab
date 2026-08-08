// B14 — 남은 새·다음 새 장전
//
// 턴 종료 후 다음 조준까지 사용자의 추가 조작이 필요 없다.
// 장전 시점에는 새가 정적 바디다 — 발사 순간에만 동적으로 전환된다.

import { BIRD_RADIUS, birdRestPosition } from './world';
import type { World } from './world';

export function loadNextBird(world: World): boolean {
  if (world.birdsRemaining <= 0) {
    world.birdOnSling = null;
    return false;
  }
  const rest = birdRestPosition(world.def);
  const bird = world.adapter.addCircle('bird', rest.x, rest.y, BIRD_RADIUS, {
    isStatic: true,
    density: 0.0022,
    restitution: 0.32,
    friction: 0.6,
  });
  world.birdOnSling = bird;
  world.activeBird = null;
  world.turnPhase = 'AIMING';
  world.turnStartedAt = null;
  world.settleFrames = 0;
  return true;
}
