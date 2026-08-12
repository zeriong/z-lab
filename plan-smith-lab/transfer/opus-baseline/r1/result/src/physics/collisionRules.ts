import Matter from 'matter-js';
import { PhysicsBody } from './PhysicsWorld';
import { getMaterial } from './materials';

export interface DamageInfo {
  damage: number;
  sourceBody: PhysicsBody;
  targetBody: PhysicsBody;
  impulse: number;
}

export function calculateDamage(bodyA: PhysicsBody, bodyB: PhysicsBody): DamageInfo | null {
  // Get materials
  const matA = getMaterial(bodyA.type);
  const matB = getMaterial(bodyB.type);

  // Calculate relative velocity in collision normal
  const vAx = bodyA.body.velocity.x;
  const vAy = bodyA.body.velocity.y;
  const vBx = bodyB.body.velocity.x;
  const vBy = bodyB.body.velocity.y;

  const relVx = vAx - vBx;
  const relVy = vAy - vBy;
  const relV = Math.sqrt(relVx * relVx + relVy * relVy);

  // Approximate kinetic energy as impact
  const effectiveMass = (bodyA.body.mass * bodyB.body.mass) / (bodyA.body.mass + bodyB.body.mass);
  const impact = 0.5 * effectiveMass * relV * relV;

  // Apply damage to blocks/pigs
  if (bodyA.type === 'block' || bodyA.type === 'pig') {
    const damage = Math.max(0, (impact - matA.damageThreshold) * matA.damageScale);
    if (damage > 0) {
      return {
        damage,
        sourceBody: bodyB,
        targetBody: bodyA,
        impulse: impact,
      };
    }
  }

  if (bodyB.type === 'block' || bodyB.type === 'pig') {
    const damage = Math.max(0, (impact - matB.damageThreshold) * matB.damageScale);
    if (damage > 0) {
      return {
        damage,
        sourceBody: bodyA,
        targetBody: bodyB,
        impulse: impact,
      };
    }
  }

  return null;
}

export function applyImpulse(body: Matter.Body, forceX: number, forceY: number) {
  Matter.Body.applyForce(body, body.position, { x: forceX, y: forceY });
}
