import { PhysicsState, Block, Pig, Bird, BLOCK_PROPERTIES, BIRD_PROPERTIES } from './types';

// @ts-ignore
import Matter from 'matter-js';

export class PhysicsEngine {
    state: PhysicsState;

    constructor() {
        const Engine = Matter.Engine;
        const World = Matter.World;

        this.state = {
            paused: false,
            world: World.create(),
            bodies: [],
            gravity: 9.81
        };

        const engine = Engine.create();
        engine.world.gravity.y = this.state.gravity;
        this.state.world = engine.world;
    }

    step(dt: number): void {
        if (this.state.paused) {
            return;
        }

        const Engine = Matter.Engine;
        const engine = { world: this.state.world } as any;
        Engine.update(engine, dt * 1000);
    }

    createBlockBody(block: Block): any {
        const Body = Matter.Body;
        const Bodies = Matter.Bodies;

        const bodyOptions = BLOCK_PROPERTIES[block.type] || BLOCK_PROPERTIES['wood'];
        const body = Bodies.rectangle(
            block.x + block.width / 2,
            block.y + block.height / 2,
            block.width,
            block.height,
            {
                restitution: bodyOptions.restitution,
                friction: 0.01,
                label: `block-${block.id}`,
                density: bodyOptions.health * 0.001
            }
        );

        Matter.World.add(this.state.world, body);
        return body;
    }

    createPigBody(pig: Pig): any {
        const Bodies = Matter.Bodies;
        const body = Bodies.circle(
            pig.x + pig.width / 2,
            pig.y + pig.height / 2,
            pig.width / 2,
            {
                restitution: 0.6,
                friction: 0.01,
                label: `pig-${pig.id}`,
                density: 0.0001
            }
        );

        Matter.World.add(this.state.world, body);
        return body;
    }

    createBirdBody(bird: Bird, x: number, y: number): any {
        const Bodies = Matter.Bodies;
        const props = BIRD_PROPERTIES[bird.type] || BIRD_PROPERTIES['basic'];

        const body = Bodies.circle(
            x + bird.width / 2,
            y + bird.height / 2,
            bird.width / 2,
            {
                restitution: props.restitution,
                friction: props.friction,
                label: `bird-${bird.id}`,
                density: props.mass * 0.001,
                mass: props.mass
            }
        );

        Matter.World.add(this.state.world, body);
        return body;
    }

    applyImpulse(body: any, dx: number, dy: number): void {
        const Body = Matter.Body;
        Body.applyForce(body, { x: body.position.x, y: body.position.y }, { x: dx * 0.0001, y: dy * 0.0001 });
    }

    getBodyPosition(body: any): { x: number; y: number } {
        return { x: body.position.x, y: body.position.y };
    }

    getBodyVelocity(body: any): { x: number; y: number } {
        return { x: body.velocity.x, y: body.velocity.y };
    }

    setBodyPosition(body: any, x: number, y: number): void {
        const Body = Matter.Body;
        Body.setPosition(body, { x, y });
    }

    setBodyVelocity(body: any, x: number, y: number): void {
        const Body = Matter.Body;
        Body.setVelocity(body, { x, y });
    }

    removeBody(body: any): void {
        Matter.World.remove(this.state.world, body);
    }

    getAllBodies(): any[] {
        return this.state.world.bodies || [];
    }

    isPaused(): boolean {
        return this.state.paused;
    }

    pause(): void {
        this.state.paused = true;
    }

    resume(): void {
        this.state.paused = false;
    }

    clear(): void {
        const World = Matter.World;
        const bodies = this.state.world.bodies || [];
        bodies.forEach((body: any) => {
            World.remove(this.state.world, body);
        });
        this.state.bodies = [];
    }
}
