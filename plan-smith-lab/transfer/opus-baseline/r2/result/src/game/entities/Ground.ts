import { IPhysicsBody, PhysicsWorld } from '../../physics/PhysicsWorld';
import { getMaterial } from '../../physics/materials';

export class Ground {
  id: string;
  physicsBody: IPhysicsBody;
  x: number;
  y: number;
  width: number;
  height: number;

  constructor(id: string, x: number, y: number, width: number, height: number, physics: PhysicsWorld) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    const material = getMaterial('ground');
    this.physicsBody = physics.addRectangle(x + width / 2, y + height / 2, width, height, 0, {
      density: 0,
      friction: material.friction,
      restitution: 0,
      isStatic: true,
      label: 'ground'
    });
  }

  render(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number): void {
    const x = this.x - offsetX;
    const y = this.y - offsetY;

    // Draw ground
    ctx.fillStyle = '#654321';
    ctx.fillRect(x, y, this.width, this.height);

    // Draw texture
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    for (let i = 0; i < this.width; i += 20) {
      for (let j = 0; j < this.height; j += 20) {
        ctx.fillRect(x + i, y + j, 10, 10);
      }
    }
  }
}
