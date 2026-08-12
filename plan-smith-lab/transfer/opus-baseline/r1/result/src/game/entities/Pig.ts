import Matter from 'matter-js';
import { PhysicsWorld, PhysicsBody } from '../../physics/PhysicsWorld';
import { getMaterial } from '../../physics/materials';

export interface PigConfig {
  size: 'small' | 'medium' | 'large';
  x: number;
  y: number;
}

export class Pig {
  private id: string;
  private physicsBody: PhysicsBody;
  private currentHp: number;
  private config: PigConfig;
  private isDead: boolean = false;

  constructor(id: string, config: PigConfig, physicsWorld: PhysicsWorld) {
    this.id = id;
    this.config = config;

    const material = getMaterial('pig');
    this.currentHp = material.hp;

    const radius = config.size === 'small' ? 12 : config.size === 'medium' ? 16 : 20;

    const matterBody = Matter.Bodies.circle(config.x, config.y, radius, {
      restitution: material.restitution,
      friction: material.friction,
      frictionAir: 0.01,
    });

    Matter.Body.setDensity(matterBody, material.density);

    this.physicsBody = physicsWorld.addBody(id, matterBody, 'pig', this.currentHp);
  }

  getId(): string {
    return this.id;
  }

  takeDamage(amount: number) {
    this.currentHp -= amount;
    if (this.currentHp <= 0) {
      this.isDead = true;
    }
  }

  kill() {
    this.isDead = true;
    this.currentHp = 0;
  }

  isDying(): boolean {
    return this.isDead;
  }

  getPhysicsBody(): PhysicsBody {
    return this.physicsBody;
  }

  getConfig(): PigConfig {
    return this.config;
  }

  getRadius(): number {
    const size = this.config.size;
    return size === 'small' ? 12 : size === 'medium' ? 16 : 20;
  }

  getPosition(): { x: number; y: number } {
    return {
      x: this.physicsBody.body.position.x,
      y: this.physicsBody.body.position.y,
    };
  }
}
