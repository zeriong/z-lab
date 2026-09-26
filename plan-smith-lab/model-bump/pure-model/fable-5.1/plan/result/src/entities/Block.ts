import Matter from 'matter-js';
import type { BlockDef } from '../levels/types';
import { MATERIALS } from '../physics/Materials';
import { allocEntityId, type Entity } from './Entity';

const { Bodies } = Matter;

/** 기본 규격 (§6.4): 판자 20×80, 상자 40×40, 원 r20, 삼각 지붕 r46 (밑변 ≈ 80) */
export const DEFAULT_PLANK_W = 20;
export const DEFAULT_PLANK_H = 80;
export const DEFAULT_BALL_R = 20;
export const DEFAULT_TRI_R = 46;

/**
 * 블록 생성. (x, y) 는 바닥 중심 좌표.
 * 복합 바디는 쓰지 않는다: 사각형·원·정삼각형(볼록)만 → poly-decomp 불필요.
 */
export function createBlock(def: BlockDef): Entity {
  const m = MATERIALS[def.material];
  const opts: Matter.IChamferableBodyDefinition = {
    density: m.density,
    friction: m.friction,
    restitution: m.restitution,
    frictionAir: m.frictionAir,
    label: `block:${def.material}:${def.shape}`,
  };

  let body: Matter.Body;
  let w: number | undefined;
  let h: number | undefined;
  let r: number | undefined;

  switch (def.shape) {
    case 'rect': {
      w = def.w ?? DEFAULT_PLANK_W;
      h = def.h ?? DEFAULT_PLANK_H;
      body = Bodies.rectangle(def.x, def.y - h / 2, w, h, { ...opts, angle: def.angle ?? 0 });
      break;
    }
    case 'circle': {
      r = def.r ?? DEFAULT_BALL_R;
      body = Bodies.circle(def.x, def.y - r, r, opts);
      break;
    }
    case 'tri': {
      r = def.r ?? DEFAULT_TRI_R;
      // Bodies.polygon 의 3각형은 꼭짓점이 왼쪽을 향하므로 +90° 돌려 위를 보게 한다.
      // 그러면 밑변은 중심에서 r/2 아래, 꼭짓점은 r 위에 온다.
      body = Bodies.polygon(def.x, def.y - r / 2, 3, r, { ...opts, angle: Math.PI / 2 });
      break;
    }
  }

  return {
    id: allocEntityId(),
    kind: 'block',
    body,
    health: m.health,
    maxHealth: m.health,
    alive: true,
    material: def.material,
    shape: def.shape,
    w,
    h,
    r,
  };
}
