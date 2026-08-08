// B9 — 발사·비행·중력
//
// 릴리즈하면 새가 드래그 반대 방향으로 임펄스를 받아 포물선을 그린다.
// 속도 계산은 궤적 예측(예측 모듈)과 같은 units 함수를 쓴다 — 둘이 갈라지면 예측이 거짓말이 된다.

import { clampDrag, dragToLaunchVelocity } from '../physics/units';
import { Audio } from '../core/audio';
import { birdRestPosition } from './world';
import type { World } from './world';

/** 드래그 중 새를 손끝(최대 당김 거리로 잘린)으로 옮긴다. */
export function dragBird(world: World, dragX: number, dragY: number): void {
  const bird = world.birdOnSling;
  if (!bird) return;
  const rest = birdRestPosition(world.def);
  const c = clampDrag(dragX, dragY);
  world.adapter.setPosition(bird, rest.x + c.x, rest.y + c.y);
}

/** 릴리즈. 발사에 성공하면 true. */
export function releaseBird(world: World, dragX: number, dragY: number): boolean {
  const bird = world.birdOnSling;
  if (!bird) return false;

  const c = clampDrag(dragX, dragY);
  const { vx, vy } = dragToLaunchVelocity(c.x, c.y);
  if (vx === 0 && vy === 0) return false;

  world.adapter.setDynamic(bird);
  world.adapter.setVelocityPxPerSec(bird, vx, vy);

  world.activeBird = bird;
  world.birdOnSling = null;
  world.birdsRemaining = Math.max(0, world.birdsRemaining - 1);
  world.birdsUsed++;

  world.turnPhase = 'FLYING';
  world.turnStartedAt = world.simTime;
  world.settleFrames = 0;

  Audio.play('launch', Math.hypot(vx, vy) / 1400);
  return true;
}

/** 새를 슬링샷 원위치로 되돌린다(드래그 취소). */
export function resetBirdToSling(world: World): void {
  const bird = world.birdOnSling;
  if (!bird) return;
  const rest = birdRestPosition(world.def);
  world.adapter.setPosition(bird, rest.x, rest.y);
}
