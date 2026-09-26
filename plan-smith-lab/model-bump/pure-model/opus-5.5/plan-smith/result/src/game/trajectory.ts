// 궤적 예측 (§4.4): 해석식 대신, 바디 하나만 있는 미니 Engine에서 같은 Δ로 45스텝을 돈다.
// 적분기가 실제와 같으므로 충돌 전까지 예측과 실제가 어긋날 수 없다.
import Matter from 'matter-js';
import type { Engine } from 'matter-js';
import { ANCHOR, LAUNCH_K, STEP_MS, TRAJ_EVERY, TRAJ_STEPS } from '../config';
import type { BirdType, Vec2 } from '../types';
import { createBirdBody, createEngine } from '../physics/world-factory';

const { Engine: MEngine, Composite, Body } = Matter;

let mini: Engine | null = null;

function miniEngine(): Engine {
  if (!mini) mini = createEngine();
  return mini;
}

export function launchPosition(pull: Vec2): Vec2 {
  return { x: ANCHOR.x - pull.x, y: ANCHOR.y - pull.y };
}

export function launchVelocity(pull: Vec2): Vec2 {
  return { x: pull.x * LAUNCH_K, y: pull.y * LAUNCH_K };
}

/**
 * pull로 발사했을 때의 위치를 every 스텝마다 기록해 돌려준다.
 * 기본값 45스텝/3스텝 → 점 15개.
 */
export function predictTrajectory(
  type: BirdType,
  pull: Vec2,
  steps: number = TRAJ_STEPS,
  every: number = TRAJ_EVERY,
): Vec2[] {
  const engine = miniEngine();
  Composite.clear(engine.world, false);
  const start = launchPosition(pull);
  const body = createBirdBody(type, start.x, start.y);
  Composite.add(engine.world, body);
  Body.setVelocity(body, launchVelocity(pull));
  const out: Vec2[] = [];
  for (let i = 1; i <= steps; i++) {
    MEngine.update(engine, STEP_MS);
    if (i % every === 0) out.push({ x: body.position.x, y: body.position.y });
  }
  Composite.remove(engine.world, body);
  return out;
}
