import Matter from 'matter-js';
import { PhysicsWorld, PhysicsBody } from '../../physics/PhysicsWorld';

export interface GroundConfig {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class Ground {
  private id: string;
  private physicsBody: PhysicsBody;
  private config: GroundConfig;

  constructor(id: string, config: GroundConfig, physicsWorld: PhysicsWorld) {
    this.id = id;
    this.config = config;

    const matterBody = Matter.Bodies.rectangle(config.x, config.y, config.w, config.h, {
      isStatic: true,
      restitution: 0.0,
      friction: 0.8,
      frictionStatic: 1.0,
    });

    this.physicsBody = physicsWorld.addBody(id, matterBody, 'ground');
  }

  getId(): string {
    return this.id;
  }

  getPhysicsBody(): PhysicsBody {
    return this.physicsBody;
  }

  getConfig(): GroundConfig {
    return this.config;
  }

  getPosition(): { x: number; y: number } {
    return {
      x: this.physicsBody.body.position.x,
      y: this.physicsBody.body.position.y,
    };
  }

  getSize(): { w: number; h: number } {
    return {
      w: this.config.w,
      h: this.config.h,
    };
  }
}
