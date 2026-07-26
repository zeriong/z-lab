// Collision detection and destruction
const Collision = {
    setup: function() {
        const Events = Matter.Events;

        Events.on(Physics.engine, 'collisionStart', (event) => {
            event.pairs.forEach((pair) => {
                this.handleCollision(pair.bodyA, pair.bodyB, pair);
            });
        });

        Events.on(Physics.engine, 'collisionEnd', (event) => {
            // Handle collision end if needed
        });
    },

    handleCollision: function(bodyA, bodyB, pair) {
        // Ignore ground collisions for destruction
        if (bodyA.label === 'ground' || bodyB.label === 'ground') return;

        // Calculate collision force
        const force = Math.abs(pair.force.x) + Math.abs(pair.force.y);

        // Projectile hitting pig
        if ((bodyA.label === 'projectile' && bodyB.label === 'pig') ||
            (bodyA.label === 'pig' && bodyB.label === 'projectile')) {
            const pig = bodyA.label === 'pig' ? bodyA : bodyB;
            const projectile = bodyA.label === 'projectile' ? bodyA : bodyB;

            if (force > 5) {
                this.destroyPig(pig);
            }
        }

        // Projectile hitting structures
        if ((bodyA.label === 'projectile' && (bodyB.label === 'wood_block' || bodyB.label === 'stone_block')) ||
            (bodyA.label === 'wood_block' && bodyB.label === 'projectile') ||
            (bodyA.label === 'stone_block' && bodyB.label === 'projectile')) {
            const structure = (bodyA.label === 'wood_block' || bodyA.label === 'stone_block') ? bodyA : bodyB;
            const projectile = bodyA.label === 'projectile' ? bodyA : bodyB;

            if (force > 3) {
                // Damage structure or destroy
                if (structure.label === 'wood_block') {
                    if (force > 5) {
                        this.destroyStructure(structure);
                    }
                } else if (structure.label === 'stone_block') {
                    if (force > 10) {
                        this.destroyStructure(structure);
                    }
                }
            }
        }

        // Pig/structure hitting pig - secondary destruction
        if ((bodyA.label === 'pig' && bodyB.label === 'pig') ||
            ((bodyA.label === 'wood_block' || bodyA.label === 'stone_block') && bodyB.label === 'pig') ||
            (bodyA.label === 'pig' && (bodyB.label === 'wood_block' || bodyB.label === 'stone_block'))) {
            if (force > 8) {
                const pig = bodyA.label === 'pig' ? bodyA : (bodyB.label === 'pig' ? bodyB : null);
                if (pig) {
                    this.destroyPig(pig);
                }
            }
        }
    },

    destroyPig: function(pig) {
        Physics.removeBody(pig);
        GameState.pigs--;
        GameState.checkClear();
    },

    destroyStructure: function(structure) {
        Physics.removeBody(structure);
    },

    checkStableState: function() {
        // Check if all bodies are relatively still
        let allStable = true;
        Physics.bodies.forEach(body => {
            if (body.label === 'ground' || body.isStatic) return;

            const v = body.velocity;
            const speed = Math.sqrt(v.x * v.x + v.y * v.y);
            if (speed > 0.5) {
                allStable = false;
            }
        });
        return allStable;
    }
};
