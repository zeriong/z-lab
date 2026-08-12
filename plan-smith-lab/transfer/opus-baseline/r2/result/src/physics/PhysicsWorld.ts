import Matter from 'matter-js';

export interface IPhysicsBody {
  body: Matter.Body;
  id: string;
  type: string;
}

export type CollisionCallback = (
  bodyA: IPhysicsBody,
  bodyB: IPhysicsBody,
  relativeVelocity: number,
  isStarting: boolean
) => void;

export class PhysicsWorld {
  private engine: Matter.Engine;
  private world: Matter.World;
  private bodies: Map<string, IPhysicsBody> = new Map();
  private collisionCallbacks: CollisionCallback[] = [];
  private nextId = 0;

  private timeAccumulator = 0;
  private stepSize = 1000 / 60; // 16.67ms

  constructor(width: number, height: number, gravity: number = 1) {
    this.engine = Matter.Engine.create();
    this.world = this.engine.world;
    this.world.gravity.y = gravity;

    // Configure physics iterations
    this.engine.constraintIterations = 4;
    this.engine.positionIterations = 6;
    this.engine.velocityIterations = 4;

    // Setup collision events
    this.setupCollisions();

    // Add boundaries
    const wallThickness = 50;
    const leftWall = Matter.Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height * 2, { isStatic: true });
    const rightWall = Matter.Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height * 2, { isStatic: true });
    Matter.World.add(this.world, [leftWall, rightWall]);
  }

  private setupCollisions(): void {
    Matter.Events.on(this.engine, 'collisionStart', (event) => {
      event.pairs.forEach(pair => {
        const bodyA = this.getBodyById(pair.bodyA.id);
        const bodyB = this.getBodyById(pair.bodyB.id);

        if (bodyA && bodyB) {
          const relV = this.getRelativeVelocity(pair);
          this.collisionCallbacks.forEach(cb => cb(bodyA, bodyB, relV, true));
        }
      });
    });

    Matter.Events.on(this.engine, 'collisionEnd', (event) => {
      event.pairs.forEach(pair => {
        const bodyA = this.getBodyById(pair.bodyA.id);
        const bodyB = this.getBodyById(pair.bodyB.id);

        if (bodyA && bodyB) {
          const relV = this.getRelativeVelocity(pair);
          this.collisionCallbacks.forEach(cb => cb(bodyA, bodyB, relV, false));
        }
      });
    });
  }

  private getRelativeVelocity(pair: Matter.Pair): number {
    const vA = pair.bodyA.velocity;
    const vB = pair.bodyB.velocity;
    const nx = pair.normal.x;
    const ny = pair.normal.y;

    const dvx = vB.x - vA.x;
    const dvy = vB.y - vA.y;

    return Math.abs(dvx * nx + dvy * ny);
  }

  addCircle(x: number, y: number, radius: number, options: {
    density?: number;
    friction?: number;
    restitution?: number;
    isStatic?: boolean;
    label?: string;
  } = {}): IPhysicsBody {
    const body = Matter.Bodies.circle(x, y, radius, {
      density: options.density || 0.001,
      friction: options.friction || 0.5,
      restitution: options.restitution || 0.2,
      isStatic: options.isStatic || false,
      label: options.label || 'body'
    });

    body.id = `body_${this.nextId++}`;
    Matter.World.add(this.world, body);

    const physicsBody: IPhysicsBody = {
      body,
      id: body.id,
      type: options.label || 'circle'
    };

    this.bodies.set(body.id, physicsBody);
    return physicsBody;
  }

  addRectangle(x: number, y: number, width: number, height: number, angle: number = 0, options: {
    density?: number;
    friction?: number;
    restitution?: number;
    isStatic?: boolean;
    label?: string;
  } = {}): IPhysicsBody {
    const body = Matter.Bodies.rectangle(x, y, width, height, {
      density: options.density || 0.001,
      friction: options.friction || 0.5,
      restitution: options.restitution || 0.2,
      isStatic: options.isStatic || false,
      label: options.label || 'body',
      angle: angle
    });

    body.id = `body_${this.nextId++}`;
    Matter.World.add(this.world, body);

    const physicsBody: IPhysicsBody = {
      body,
      id: body.id,
      type: options.label || 'rect'
    };

    this.bodies.set(body.id, physicsBody);
    return physicsBody;
  }

  applyImpulse(physicsBody: IPhysicsBody, impulseX: number, impulseY: number): void {
    Matter.Body.applyForce(physicsBody.body, physicsBody.body.position, {
      x: impulseX / physicsBody.body.mass,
      y: impulseY / physicsBody.body.mass
    });
  }

  setVelocity(physicsBody: IPhysicsBody, vx: number, vy: number): void {
    Matter.Body.setVelocity(physicsBody.body, { x: vx, y: vy });
  }

  getVelocity(physicsBody: IPhysicsBody): { x: number; y: number } {
    return {
      x: physicsBody.body.velocity.x,
      y: physicsBody.body.velocity.y
    };
  }

  getSpeed(physicsBody: IPhysicsBody): number {
    const v = physicsBody.body.velocity;
    return Math.sqrt(v.x * v.x + v.y * v.y);
  }

  getAngularSpeed(physicsBody: IPhysicsBody): number {
    return Math.abs(physicsBody.body.angularVelocity);
  }

  setStatic(physicsBody: IPhysicsBody, isStatic: boolean): void {
    Matter.Body.setStatic(physicsBody.body, isStatic);
  }

  removeBody(physicsBody: IPhysicsBody): void {
    Matter.World.remove(this.world, physicsBody.body);
    this.bodies.delete(physicsBody.id);
  }

  onCollision(callback: CollisionCallback): void {
    this.collisionCallbacks.push(callback);
  }

  step(dt: number): void {
    Matter.Engine.update(this.engine, dt);
  }

  getBodies(): IPhysicsBody[] {
    return Array.from(this.bodies.values());
  }

  private getBodyById(id: string): IPhysicsBody | undefined {
    return this.bodies.get(id);
  }

  dispose(): void {
    Matter.Engine.clear(this.engine);
    this.bodies.clear();
    this.collisionCallbacks = [];
  }
}
