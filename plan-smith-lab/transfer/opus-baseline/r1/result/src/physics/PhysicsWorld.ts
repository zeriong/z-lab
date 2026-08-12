import Matter from 'matter-js';

export interface PhysicsBody {
  id: string;
  body: Matter.Body;
  hp?: number;
  type: 'bird' | 'pig' | 'block' | 'ground';
}

export class PhysicsWorld {
  private engine: Matter.Engine;
  private world: Matter.World;
  private bodies: Map<string, PhysicsBody> = new Map();
  private collisionCallbacks: Array<(bodyA: PhysicsBody, bodyB: PhysicsBody) => void> = [];
  private bodiesInRemovalQueue: Set<string> = new Set();

  constructor() {
    this.engine = Matter.Engine.create();
    this.world = this.engine.world;
    this.world.gravity.y = 1.0;
    this.world.gravity.x = 0;

    // Setup collision detection
    Matter.Events.on(this.engine, 'collisionStart', (e) => {
      e.pairs.forEach((pair) => {
        const bodyA = pair.bodyA as any;
        const bodyB = pair.bodyB as any;

        if (bodyA.gameId && bodyB.gameId) {
          const a = this.bodies.get(bodyA.gameId);
          const b = this.bodies.get(bodyB.gameId);
          if (a && b) {
            this.collisionCallbacks.forEach((cb) => cb(a, b));
          }
        }
      });
    });
  }

  addBody(id: string, body: Matter.Body, type: string, hp?: number): PhysicsBody {
    (body as any).gameId = id;
    Matter.World.add(this.world, body);

    const physicsBody: PhysicsBody = {
      id,
      body,
      type: type as any,
      hp,
    };

    this.bodies.set(id, physicsBody);
    return physicsBody;
  }

  removeBody(id: string) {
    this.bodiesInRemovalQueue.add(id);
  }

  flushRemovals() {
    this.bodiesInRemovalQueue.forEach((id) => {
      const physicsBody = this.bodies.get(id);
      if (physicsBody) {
        Matter.World.remove(this.world, physicsBody.body);
        this.bodies.delete(id);
      }
    });
    this.bodiesInRemovalQueue.clear();
  }

  onCollision(callback: (bodyA: PhysicsBody, bodyB: PhysicsBody) => void) {
    this.collisionCallbacks.push(callback);
  }

  step(dt: number) {
    Matter.Engine.update(this.engine, dt * 1000);
  }

  getWorld(): Matter.World {
    return this.world;
  }

  getEngine(): Matter.Engine {
    return this.engine;
  }

  getAllBodies(): PhysicsBody[] {
    return Array.from(this.bodies.values());
  }

  getBody(id: string): PhysicsBody | undefined {
    return this.bodies.get(id);
  }

  clear() {
    this.bodies.forEach((pb) => {
      Matter.World.remove(this.world, pb.body);
    });
    this.bodies.clear();
    this.bodiesInRemovalQueue.clear();
    this.collisionCallbacks = [];
  }

  raycast(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): { body: PhysicsBody; point: { x: number; y: number } } | null {
    // Simplified raycast - just iterate bodies
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dirX = dx / dist;
    const dirY = dy / dist;

    let closest: { body: PhysicsBody; t: number } | null = null;

    for (const body of this.bodies.values()) {
      const vx = body.body.position.x - start.x;
      const vy = body.body.position.y - start.y;
      const t = vx * dirX + vy * dirY;

      if (t > 0 && t < dist) {
        if (!closest || t < closest.t) {
          closest = { body, t };
        }
      }
    }

    if (closest) {
      return {
        body: closest.body,
        point: {
          x: start.x + dirX * closest.t,
          y: start.y + dirY * closest.t,
        },
      };
    }

    return null;
  }

  getBodiesnearPoint(x: number, y: number, radius: number): PhysicsBody[] {
    const result: PhysicsBody[] = [];
    for (const body of this.bodies.values()) {
      const dx = body.body.position.x - x;
      const dy = body.body.position.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius) {
        result.push(body);
      }
    }
    return result;
  }
}
