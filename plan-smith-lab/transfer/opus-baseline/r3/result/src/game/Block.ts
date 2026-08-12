import { Vector } from '../core/types';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { MATERIALS, Material } from '../physics/materials';

export class Block {
  id: string;
  type: string;
  shape: string;
  position: Vector;
  size: { w?: number; h?: number; r?: number };
  hp: number;
  isDestroyed: boolean = false;
  private physicsWorld: PhysicsWorld;
  private material: Material;
  private rotation: number = 0;

  constructor(
    physicsWorld: PhysicsWorld,
    type: string,
    shape: string,
    x: number,
    y: number,
    size: { w?: number; h?: number; r?: number },
    angle: number = 0
  ) {
    this.physicsWorld = physicsWorld;
    this.type = type;
    this.shape = shape;
    this.position = { x, y };
    this.size = size;
    this.rotation = angle;

    const material = MATERIALS[type];
    if (!material) throw new Error(`Unknown material: ${type}`);
    this.material = material;
    this.hp = material.hp;

    const width = size.w || size.r! * 2;
    const height = size.h || size.r! * 2;

    this.id = physicsWorld.addBody(shape as 'rect' | 'circle', x, y, {
      width,
      height,
      radius: size.r,
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
    if (this.isDestroyed) return;

    const damage = Math.max(
      0,
      (impulse - this.material.damageThreshold) * this.material.damageScale
    );
    this.hp -= damage;

    if (this.hp <= 0) {
      this.destroy();
    }
  }

  private destroy(): void {
    this.isDestroyed = true;
  }

  getPosition(): Vector {
    const pos = this.physicsWorld.getPosition(this.id);
    if (pos) {
      this.position = pos;
    }
    return this.position;
  }

  getRotation(): number {
    return this.physicsWorld.getRotation(this.id);
  }

  getMaterial(): Material {
    return this.material;
  }

  dispose(): void {
    this.physicsWorld.removeBody(this.id);
  }
}
