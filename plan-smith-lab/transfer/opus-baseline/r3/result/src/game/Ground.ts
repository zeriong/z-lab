import { PhysicsWorld } from '../physics/PhysicsWorld';
import { MATERIALS } from '../physics/materials';

export class Ground {
  id: string;
  private physicsWorld: PhysicsWorld;

  constructor(physicsWorld: PhysicsWorld, x: number, y: number, w: number, h: number) {
    this.physicsWorld = physicsWorld;

    const material = MATERIALS.ground;
    this.id = physicsWorld.addBody('rect', x, y, {
      width: w,
      height: h,
      density: material.density,
      friction: material.friction,
      restitution: material.restitution,
      isStatic: true,
    });
  }

  dispose(): void {
    this.physicsWorld.removeBody(this.id);
  }
}
