import { FIXED_TIMESTEP, MAX_ACCUMULATOR } from './constants.js';

let Engine, World, Body, Bodies, Events;

// Dynamically load Matter.js from CDN
async function loadMatterJs() {
    if (typeof Matter !== 'undefined') {
        return Matter;
    }

    // Fallback: assume Matter.js is already loaded via script tag
    // This will be handled in HTML via script tag before module loading
    return window.Matter;
}

class PhysicsEngine {
    constructor() {
        this.engine = null;
        this.world = null;
        this.bodies = [];
        this.running = true;
        this.accumulator = 0;
        this.collisionEvents = [];
        this.lastUpdateTime = Date.now();
    }

    async initialize() {
        const Matter = await loadMatterJs();
        Engine = Matter.Engine;
        World = Matter.World;
        Body = Matter.Body;
        Bodies = Matter.Bodies;
        Events = Matter.Events;

        this.engine = Engine.create();
        this.world = this.engine.world;
        this.world.gravity.y = 1;

        // Collision detection
        Events.on(this.engine, 'collisionStart', (event) => {
            event.pairs.forEach(pair => {
                this.collisionEvents.push({
                    type: 'collisionStart',
                    pair: pair
                });
            });
        });

        Events.on(this.engine, 'collisionEnd', (event) => {
            event.pairs.forEach(pair => {
                this.collisionEvents.push({
                    type: 'collisionEnd',
                    pair: pair
                });
            });
        });

        return this;
    }

    update(deltaTime) {
        if (!this.running) return;

        this.accumulator += deltaTime;

        // Fixed timestep update
        while (this.accumulator >= FIXED_TIMESTEP) {
            Engine.update(this.engine, FIXED_TIMESTEP * 1000);
            this.accumulator -= FIXED_TIMESTEP;
        }
    }

    addBody(body) {
        if (!this.world) return;
        World.add(this.world, body);
        this.bodies.push(body);
        return body;
    }

    removeBody(body) {
        if (!this.world) return;
        World.remove(this.world, body);
        const index = this.bodies.indexOf(body);
        if (index > -1) {
            this.bodies.splice(index, 1);
        }
    }

    pause() {
        this.running = false;
    }

    resume() {
        this.running = true;
    }

    reset() {
        if (!this.world) return;

        // Remove all bodies
        const bodiesToRemove = [...this.bodies];
        bodiesToRemove.forEach(body => {
            World.remove(this.world, body);
        });
        this.bodies = [];
        this.collisionEvents = [];
        this.accumulator = 0;
    }

    getCollisionEvents() {
        const events = this.collisionEvents;
        this.collisionEvents = [];
        return events;
    }

    getWorldState() {
        return {
            bodies: this.bodies.map(body => ({
                id: body.id,
                position: { x: body.position.x, y: body.position.y },
                velocity: { x: body.velocity.x, y: body.velocity.y },
                angularVelocity: body.angularVelocity,
                angle: body.angle,
                isStatic: body.isStatic,
                label: body.label
            })),
            accumulator: this.accumulator
        };
    }

    restoreWorldState(state) {
        // This is called when restoring from pause state
        this.bodies.forEach((body, index) => {
            if (state.bodies[index]) {
                const bodyState = state.bodies[index];
                Body.setPosition(body, bodyState.position);
                Body.setVelocity(body, bodyState.velocity);
                body.angularVelocity = bodyState.angularVelocity;
                Body.setAngle(body, bodyState.angle);
            }
        });
        this.accumulator = state.accumulator;
    }

    getAllBodies() {
        return this.bodies;
    }

    getWorld() {
        return this.world;
    }

    getEngine() {
        return this.engine;
    }
}

export default PhysicsEngine;
