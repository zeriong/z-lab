import { Engine, World, Body, Bodies, Events, Composite } from 'matter-js';

export class PhysicsEngine {
    constructor(options = {}) {
        this.engine = Engine.create();
        this.engine.world.gravity.y = 1;
        this.world = this.engine.world;

        // Track bodies for collision handling
        this.bodies = [];
        this.collisionPairs = [];

        this.setupCollisionEvents();
    }

    setupCollisionEvents() {
        Events.on(this.engine, 'afterUpdate', () => {
            this.collisionPairs = [];

            const pairs = this.engine.world.pairs.activeList;
            for (let i = 0; i < pairs.length; i++) {
                const pair = pairs[i];
                if (pair.isActive) {
                    this.collisionPairs.push({
                        bodyA: pair.bodyA,
                        bodyB: pair.bodyB,
                        collision: pair.collision
                    });
                }
            }
        });
    }

    createBird(x, y, type = 'red', options = {}) {
        const size = options.size || 15;
        const body = Bodies.circle(x, y, size, {
            label: 'bird',
            density: 0.04,
            restitution: 0.9,
            friction: 0.5,
            ...options
        });
        body.birdType = type;
        this.bodies.push(body);
        World.add(this.world, body);
        return body;
    }

    createPig(x, y, hp = 100, options = {}) {
        const size = options.size || 12;
        const body = Bodies.circle(x, y, size, {
            label: 'pig',
            density: 0.01,
            restitution: 0.8,
            friction: 0.5,
            ...options
        });
        body.hp = hp;
        body.maxHp = hp;
        this.bodies.push(body);
        World.add(this.world, body);
        return body;
    }

    createBlock(x, y, w, h, material = 'wood', hp = 80, options = {}) {
        const body = Bodies.rectangle(x, y, w, h, {
            label: 'block',
            density: 0.001,
            restitution: 0.5,
            friction: 0.8,
            ...options
        });
        body.hp = hp;
        body.maxHp = hp;
        body.material = material;
        body.w = w;
        body.h = h;
        this.bodies.push(body);
        World.add(this.world, body);
        return body;
    }

    createGround(x, y, w, h, options = {}) {
        const body = Bodies.rectangle(x, y, w, h, {
            label: 'ground',
            isStatic: true,
            restitution: 0.2,
            ...options
        });
        World.add(this.world, body);
        return body;
    }

    step(dt = 1 / 60) {
        Engine.update(this.engine, dt * 1000);
    }

    applyForce(body, forceX, forceY) {
        Body.applyForce(body, body.position, { x: forceX, y: forceY });
    }

    setVelocity(body, vx, vy) {
        Body.setVelocity(body, { x: vx, y: vy });
    }

    getCollisions() {
        return this.collisionPairs;
    }

    simulateTrajectory(body, initialVelocity, steps = 30) {
        // Create a clone engine for trajectory prediction
        const tempEngine = Engine.create();
        tempEngine.world.gravity.y = this.engine.world.gravity.y;

        const tempBody = Bodies.circle(body.position.x, body.position.y, 10, {
            isStatic: false,
            density: 0.04,
            restitution: 0.9
        });

        World.add(tempEngine.world, tempBody);
        Body.setVelocity(tempBody, initialVelocity);

        const points = [{ x: tempBody.position.x, y: tempBody.position.y }];

        for (let i = 0; i < steps; i++) {
            Engine.update(tempEngine, 16.67);
            points.push({
                x: tempBody.position.x,
                y: tempBody.position.y
            });
        }

        return points;
    }

    removeBodies(bodiesToRemove) {
        bodiesToRemove.forEach(body => {
            World.remove(this.world, body);
            const idx = this.bodies.indexOf(body);
            if (idx !== -1) {
                this.bodies.splice(idx, 1);
            }
        });
    }

    clear() {
        const allBodies = Composite.allBodies(this.world);
        World.remove(this.world, allBodies);
        this.bodies = [];
        this.collisionPairs = [];
    }

    getBodyVelocityMagnitude(body) {
        const v = body.velocity;
        return Math.sqrt(v.x * v.x + v.y * v.y);
    }

    isBodyAtRest(body, threshold = 0.5) {
        return this.getBodyVelocityMagnitude(body) < threshold;
    }
}
