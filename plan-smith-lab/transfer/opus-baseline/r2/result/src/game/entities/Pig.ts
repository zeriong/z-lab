import { IPhysicsBody, PhysicsWorld } from '../../physics/PhysicsWorld';
import { PigSize } from '../../data/levelSchema';
import { getMaterial } from '../../physics/materials';

export class Pig {
  id: string;
  size: PigSize;
  physicsBody: IPhysicsBody;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  alive: boolean = true;
  radius: number;

  constructor(id: string, size: PigSize, x: number, y: number, physics: PhysicsWorld) {
    this.id = id;
    this.size = size;
    this.x = x;
    this.y = y;

    // Size determines radius
    switch (size) {
      case 'small':
        this.radius = 10;
        break;
      case 'medium':
        this.radius = 14;
        break;
      case 'large':
        this.radius = 18;
        break;
    }

    const material = getMaterial('pig');
    this.maxHp = material.hp;
    this.hp = this.maxHp;

    this.physicsBody = physics.addCircle(x, y, this.radius, {
      density: material.density,
      friction: material.friction,
      restitution: material.restitution,
      label: 'pig'
    });
  }

  update(dt: number): void {
    this.x = this.physicsBody.body.position.x;
    this.y = this.physicsBody.body.position.y;

    // Check if fallen off the world
    if (this.y > 800) {
      this.alive = false;
    }
  }

  takeDamage(damage: number): void {
    this.hp -= damage;
    if (this.hp <= 0) {
      this.alive = false;
    }
  }

  render(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number): void {
    const x = this.x - offsetX;
    const y = this.y - offsetY;

    // Draw pig body
    ctx.fillStyle = '#00DD00';
    ctx.beginPath();
    ctx.arc(x, y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw snout
    ctx.fillStyle = '#00CC00';
    ctx.beginPath();
    ctx.arc(x - this.radius + 3, y, 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw eyes
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x - 4, y - 4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 4, y - 4, 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw pupils
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(x - 4, y - 4, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 4, y - 4, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  dispose(): void {
    this.alive = false;
  }
}
