import { Vector } from '../core/types';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { MATERIALS } from '../physics/materials';

export type BirdType = 'basic' | 'speed' | 'bomb';

export class Bird {
  id: string;
  type: BirdType;
  position: Vector;
  private physicsWorld: PhysicsWorld;
  private isActive: boolean = true;
  private activatedAbility: boolean = false;

  constructor(physicsWorld: PhysicsWorld, type: BirdType, x: number, y: number) {
    this.type = type;
    this.physicsWorld = physicsWorld;
    this.position = { x, y };

    const material = MATERIALS.bird;
    this.id = physicsWorld.addBody('circle', x, y, {
      radius: 16,
      density: material.density,
      friction: material.friction,
      restitution: material.restitution,
      isStatic: true,
    });

    physicsWorld.onCollision(this.id, (otherId, impulse) => {
      this.onCollision(impulse);
    });
  }

  private onCollision(impulse: number): void {
    if (!this.isActive) return;

    // Birds don't take damage, but can be marked for ability activation
    if (impulse > 500 && !this.activatedAbility && this.type !== 'basic') {
      this.activateAbility();
    }
  }

  private activateAbility(): void {
    if (this.activatedAbility) return;
    this.activatedAbility = true;

    if (this.type === 'speed') {
      const vel = this.physicsWorld.getVelocity(this.id);
      if (vel) {
        const length = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
        const boost = 3;
        this.physicsWorld.setVelocity(
          this.id,
          vel.x * boost,
          vel.y * boost
        );
      }
    } else if (this.type === 'bomb') {
      this.triggerExplosion();
    }
  }

  activateAbilityManual(): void {
    if (!this.activatedAbility) {
      this.activateAbility();
    }
  }

  private triggerExplosion(): void {
    const pos = this.physicsWorld.getPosition(this.id);
    if (!pos) return;

    const explosionRadius = 120;
    const explosionForce = 50000;

    const bodies = this.physicsWorld.getBodies();
    for (const pb of bodies) {
      if (pb.id === this.id) continue;

      const bpos = pb.body.position;
      const dx = bpos.x - pos.x;
      const dy = bpos.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < explosionRadius && dist > 0) {
        const force = explosionForce * (1 - dist / explosionRadius);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        this.physicsWorld.applyForce(pb.id, fx, fy);
      }
    }
  }

  setDynamic(): void {
    const body = this.physicsWorld.getBody(this.id);
    if (body) {
      body.isStatic = false;
    }
  }

  setPosition(x: number, y: number): void {
    this.position = { x, y };
    this.physicsWorld.setPosition(this.id, x, y);
  }

  getPosition(): Vector {
    return this.position;
  }

  setVelocity(vx: number, vy: number): void {
    this.physicsWorld.setVelocity(this.id, vx, vy);
  }

  getVelocity(): Vector {
    const vel = this.physicsWorld.getVelocity(this.id);
    return vel || { x: 0, y: 0 };
  }

  isOutOfBounds(worldWidth: number, worldHeight: number): boolean {
    return (
      this.position.x < -100 ||
      this.position.x > worldWidth + 100 ||
      this.position.y > worldHeight + 100
    );
  }

  dispose(): void {
    this.isActive = false;
    this.physicsWorld.removeBody(this.id);
  }
}
