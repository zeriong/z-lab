import { GameState, Block, Pig, BLOCK_PROPERTIES } from './types';

// @ts-ignore
import Matter from 'matter-js';

export type CollisionCallback = (event: CollisionEvent) => void;

export interface CollisionEvent {
    type: 'block_destroyed' | 'pig_removed' | 'impact' | 'bird_impact';
    target_id: string;
    x: number;
    y: number;
    impact_force: number;
}

export class CollisionHandler {
    private callbacks: CollisionCallback[] = [];
    private active_collisions = new Set<string>();

    constructor(world: any) {
        this.setupCollisionListeners(world);
    }

    private setupCollisionListeners(world: any): void {
        const Events = Matter.Events;

        Events.on(world, 'collisionStart', (event: any) => {
            event.pairs.forEach((pair: any) => {
                this.handleCollision(pair);
            });
        });

        Events.on(world, 'collisionEnd', (event: any) => {
            event.pairs.forEach((pair: any) => {
                const collisionKey = `${pair.bodyA.label}-${pair.bodyB.label}`;
                this.active_collisions.delete(collisionKey);
            });
        });
    }

    private handleCollision(pair: any): void {
        const { bodyA, bodyB } = pair;
        const collisionKey = `${bodyA.label}-${bodyB.label}`;

        // Avoid duplicate collision processing
        if (this.active_collisions.has(collisionKey)) {
            return;
        }
        this.active_collisions.add(collisionKey);

        const labelA = bodyA.label || '';
        const labelB = bodyB.label || '';

        // Calculate impact force
        const impactForce = Math.abs(bodyA.velocity.x * bodyA.mass + bodyA.velocity.y * bodyA.mass) / 1000;

        // Bird vs Block
        if ((labelA.startsWith('bird-') && labelB.startsWith('block-')) ||
            (labelA.startsWith('block-') && labelB.startsWith('bird-'))) {
            const blockLabel = labelA.startsWith('block-') ? labelA : labelB;
            const blockId = blockLabel.replace('block-', '');

            this.emit({
                type: 'block_destroyed',
                target_id: blockId,
                x: pair.collision.supports[0].x,
                y: pair.collision.supports[0].y,
                impact_force: impactForce
            });
        }

        // Bird vs Pig
        if ((labelA.startsWith('bird-') && labelB.startsWith('pig-')) ||
            (labelA.startsWith('pig-') && labelB.startsWith('bird-'))) {
            const pigLabel = labelA.startsWith('pig-') ? labelA : labelB;
            const pigId = pigLabel.replace('pig-', '');

            this.emit({
                type: 'pig_removed',
                target_id: pigId,
                x: pair.collision.supports[0].x,
                y: pair.collision.supports[0].y,
                impact_force: impactForce
            });
        }

        // Block vs Pig
        if ((labelA.startsWith('block-') && labelB.startsWith('pig-')) ||
            (labelA.startsWith('pig-') && labelB.startsWith('block-'))) {
            const pigLabel = labelA.startsWith('pig-') ? labelA : labelB;
            const pigId = pigLabel.replace('pig-', '');

            this.emit({
                type: 'pig_removed',
                target_id: pigId,
                x: pair.collision.supports[0].x,
                y: pair.collision.supports[0].y,
                impact_force: impactForce
            });
        }

        // General impact sound
        if (impactForce > 0.5) {
            this.emit({
                type: 'impact',
                target_id: '',
                x: pair.collision.supports[0].x,
                y: pair.collision.supports[0].y,
                impact_force: impactForce
            });
        }
    }

    applyDamage(gameState: GameState, blockId: string, damage: number): void {
        const block = gameState.blocks.find(b => b.id === blockId);
        if (block) {
            block.health -= damage;
            if (block.health <= 0) {
                block.destroying = true;
                block.destroy_progress = 0;
            }
        }
    }

    updateDestructionAnimations(gameState: GameState, deltaTime: number): void {
        gameState.blocks.forEach(block => {
            if (block.destroying) {
                block.destroy_progress += deltaTime / 500; // 0.5s animation
                if (block.destroy_progress >= 1) {
                    block.destroy_progress = 1;
                }
            }
        });
    }

    removeDestroyedBlocks(gameState: GameState, physics: any): void {
        gameState.blocks = gameState.blocks.filter(block => {
            if (block.destroying && block.destroy_progress >= 1) {
                if (block.body) {
                    physics.removeBody(block.body);
                }
                return false;
            }
            return true;
        });
    }

    removePig(gameState: GameState, pigId: string, physics: any): void {
        const pigIndex = gameState.pigs.findIndex(p => p.id === pigId);
        if (pigIndex !== -1) {
            const pig = gameState.pigs[pigIndex];
            if (pig.body) {
                physics.removeBody(pig.body);
            }
            gameState.pigs.splice(pigIndex, 1);
        }
    }

    subscribe(callback: CollisionCallback): void {
        this.callbacks.push(callback);
    }

    private emit(event: CollisionEvent): void {
        this.callbacks.forEach(cb => cb(event));
    }
}
