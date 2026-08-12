import Matter from 'matter-js';
import { PhysicsWorld, PhysicsBody } from '../../physics/PhysicsWorld';
import { getMaterial } from '../../physics/materials';

export interface BlockConfig {
  x: number;
  y: number;
  w?: number;
  h?: number;
  r?: number;
  angle: number;
  type: 'wood' | 'glass' | 'stone';
  shape: 'rect' | 'circle';
}

export class Block {
  private id: string;
  private physicsBody: PhysicsBody;
  private currentHp: number;
  private config: BlockConfig;
  private damage: number = 0;

  constructor(id: string, config: BlockConfig, physicsWorld: PhysicsWorld) {
    this.id = id;
    this.config = config;

    const material = getMaterial(config.type);
    this.currentHp = material.hp;

    let matterBody: Matter.Body;

    if (config.shape === 'rect') {
      matterBody = Matter.Bodies.rectangle(config.x, config.y, config.w || 20, config.h || 20, {
        angle: config.angle,
        restitution: material.restitution,
        friction: material.friction,
        frictionAir: 0.01,
      });
    } else {
      matterBody = Matter.Bodies.circle(config.x, config.y, config.r || 10, {
        restitution: material.restitution,
        friction: material.friction,
        frictionAir: 0.01,
      });
    }

    Matter.Body.setDensity(matterBody, material.density);

    this.physicsBody = physicsWorld.addBody(id, matterBody, 'block', this.currentHp);
  }

  getId(): string {
    return this.id;
  }

  takeDamage(amount: number) {
    this.damage += amount;
    this.currentHp -= amount;
  }

  isDestroyed(): boolean {
    return this.currentHp <= 0;
  }

  getPhysicsBody(): PhysicsBody {
    return this.physicsBody;
  }

  getConfig(): BlockConfig {
    return this.config;
  }

  getCurrentHp(): number {
    return this.currentHp;
  }

  getMaxHp(): number {
    return getMaterial(this.config.type).hp;
  }

  getType(): string {
    return this.config.type;
  }

  getPosition(): { x: number; y: number } {
    return {
      x: this.physicsBody.body.position.x,
      y: this.physicsBody.body.position.y,
    };
  }

  getRotation(): number {
    return this.physicsBody.body.angle;
  }

  getSize(): { w: number; h: number; r: number } {
    if (this.config.shape === 'rect') {
      return {
        w: this.config.w || 20,
        h: this.config.h || 20,
        r: 0,
      };
    } else {
      return {
        w: 0,
        h: 0,
        r: this.config.r || 10,
      };
    }
  }

  getShape(): string {
    return this.config.shape;
  }
}
