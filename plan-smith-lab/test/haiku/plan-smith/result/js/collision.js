import { COLLISION_FORCE_THRESHOLD, STRUCTURE_DAMAGE_THRESHOLD } from './constants.js';

class CollisionHandler {
    constructor(physicsEngine) {
        this.physicsEngine = physicsEngine;
        this.pigs = [];
        this.structures = [];
        this.birds = [];
        this.bodiesToRemove = [];
        this.structureDamage = new Map();
        this.clearedTime = 0;
        this.isStable = false;
    }

    registerEntity(body, type) {
        if (type === 'pig') {
            this.pigs.push(body);
        } else if (type === 'structure') {
            this.structures.push(body);
            this.structureDamage.set(body.id, 0);
        } else if (type === 'bird') {
            this.birds.push(body);
        }
    }

    update() {
        const events = this.physicsEngine.getCollisionEvents();

        events.forEach(event => {
            if (event.type === 'collisionStart') {
                this.handleCollisionStart(event.pair);
            }
        });

        // Clean up marked bodies
        this.bodiesToRemove.forEach(body => {
            this.physicsEngine.removeBody(body);
            this.removeFromLists(body);
        });
        this.bodiesToRemove = [];

        // Check stability
        this.updateStability();
    }

    handleCollisionStart(pair) {
        const { bodyA, bodyB } = pair;

        // Bird hitting pig
        if ((bodyA.label === 'bird' && this.isPig(bodyB)) ||
            (bodyB.label === 'bird' && this.isPig(bodyA))) {
            const bird = bodyA.label === 'bird' ? bodyA : bodyB;
            const pig = this.isPig(bodyA) ? bodyA : bodyB;
            this.handleBirdPigCollision(bird, pig, pair);
        }

        // Bird hitting structure
        if ((bodyA.label === 'bird' && this.isStructure(bodyB)) ||
            (bodyB.label === 'bird' && this.isStructure(bodyA))) {
            const structure = this.isStructure(bodyA) ? bodyA : bodyB;
            this.handleStructureCollision(structure, pair);
        }

        // Pig hitting structure
        if ((this.isPig(bodyA) && this.isStructure(bodyB)) ||
            (this.isPig(bodyB) && this.isStructure(bodyA))) {
            const structure = this.isStructure(bodyA) ? bodyA : bodyB;
            this.handleStructureCollision(structure, pair);
        }
    }

    handleBirdPigCollision(bird, pig, pair) {
        // Calculate collision force
        const force = this.calculateForce(pair);

        if (force > COLLISION_FORCE_THRESHOLD) {
            this.markForRemoval(pig);
        }
    }

    handleStructureCollision(structure, pair) {
        const force = this.calculateForce(pair);
        const currentDamage = this.structureDamage.get(structure.id) || 0;
        const newDamage = currentDamage + force;

        this.structureDamage.set(structure.id, newDamage);

        if (newDamage > STRUCTURE_DAMAGE_THRESHOLD) {
            this.markForRemoval(structure);
        }
    }

    calculateForce(pair) {
        // Estimate force from collision
        // This is a simplified calculation based on relative velocity
        const relVx = pair.bodyA.velocity.x - pair.bodyB.velocity.x;
        const relVy = pair.bodyA.velocity.y - pair.bodyB.velocity.y;
        const relSpeed = Math.sqrt(relVx * relVx + relVy * relVy);

        // Rough force estimate (simplified)
        return Math.min(relSpeed * 2, 50);
    }

    isPig(body) {
        return body.label === 'pig';
    }

    isStructure(body) {
        return body.label && (body.label.includes('block') || body.label === 'structure');
    }

    markForRemoval(body) {
        if (!this.bodiesToRemove.includes(body)) {
            this.bodiesToRemove.push(body);
        }
    }

    removeFromLists(body) {
        let index = this.pigs.indexOf(body);
        if (index > -1) this.pigs.splice(index, 1);

        index = this.structures.indexOf(body);
        if (index > -1) {
            this.structures.splice(index, 1);
            this.structureDamage.delete(body.id);
        }

        index = this.birds.indexOf(body);
        if (index > -1) this.birds.splice(index, 1);
    }

    updateStability() {
        // Check if all objects are moving slowly (stable)
        const allBodies = this.physicsEngine.getAllBodies();
        let allStable = true;

        for (const body of allBodies) {
            if (body.label === 'ground') continue;

            const vx = body.velocity.x;
            const vy = body.velocity.y;
            const speed = Math.sqrt(vx * vx + vy * vy);

            if (speed > 0.5) {
                allStable = false;
                break;
            }
        }

        this.isStable = allStable;
    }

    isLevelClear() {
        // Clear when all pigs are removed and world is stable
        return this.pigs.length === 0 && this.isStable;
    }

    getPigCount() {
        return this.pigs.length;
    }

    reset() {
        this.pigs = [];
        this.structures = [];
        this.birds = [];
        this.bodiesToRemove = [];
        this.structureDamage.clear();
        this.clearedTime = 0;
        this.isStable = false;
    }

    getState() {
        return {
            pigCount: this.pigs.length,
            isStable: this.isStable
        };
    }
}

export default CollisionHandler;
