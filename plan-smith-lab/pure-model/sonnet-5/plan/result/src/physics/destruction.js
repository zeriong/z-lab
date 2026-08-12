import Matter from 'matter-js';
import { DAMAGE_SCALE, PIG_KILL_THRESHOLD } from '../config.js';

const { Events, Composite, Vector } = Matter;

/**
 * 계획서 §6-2, §6-3: 충돌 데미지/돼지 제거 판정을 처리하는 collisionStart 핸들러를 엔진에 1회 등록한다.
 * 스테이지가 바뀌어도 엔진과 리스너는 유지하고, 매 호출 시 getStageState()로 "현재" 스테이지를 조회한다
 * (스테이지 전환 시마다 리스너를 재등록/해제할 필요가 없도록 하기 위함).
 *
 * @param {Matter.Engine} engine
 * @param {() => (StageState|null)} getStageState
 * @param {{
 *   onBlockDestroyed: (body: Matter.Body) => void,
 *   onPigDestroyed: (body: Matter.Body) => void,
 * }} callbacks
 */
export function attachDestructionHandler(engine, getStageState, callbacks) {
  Events.on(engine, 'collisionStart', (event) => {
    const stageState = getStageState();
    if (!stageState) return;

    for (const pair of event.pairs) {
      const { bodyA, bodyB, collision } = pair;
      const relativeVelocity = Vector.sub(bodyA.velocity, bodyB.velocity);
      const speedAlongNormal = Math.abs(Vector.dot(relativeVelocity, collision.normal));

      handleBody(bodyA, speedAlongNormal, stageState, callbacks, engine.world);
      handleBody(bodyB, speedAlongNormal, stageState, callbacks, engine.world);
    }
  });
}

function handleBody(body, speed, stageState, callbacks, world) {
  const plugin = body.plugin;
  if (!plugin || plugin.destroyed) return;

  if (plugin.role === 'block') {
    // §6-2: 데미지 계산식은 재질 무관 공통 계수. 재질별 차이는 hp로만 구현한다.
    plugin.hp -= speed * DAMAGE_SCALE;
    if (plugin.hp <= 0) {
      plugin.destroyed = true;
      Composite.remove(world, body);
      const index = stageState.blocks.indexOf(body);
      if (index !== -1) stageState.blocks.splice(index, 1);
      callbacks.onBlockDestroyed(body);
    }
  } else if (plugin.role === 'pig') {
    // §6-3: hp 없이 단일 임계 충격량으로 즉발 판정. "무엇에 맞았는가"는 보지 않는다.
    if (speed >= PIG_KILL_THRESHOLD) {
      plugin.destroyed = true;
      Composite.remove(world, body);
      const index = stageState.pigs.indexOf(body);
      if (index !== -1) stageState.pigs.splice(index, 1);
      callbacks.onPigDestroyed(body);
    }
  }
}
