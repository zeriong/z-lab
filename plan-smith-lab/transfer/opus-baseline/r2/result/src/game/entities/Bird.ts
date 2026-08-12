import { IPhysicsBody, PhysicsWorld } from '../../physics/PhysicsWorld';
import { BirdType } from '../../data/levelSchema';
import { getMaterial } from '../../physics/materials';

export class Bird {
  id: string;
  type: BirdType;
  physicsBody: IPhysicsBody;
  x: number;
  y: number;
  radius: number = 12;
  alive: boolean = true;
  outOfBounds: boolean = false;

  private worldBounds = { minX: -100, maxX: 2500, minY: -100, maxY: 900 };

  constructor(id: string, type: BirdType, x: number, y: number, physics: PhysicsWorld) {
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;

    const material = getMaterial('bird');
    this.physicsBody = physics.addCircle(x, y, this.radius, {
      density: material.density,
      friction: material.friction,
      restitution: material.restitution,
      label: 'bird'
    });

    physics.setStatic(this.physicsBody, true);
  }

  update(dt: number): void {
    this.x = this.physicsBody.body.position.x;
    this.y = this.physicsBody.body.position.y;

    // Check bounds
    if (
      this.x < this.worldBounds.minX ||
      this.x > this.worldBounds.maxX ||
      this.y > this.worldBounds.maxY
    ) {
      this.outOfBounds = true;
    }
  }

  launch(impulseX: number, impulseY: number, physics: PhysicsWorld): void {
    physics.setStatic(this.physicsBody, false);
    physics.applyImpulse(this.physicsBody, impulseX, impulseY);
  }

  activate(): void {
    // For speed bird special ability
  }

  render(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number): void {
    const x = this.x - offsetX;
    const y = this.y - offsetY;

    // Draw bird circle
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(x, y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw eyes
    const eyeRadius = 3;
    const eyeOffsetX = 4;
    const eyeOffsetY = -3;

    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x - eyeOffsetX, y + eyeOffsetY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + eyeOffsetX, y + eyeOffsetY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw pupils
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(x - eyeOffsetX + 1, y + eyeOffsetY - 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + eyeOffsetX + 1, y + eyeOffsetY - 1, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Draw beak
    ctx.fillStyle = '#FF6B00';
    ctx.beginPath();
    ctx.arc(x + this.radius - 2, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  dispose(): void {
    this.alive = false;
  }
}
