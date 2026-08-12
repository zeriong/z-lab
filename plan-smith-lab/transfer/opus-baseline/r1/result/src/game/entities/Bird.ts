import Matter from 'matter-js';
import { PhysicsWorld, PhysicsBody } from '../../physics/PhysicsWorld';
import { getMaterial } from '../../physics/materials';

export type BirdType = 'basic' | 'speed' | 'bomb';

export interface BirdConfig {
  type: BirdType;
  x: number;
  y: number;
}

export class Bird {
  private id: string;
  private physicsBody: PhysicsBody | null = null;
  private config: BirdConfig;
  private isLaunched: boolean = false;
  private isDestroyed: boolean = false;
  private speed: number = 0;

  constructor(id: string, config: BirdConfig, physicsWorld: PhysicsWorld) {
    this.id = id;
    this.config = config;

    const material = getMaterial('bird');
    const radius = 8;

    const matterBody = Matter.Bodies.circle(config.x, config.y, radius, {
      restitution: material.restitution,
      friction: material.friction,
      frictionAir: 0.008,
      isStatic: true, // Start static, become dynamic on launch
    });

    Matter.Body.setDensity(matterBody, material.density);

    this.physicsBody = physicsWorld.addBody(id, matterBody, 'bird');
  }

  getId(): string {
    return this.id;
  }

  launch(vx: number, vy: number) {
    if (!this.physicsBody) return;
    this.isLaunched = true;
    Matter.Body.setStatic(this.physicsBody.body, false);
    Matter.Body.setVelocity(this.physicsBody.body, { x: vx, y: vy });
    this.speed = Math.sqrt(vx * vx + vy * vy);
  }

  activate() {
    // For bomb bird on-demand activation
    if (this.config.type === 'bomb') {
      // Explosion happens in Level
    }
  }

  getPhysicsBody(): PhysicsBody | null {
    return this.physicsBody;
  }

  getType(): BirdType {
    return this.config.type;
  }

  getPosition(): { x: number; y: number } {
    if (!this.physicsBody) return this.config;
    return {
      x: this.physicsBody.body.position.x,
      y: this.physicsBody.body.position.y,
    };
  }

  getVelocity(): { x: number; y: number } {
    if (!this.physicsBody) return { x: 0, y: 0 };
    return this.physicsBody.body.velocity;
  }

  getRadius(): number {
    return 8;
  }

  isLaunched_(): boolean {
    return this.isLaunched;
  }

  destroy() {
    this.isDestroyed = true;
  }

  isDestroyed_(): boolean {
    return this.isDestroyed;
  }

  getSpeed(): number {
    return this.speed;
  }

  updateSpeed() {
    if (!this.physicsBody) return;
    const v = this.physicsBody.body.velocity;
    this.speed = Math.sqrt(v.x * v.x + v.y * v.y);
  }
}
