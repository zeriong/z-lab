import Matter from 'matter-js';
import { GRAVITY, PHYSICS_ITERATIONS } from '../config.js';

const { Engine } = Matter;

/**
 * 계획서 §6-1: 충돌 카테고리 4종. 모든 그룹은 서로 충돌하도록 mask는 기본(전체 허용)으로 둔다.
 * 카테고리는 이벤트 처리 로직(§6-2, §6-3)에서 body.plugin.role 로 분기하는 데 사용한다.
 */
export const CATEGORY = {
  BIRD: 0x0001,
  PIG: 0x0002,
  BLOCK: 0x0004,
  GROUND: 0x0008,
};

/**
 * Matter Engine/World를 생성한다. 렌더는 별도(§1-2, Matter 내장 Render 모듈 미사용).
 * @returns {{ engine: Matter.Engine, world: Matter.World }}
 */
export function createWorld() {
  const engine = Engine.create();
  engine.gravity.y = GRAVITY.y;
  engine.gravity.scale = GRAVITY.scale;
  engine.positionIterations = PHYSICS_ITERATIONS.position;
  engine.velocityIterations = PHYSICS_ITERATIONS.velocity;
  return { engine, world: engine.world };
}
