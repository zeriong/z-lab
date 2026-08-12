import Matter from 'matter-js';
import { PhysicsAdapter } from '../engine/physicsAdapter';
import { LaunchVector } from './slingshotInput';

/**
 * 스텝 4 — 릴리즈 시 물리 투입. 로드베어링 hop2: 드래그 릴리즈 → 발사 속도 벡터가
 * Matter.Body에 적용된다.
 */
export function launchProjectile(
  adapter: PhysicsAdapter,
  projectile: Matter.Body,
  launch: LaunchVector
): void {
  adapter.setVelocity(projectile, { x: launch.vx, y: launch.vy });
}

export function spawnProjectileAtAnchor(anchor: { x: number; y: number }, radius = 15): Matter.Body {
  return Matter.Bodies.circle(anchor.x, anchor.y, radius, {
    label: 'projectile',
    density: 0.02,
  });
}
