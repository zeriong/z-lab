// 헤드리스 픽스처 러너 — 입력열(드래그 벡터 시퀀스)을 먹여 스테이지를 끝까지 돌린다.
// 브라우저 없이 물리·턴 판정만 돌기 때문에 커맨드로 "클리어 가능"을 주장할 수 있다.

import { FIXED_STEP_SEC } from '../src/physics/units';
import { loadStage } from '../src/game/world';
import { releaseBird } from '../src/game/launch';
import { stepTurn } from '../src/game/turn';
import { finalizeScore } from '../src/game/score';
import type { StageDef } from '../src/stages/schema';

export interface AimInput {
  dragX: number;
  dragY: number;
}

export interface FixtureResult {
  cleared: boolean;
  birdsUsed: number;
  steps: number;
  pigsAlive: number;
  score: number;
  msPerStep: number;
}

export function runFixture(def: StageDef, inputs: AimInput[]): FixtureResult {
  const world = loadStage(def);
  let steps = 0;
  let cleared = false;
  let inputIndex = 0;
  const started = performance.now();

  while (steps < def.stepCap) {
    if (world.turnPhase === 'AIMING' && world.birdOnSling) {
      const aim = inputs[Math.min(inputIndex, inputs.length - 1)];
      inputIndex++;
      releaseBird(world, aim.dragX, aim.dragY);
    }

    world.adapter.step(FIXED_STEP_SEC);
    steps++;
    const outcome = stepTurn(world);

    if (outcome === 'CLEAR') {
      cleared = true;
      break;
    }
    if (outcome === 'FAIL') break;
  }

  const elapsed = performance.now() - started;
  const score = cleared ? finalizeScore(world.score, world.birdsRemaining) : world.score.total;
  const result: FixtureResult = {
    cleared,
    birdsUsed: world.birdsUsed,
    steps,
    pigsAlive: world.pigsAlive,
    score,
    msPerStep: steps > 0 ? elapsed / steps : 0,
  };
  world.adapter.destroy();
  return result;
}

/** 드래그 벡터는 "발사 방향의 반대"다. 각도(도)·힘(0–1)로 만든다. */
export function aim(angleDeg: number, power: number): AimInput {
  const rad = (angleDeg * Math.PI) / 180;
  const len = 120 * Math.max(0, Math.min(1, power));
  return { dragX: -Math.cos(rad) * len, dragY: Math.sin(rad) * len };
}
