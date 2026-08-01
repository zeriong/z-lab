import { GameObject } from '../game/Game';

export interface Collision {
    bodyAId: string;
    bodyBId: string;
}

interface PhysicsBody {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    ax: number;
    ay: number;
    mass: number;
    width: number;
    height: number;
    radius: number;
    type: string;
    static: boolean;
}

export class PhysicsEngine {
    private bodies: Map<string, PhysicsBody> = new Map();
    private collisions: Collision[] = [];
    private gravity: number = 800;
    private damping: number = 0.99;

    constructor() {}

    public reset(): void {
        this.bodies.clear();
        this.collisions = [];
    }

    public addBody(obj: GameObject): void {
        const body: PhysicsBody = {
            id: obj.id,
            x: obj.x,
            y: obj.y,
            vx: obj.vx || 0,
            vy: obj.vy || 0,
            ax: 0,
            ay: this.gravity,
            mass: obj.type === 'stone' ? 2 : 1,
            width: obj.width || 30,
            height: obj.height || 30,
            radius: obj.radius || 15,
            type: obj.type,
            static: obj.type === 'wall' ? true : false
        };

        this.bodies.set(obj.id, body);
    }

    public removeBody(id: string): void {
        this.bodies.delete(id);
    }

    public addWalls(width: number, height: number): void {
        // Add ground
        this.bodies.set('wall-ground', {
            id: 'wall-ground',
            x: width / 2,
            y: height - 25,
            vx: 0,
            vy: 0,
            ax: 0,
            ay: 0,
            mass: Infinity,
            width,
            height: 50,
            radius: 0,
            type: 'wall',
            static: true
        });

        // Add left wall
        this.bodies.set('wall-left', {
            id: 'wall-left',
            x: 0,
            y: height / 2,
            vx: 0,
            vy: 0,
            ax: 0,
            ay: 0,
            mass: Infinity,
            width: 50,
            height,
            radius: 0,
            type: 'wall',
            static: true
        });

        // Add right wall
        this.bodies.set('wall-right', {
            id: 'wall-right',
            x: width,
            y: height / 2,
            vx: 0,
            vy: 0,
            ax: 0,
            ay: 0,
            mass: Infinity,
            width: 50,
            height,
            radius: 0,
            type: 'wall',
            static: true
        });
    }

    public fireBody(id: string, vx: number, vy: number): void {
        const body = this.bodies.get(id);
        if (body) {
            body.vx = vx;
            body.vy = vy;
        }
    }

    public step(dt: number): void {
        const timeStep = 0.016; // Fixed 60fps

        // Update velocities and positions
        for (const body of this.bodies.values()) {
            if (body.static) continue;

            body.vx += body.ax * timeStep;
            body.vy += body.ay * timeStep;

            body.vx *= this.damping;
            body.vy *= this.damping;

            body.x += body.vx * timeStep;
            body.y += body.vy * timeStep;

            // Clamp to bounds
            if (body.y > 9999) {
                this.bodies.delete(body.id);
                continue;
            }
        }

        // Detect collisions
        this.detectCollisions();

        // Resolve collisions
        this.resolveCollisions();
    }

    private detectCollisions(): void {
        this.collisions = [];
        const bodyArray = Array.from(this.bodies.values());

        for (let i = 0; i < bodyArray.length; i++) {
            for (let j = i + 1; j < bodyArray.length; j++) {
                const bodyA = bodyArray[i];
                const bodyB = bodyArray[j];

                if (bodyA.static && bodyB.static) continue;

                if (this.checkCollision(bodyA, bodyB)) {
                    this.collisions.push({
                        bodyAId: bodyA.id,
                        bodyBId: bodyB.id
                    });
                }
            }
        }
    }

    private checkCollision(a: PhysicsBody, b: PhysicsBody): boolean {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Circle collision
        if (a.radius && b.radius) {
            return dist < a.radius + b.radius;
        }

        // Circle-rectangle collision
        if (a.radius && !b.radius) {
            return this.circleRectCollision(a, b);
        }
        if (!a.radius && b.radius) {
            return this.circleRectCollision(b, a);
        }

        // Rectangle collision
        return this.rectCollision(a, b);
    }

    private circleRectCollision(circle: PhysicsBody, rect: PhysicsBody): boolean {
        const cx = Math.max(rect.x - rect.width / 2, Math.min(circle.x, rect.x + rect.width / 2));
        const cy = Math.max(rect.y - rect.height / 2, Math.min(circle.y, rect.y + rect.height / 2));

        const dx = circle.x - cx;
        const dy = circle.y - cy;

        return dx * dx + dy * dy < circle.radius * circle.radius;
    }

    private rectCollision(a: PhysicsBody, b: PhysicsBody): boolean {
        return (
            a.x - a.width / 2 < b.x + b.width / 2 &&
            a.x + a.width / 2 > b.x - b.width / 2 &&
            a.y - a.height / 2 < b.y + b.height / 2 &&
            a.y + a.height / 2 > b.y - b.height / 2
        );
    }

    private resolveCollisions(): void {
        for (const collision of this.collisions) {
            const bodyA = this.bodies.get(collision.bodyAId);
            const bodyB = this.bodies.get(collision.bodyBId);

            if (!bodyA || !bodyB) continue;
            if (bodyA.static && bodyB.static) continue;

            // Separation
            const dx = bodyB.x - bodyA.x;
            const dy = bodyB.y - bodyA.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            const overlap = (bodyA.radius || bodyA.width / 2) + (bodyB.radius || bodyB.width / 2) - dist;

            if (overlap > 0) {
                const nx = dx / dist;
                const ny = dy / dist;

                if (!bodyA.static) {
                    bodyA.x -= nx * overlap * 0.5;
                    bodyA.y -= ny * overlap * 0.5;
                }
                if (!bodyB.static) {
                    bodyB.x += nx * overlap * 0.5;
                    bodyB.y += ny * overlap * 0.5;
                }

                // Velocity response
                const dvx = bodyB.vx - bodyA.vx;
                const dvy = bodyB.vy - bodyA.vy;
                const dvn = dvx * nx + dvy * ny;

                if (dvn > 0) return;

                const restitution = 0.5;
                const impulse = -(1 + restitution) * dvn / (1 / bodyA.mass + 1 / bodyB.mass);

                if (!bodyA.static) {
                    bodyA.vx -= impulse * nx / bodyA.mass;
                    bodyA.vy -= impulse * ny / bodyA.mass;
                }
                if (!bodyB.static) {
                    bodyB.vx += impulse * nx / bodyB.mass;
                    bodyB.vy += impulse * ny / bodyB.mass;
                }
            }
        }
    }

    public getCollisions(): Collision[] {
        return this.collisions;
    }

    public getBodies(): Map<string, any> {
        const result = new Map();
        for (const [id, body] of this.bodies) {
            result.set(id, {
                position: { x: body.x, y: body.y },
                velocity: { x: body.vx, y: body.vy }
            });
        }
        return result;
    }

    public getBodyVelocity(id: string): { x: number; y: number } | null {
        const body = this.bodies.get(id);
        return body ? { x: body.vx, y: body.vy } : null;
    }
}
