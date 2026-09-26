import Matter from 'matter-js';
import type { PigSize } from '../levels/types';
import { PIG, PIG_SIZES } from '../physics/Materials';
import { allocEntityId, type Entity } from './Entity';

const { Bodies } = Matter;

/** 돼지 생성. (x, bottomY) 는 바닥 중심 좌표. */
export function createPig(size: PigSize, x: number, bottomY: number): Entity {
  const { r, health } = PIG_SIZES[size];
  const body = Bodies.circle(x, bottomY - r, r, {
    density: PIG.density,
    friction: PIG.friction,
    restitution: PIG.restitution,
    frictionAir: PIG.frictionAir,
    label: `pig:${size}`,
  });
  return {
    id: allocEntityId(),
    kind: 'pig',
    body,
    health,
    maxHealth: health,
    alive: true,
    pigSize: size,
    r,
  };
}
