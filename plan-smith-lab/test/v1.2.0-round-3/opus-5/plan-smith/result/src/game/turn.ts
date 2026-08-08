// B13 — 월드 정지(settle) 감지·턴 전환
//
// 잔해 미세 진동으로 턴이 무한정 끌리지 않도록 속도 임계 + 지속 프레임 + 하드캡을 겹친다.
// 물리 스텝 1회마다 정확히 1회 호출된다(프레임이 아니라 스텝 기준).

import {
  FIXED_STEP_SEC,
  SETTLE_FRAMES,
  SETTLE_SPEED_PX_PER_SEC,
  TURN_HARD_CAP_SEC,
  VIRTUAL_H,
} from '../physics/units';
import { resolveDestruction } from './damage';
import { killPig } from './pigs';
import { loadNextBird } from './birdQueue';
import type { World } from './world';

export type TurnOutcome = 'CONTINUE' | 'CLEAR' | 'FAIL';

/** 월드 밖으로 벗어난 바디를 정리한다(추락·화면 밖 이탈). */
function cullOutOfBounds(world: World): void {
  const doomed = world.adapter
    .bodies()
    .filter(
      (b) =>
        !b.isStatic &&
        b.alive &&
        (b.y > VIRTUAL_H + 400 || b.x < -400 || b.x > world.worldWidth + 600),
    );
  for (const b of doomed) {
    if (b.kind === 'pig') {
      killPig(world, b);
      continue;
    }
    if (b === world.activeBird) world.activeBird = null;
    world.adapter.remove(b);
    const idx = world.blocks.indexOf(b);
    if (idx >= 0) world.blocks.splice(idx, 1);
  }
}

/** 고정 스텝 1회분의 턴 진행. 물리 스텝 직후에 호출한다. */
export function stepTurn(world: World): TurnOutcome {
  world.simTime += FIXED_STEP_SEC;

  resolveDestruction(world);
  cullOutOfBounds(world);

  if (world.turnPhase === 'AIMING' || world.turnPhase === 'RESOLVING') return 'CONTINUE';

  const elapsed = world.turnStartedAt === null ? 0 : world.simTime - world.turnStartedAt;
  const maxSpeed = world.adapter.maxDynamicSpeedPxPerSec();

  if (world.turnPhase === 'FLYING') {
    if (maxSpeed < SETTLE_SPEED_PX_PER_SEC) {
      world.turnPhase = 'SETTLING';
      world.settleFrames = 0;
    }
  } else if (world.turnPhase === 'SETTLING') {
    if (maxSpeed >= SETTLE_SPEED_PX_PER_SEC) {
      world.turnPhase = 'FLYING';
      world.settleFrames = 0;
    } else {
      world.settleFrames++;
    }
  }

  const settled = world.turnPhase === 'SETTLING' && world.settleFrames >= SETTLE_FRAMES;
  const timedOut = elapsed >= TURN_HARD_CAP_SEC;
  if (!settled && !timedOut) return 'CONTINUE';

  return resolveTurn(world);
}

function resolveTurn(world: World): TurnOutcome {
  world.turnPhase = 'RESOLVING';
  world.turnStartedAt = null;
  world.settleFrames = 0;

  // 날아간 새는 턴이 끝나면 치운다.
  if (world.activeBird && world.activeBird.alive) {
    world.adapter.remove(world.activeBird);
  }
  world.activeBird = null;

  if (world.pigsAlive === 0) return 'CLEAR';
  if (world.birdsRemaining <= 0) return 'FAIL';

  loadNextBird(world);
  return 'CONTINUE';
}
