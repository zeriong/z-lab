// B12 — 돼지 제거 판정
//
// 직격·낙하물·폭발 셋 다로 죽는다(전부 데미지 한 경로로 수렴한다).
// 죽는 순간이 화면(파티클·사운드)과 점수에 동시에 나타난다.

import type { PhysicsBody } from '../physics/PhysicsAdapter';
import type { World } from './world';
import { Audio } from '../core/audio';
import { addPigScore } from './score';

export const PIG_HP = 45;

export function killPig(world: World, pig: PhysicsBody): void {
  if (!pig.alive) return;

  world.effects.burst(pig.x, pig.y, 'rgb(126, 200, 96)', 18, 380);
  world.effects.shake(70, 6);
  Audio.play('pig');
  addPigScore(world.score);

  world.adapter.remove(pig);
  const idx = world.pigs.indexOf(pig);
  if (idx >= 0) world.pigs.splice(idx, 1);

  world.pigsAlive = Math.max(0, world.pigsAlive - 1);
  world.pigsKilled++;
}
