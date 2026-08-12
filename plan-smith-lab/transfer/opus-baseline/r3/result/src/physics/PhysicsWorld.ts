import Matter, {
  Engine,
  World,
  Body,
  Events,
  Bodies,
} from 'matter-js';
import { Vector } from '../core/types';

export interface PhysicsBody {
  id: string;
  body: Matter.Body;
  hp?: number;
}

export class PhysicsWorld {
  private engine: Engine;
  private world: World;
  private bodies: Map<string, PhysicsBody> = new Map();
  private collisionCallbacks: Map<string, Set<(other: string, impulse: number) => void>> =
    new Map();
  private bodyIdCounter: number = 0;

  constructor(gravity: number = 1) {
    this.engine = Engine.create();
    this.world = this.engine.world;
    this.world.gravity.y = gravity;

    // Configure solver for stable stacking
    this.engine.constraintIterations = 6;
    this.engine.positionIterations = 6;
    this.engine.velocityIterations = 4;

    this.setupCollisionDetection();
  }

  private setupCollisionDetection(): void {
    Events.on(this.engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const idA = (pair.bodyA as any).gameId;
        const idB = (pair.bodyB as any).gameId;

        if (idA && idB) {
          // Calculate impact
          const relV = pair.separation || 0;
          const contactForce = Math.abs(relV) * 0.5;

          const cbsA = this.collisionCallbacks.get(idA);
          if (cbsA) {
            cbsA.forEach((cb) => cb(idB, contactForce));
          }

          const cbsB = this.collisionCallbacks.get(idB);
          if (cbsB) {
            cbsB.forEach((cb) => cb(idA, contactForce));
          }
        }
      });
    });
  }

  addBody(
    shape: 'rect' | 'circle' | 'polygon',
    x: number,
    y: number,
    options: any
  ): string {
    let matterBody: Matter.Body;
    const id = `body_${this.bodyIdCounter++}`;

    if (shape === 'rect') {
      matterBody = Bodies.rectangle(x, y, options.width, options.height, {
        label: id,
        density: options.density || 0.001,
        friction: options.friction || 0.5,
        restitution: options.restitution || 0.2,
        isStatic: options.isStatic || false,
      });
    } else if (shape === 'circle') {
      matterBody = Bodies.circle(x, y, options.radius, {
        label: id,
        density: options.density || 0.001,
        friction: options.friction || 0.5,
        restitution: options.restitution || 0.2,
        isStatic: options.isStatic || false,
      });
    } else {
      throw new Error(`Unsupported shape: ${shape}`);
    }

    (matterBody as any).gameId = id;
    World.add(this.world, matterBody);

    this.bodies.set(id, {
      id,
      body: matterBody,
      hp: options.hp,
    });

    this.collisionCallbacks.set(id, new Set());

    return id;
  }

  removeBody(id: string): void {
    const physicsBody = this.bodies.get(id);
    if (physicsBody) {
      World.remove(this.world, physicsBody.body);
      this.bodies.delete(id);
      this.collisionCallbacks.delete(id);
    }
  }

  getBody(id: string): Matter.Body | null {
    const pb = this.bodies.get(id);
    return pb ? pb.body : null;
  }

  getPosition(id: string): Vector | null {
    const body = this.getBody(id);
    if (!body) return null;
    return { x: body.position.x, y: body.position.y };
  }

  setPosition(id: string, x: number, y: number): void {
    const body = this.getBody(id);
    if (body) {
      Body.setPosition(body, { x, y });
    }
  }

  getRotation(id: string): number {
    const body = this.getBody(id);
    return body ? body.angle : 0;
  }

  getVelocity(id: string): Vector | null {
    const body = this.getBody(id);
    if (!body) return null;
    return { x: body.velocity.x, y: body.velocity.y };
  }

  applyForce(id: string, fx: number, fy: number): void {
    const body = this.getBody(id);
    if (body) {
      Body.applyForce(body, body.position, { x: fx, y: fy });
    }
  }

  applyImpulse(id: string, ix: number, iy: number): void {
    const body = this.getBody(id);
    if (body) {
      Body.setVelocity(body, { x: ix, y: iy });
    }
  }

  setVelocity(id: string, vx: number, vy: number): void {
    const body = this.getBody(id);
    if (body) {
      Body.setVelocity(body, { x: vx, y: vy });
    }
  }

  setAngularVelocity(id: string, av: number): void {
    const body = this.getBody(id);
    if (body) {
      Body.setAngularVelocity(body, av);
    }
  }

  onCollision(id: string, callback: (otherId: string, impulse: number) => void): void {
    const cbs = this.collisionCallbacks.get(id);
    if (cbs) {
      cbs.add(callback);
    }
  }

  step(dt: number): void {
    Engine.update(this.engine, dt * 1000);
  }

  getBodies(): PhysicsBody[] {
    return Array.from(this.bodies.values());
  }

  dispose(): void {
    this.bodies.clear();
    this.collisionCallbacks.clear();
  }
}
