// Physics engine initialization and management
const Physics = {
    engine: null,
    world: null,
    bodies: [],
    isPaused: false,

    init: function() {
        const Engine = Matter.Engine;
        const World = Matter.World;
        const Body = Matter.Body;

        this.engine = Engine.create();
        this.world = this.engine.world;
        this.world.gravity.y = 1;

        return this.engine;
    },

    createStaticGround: function() {
        const Body = Matter.Body;
        const Bodies = Matter.Bodies;

        // Create ground
        const ground = Bodies.rectangle(600, 680, 1200, 40, {
            isStatic: true,
            label: 'ground',
            friction: 0.5
        });

        Matter.World.add(this.world, ground);
        this.bodies.push(ground);
        return ground;
    },

    createBody: function(data) {
        const Bodies = Matter.Bodies;
        const Body = Matter.Body;
        let body;

        if (data.type === 'pig') {
            body = Bodies.circle(data.x, data.y, data.radius, {
                label: 'pig',
                restitution: 0.6,
                friction: 0.5,
                frictionAir: 0.01,
                density: 0.04,
                color: data.color
            });
            body.circleRadius = data.radius;
            body.isCircle = true;
        } else if (data.type === 'wood_block') {
            body = Bodies.rectangle(data.x, data.y, data.width, data.height, {
                label: 'wood_block',
                restitution: 0.4,
                friction: 0.5,
                frictionAir: 0.005,
                density: 0.001,
                color: data.color
            });
            body.width = data.width;
            body.height = data.height;
        } else if (data.type === 'stone_block') {
            body = Bodies.rectangle(data.x, data.y, data.width, data.height, {
                label: 'stone_block',
                restitution: 0.3,
                friction: 0.6,
                frictionAir: 0.002,
                density: 0.002,
                color: data.color
            });
            body.width = data.width;
            body.height = data.height;
        }

        if (body) {
            body.originalData = data;
            Matter.World.add(this.world, body);
            this.bodies.push(body);
        }

        return body;
    },

    createProjectile: function(x, y, vx, vy) {
        const Bodies = Matter.Bodies;

        const projectile = Bodies.circle(x, y, 12, {
            label: 'projectile',
            restitution: 0.8,
            friction: 0.3,
            frictionAir: 0.01,
            density: 0.04,
            color: '#FF0000'
        });

        projectile.circleRadius = 12;
        projectile.isCircle = true;
        Matter.Body.setVelocity(projectile, { x: vx, y: vy });
        Matter.World.add(this.world, projectile);
        this.bodies.push(projectile);

        return projectile;
    },

    update: function() {
        if (!this.isPaused) {
            const Engine = Matter.Engine;
            Engine.update(this.engine, 1000 / 60);
        }
    },

    clearWorld: function() {
        const World = Matter.World;
        this.bodies.forEach(body => {
            World.remove(this.world, body);
        });
        this.bodies = [];
        this.createStaticGround();
    },

    getProjectiles: function() {
        return this.bodies.filter(b => b.label === 'projectile');
    },

    getPigs: function() {
        return this.bodies.filter(b => b.label === 'pig');
    },

    getStructures: function() {
        return this.bodies.filter(b => b.label === 'wood_block' || b.label === 'stone_block');
    },

    removeBody: function(body) {
        const World = Matter.World;
        const index = this.bodies.indexOf(body);
        if (index > -1) {
            this.bodies.splice(index, 1);
        }
        World.remove(this.world, body);
    },

    pause: function() {
        this.isPaused = true;
    },

    resume: function() {
        this.isPaused = false;
    },

    getWorldState: function() {
        // Save current state for pause/resume
        return this.bodies.map(body => ({
            id: body.id,
            x: body.position.x,
            y: body.position.y,
            vx: body.velocity.x,
            vy: body.velocity.y,
            angle: body.angle,
            angularVelocity: body.angularVelocity
        }));
    }
};
