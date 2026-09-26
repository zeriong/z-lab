import Matter from 'matter-js';
import type { Vec } from '../core/math';
import type { BirdKind } from '../levels/types';
import { BIRD } from '../physics/Materials';
import { allocEntityId, type Entity } from './Entity';

const { Bodies, Body } = Matter;

/**
 * 새 생성. 동적으로 만든 뒤 setStatic(true) 로 새총 위에 고정한다
 * (이 순서여야 Matter 가 원래 질량을 _original 에 보관해 발사 시 복원한다).
 */
export function createBird(kind: BirdKind, pos: Vec): Entity {
  const body = Bodies.circle(pos.x, pos.y, BIRD.r, {
    density: BIRD.density,
    friction: BIRD.friction,
    restitution: BIRD.restitution,
    frictionAir: BIRD.frictionAir,
    label: `bird:${kind}`,
  });
  Body.setStatic(body, true);
  return {
    id: allocEntityId(),
    kind: 'bird',
    body,
    health: Infinity,
    maxHealth: Infinity,
    alive: true,
    birdKind: kind,
    r: BIRD.r,
  };
}
