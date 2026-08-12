import { IPhysicsBody, PhysicsWorld } from '../../physics/PhysicsWorld';
import { BlockShape, MaterialType } from '../../data/levelSchema';
import { getMaterial } from '../../physics/materials';

export class Block {
  id: string;
  shape: BlockShape;
  material: MaterialType;
  physicsBody: IPhysicsBody;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  angle: number = 0;
  hp: number;
  maxHp: number;
  alive: boolean = true;

  constructor(
    id: string,
    shape: BlockShape,
    material: MaterialType,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    angle: number,
    physics: PhysicsWorld
  ) {
    this.id = id;
    this.shape = shape;
    this.material = material;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.radius = radius;
    this.angle = angle;

    const materialProps = getMaterial(material);
    this.maxHp = materialProps.hp;
    this.hp = this.maxHp;

    if (shape === 'circle') {
      this.physicsBody = physics.addCircle(x, y, radius, {
        density: materialProps.density,
        friction: materialProps.friction,
        restitution: materialProps.restitution,
        label: `block_${material}`
      });
    } else {
      this.physicsBody = physics.addRectangle(x, y, width, height, angle, {
        density: materialProps.density,
        friction: materialProps.friction,
        restitution: materialProps.restitution,
        label: `block_${material}`
      });
    }
  }

  update(dt: number): void {
    this.x = this.physicsBody.body.position.x;
    this.y = this.physicsBody.body.position.y;
    this.angle = this.physicsBody.body.angle;

    // Check if fallen off
    if (this.y > 850) {
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

    // Color based on material
    let color: string;
    switch (this.material) {
      case 'glass':
        color = '#88DDFF';
        break;
      case 'wood':
        color = '#8B6F47';
        break;
      case 'stone':
        color = '#808080';
        break;
      default:
        color = '#CCCCCC';
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.angle);

    if (this.shape === 'circle') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
    }

    ctx.restore();
  }

  dispose(): void {
    this.alive = false;
  }
}
