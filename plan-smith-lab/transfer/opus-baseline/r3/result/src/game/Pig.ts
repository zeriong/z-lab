import { Vector } from '../core/types';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { MATERIALS } from '../physics/materials';

export class Pig {
  id: string;
  position: Vector;
  size: string;
  hp: number;
  isDead: boolean = false;
  private physicsWorld: PhysicsWorld;

  constructor(physicsWorld: PhysicsWorld, size: string, x: number, y: number) {
    this.physicsWorld = physicsWorld;
    this.size = size;
    this.position = { x, y };

    const material = MATERIALS.pig;
    this.hp = material.hp;

    this.id = physicsWorld.addBody('circle', x, y, {
      radius: size === 'small' ? 14 : 20,
      density: material.density,
      friction: material.friction,
      restitution: material.restitution,
      hp: material.hp,
    });

    physicsWorld.onCollision(this.id, (otherId, impulse) => {
      this.takeDamage(impulse);
    });
  }

  takeDamage(impulse: number): void {
    if (this.isDead) return;

    const material = MATERIALS.pig;
    const damage = Math.max(0, (impulse - material.damageThreshold) * material.damageScale);
    this.hp -= damage;

    if (this.hp <= 0) {
      this.die();
    }
  }

  private die(): void {
    this.isDead = true;
  }

  getPosition(): Vector {
    const pos = this.physicsWorld.getPosition(this.id);
    if (pos) {
      this.position = pos;
    }
    return this.position;
  }

  dispose(): void {
    this.physicsWorld.removeBody(this.id);
  }
}
