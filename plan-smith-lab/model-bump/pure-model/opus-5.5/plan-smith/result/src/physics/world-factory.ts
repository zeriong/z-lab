// StageData → Matter 바디 + registry (§4.9)
import Matter from 'matter-js';
import type { Body, Engine } from 'matter-js';
import {
  BIRD_FRICTION,
  BIRDS,
  GRAVITY_SCALE,
  GRAVITY_Y,
  GROUND_Y,
  MATERIALS,
  PIGS,
  POSITION_ITERATIONS,
  VELOCITY_ITERATIONS,
  WORLD_W,
} from '../config';
import type { BirdType, StageData } from '../types';
import type { EntityRegistry } from './entities';

const { Engine: MEngine, Bodies, Composite } = Matter;

/** 모든 세션·미니 엔진이 같은 설정을 쓰도록 한 곳에서 만든다 */
export function createEngine(): Engine {
  const engine = MEngine.create({
    positionIterations: POSITION_ITERATIONS,
    velocityIterations: VELOCITY_ITERATIONS,
    enableSleeping: false,
  });
  engine.gravity.x = 0;
  engine.gravity.y = GRAVITY_Y;
  engine.gravity.scale = GRAVITY_SCALE;
  return engine;
}

/**
 * 원 바디의 변 수. 4의 배수로 두면 다각형의 바닥이 평평한 변이 되어
 * 놓인 원이 처음에 기울어진 면으로 구르지 않는다.
 */
export function circleSides(r: number): number {
  return Math.max(12, Math.min(24, Math.round(r / 4) * 4));
}

/** 새 바디끼리는 충돌하지 않는다 (파랑 분열 조각) */
export const BIRD_GROUP = -1;

export function createGround(): Body {
  return Bodies.rectangle(WORLD_W / 2, GROUND_Y + 60, WORLD_W + 800, 120, {
    isStatic: true,
    friction: 0.9,
    restitution: 0,
    label: 'ground',
  });
}

export function createBirdBody(type: BirdType, x: number, y: number, radius?: number): Body {
  const spec = BIRDS[type];
  const r = radius ?? spec.radius;
  return Bodies.circle(
    x,
    y,
    r,
    {
      density: spec.density,
      friction: BIRD_FRICTION,
      frictionAir: 0, // §4.4: 예측과 실제가 같은 적분을 하도록
      restitution: 0.2,
      label: 'bird',
      collisionFilter: { group: BIRD_GROUP, category: 0x0001, mask: 0xffffffff },
    },
    circleSides(r),
  );
}

export interface BuiltWorld {
  pigCount: number;
  bodyCount: number;
}

export function buildWorld(engine: Engine, registry: EntityRegistry, stage: StageData): BuiltWorld {
  const bodies: Body[] = [];

  const ground = createGround();
  registry.add(ground, { kind: 'static' });
  bodies.push(ground);

  for (const s of stage.statics ?? []) {
    const b = Bodies.rectangle(s.x, s.y, s.w, s.h, {
      isStatic: true,
      angle: s.angle ?? 0,
      friction: 0.9,
      restitution: 0,
      label: 'static',
    });
    registry.add(b, { kind: 'static' });
    bodies.push(b);
  }

  for (const def of stage.blocks) {
    const m = MATERIALS[def.material];
    const opts = {
      density: m.density,
      friction: m.friction,
      frictionStatic: 0.8,
      restitution: m.restitution,
      label: 'block',
    };
    const b =
      def.kind === 'box'
        ? Bodies.rectangle(def.x, def.y, def.w, def.h, { ...opts, angle: def.angle ?? 0 })
        : Bodies.circle(def.x, def.y, def.r, opts, circleSides(def.r));
    registry.add(b, { kind: 'block', material: def.material, hp: m.hp, maxHp: m.hp });
    bodies.push(b);
  }

  for (const p of stage.pigs) {
    const spec = PIGS[p.type];
    const b = Bodies.circle(
      p.x,
      p.y,
      spec.radius,
      {
        density: spec.density,
        friction: spec.friction,
        frictionStatic: 0.8,
        restitution: spec.restitution,
        label: 'pig',
      },
      circleSides(spec.radius),
    );
    registry.add(b, { kind: 'pig', pigType: p.type, hp: spec.hp, maxHp: spec.hp });
    bodies.push(b);
  }

  Composite.add(engine.world, bodies);
  return { pigCount: stage.pigs.length, bodyCount: bodies.length };
}
