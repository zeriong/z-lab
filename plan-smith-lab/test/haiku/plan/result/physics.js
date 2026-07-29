// Matter.js physics engine setup
const { Engine, World, Body, Bodies, Events, Collision } = Matter;

class PhysicsEngine {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.engine = Engine.create();
    this.engine.gravity.y = 1;
    this.world = this.engine.world;
    this.paused = false;

    this.bodies = {
      structures: [],
      pigs: [],
      birds: [],
      static: []
    };

    this.destroyed = new Set();
    this.birdsLaunched = 0;

    // Add static boundaries
    this.createBoundaries();
    this.setupCollisionHandling();
  }

  createBoundaries() {
    const thickness = 40;

    // Ground
    const ground = Bodies.rectangle(
      this.width / 2,
      this.height - thickness / 2,
      this.width,
      thickness,
      { isStatic: true, label: 'ground' }
    );

    // Left wall
    const leftWall = Bodies.rectangle(
      thickness / 2,
      this.height / 2,
      thickness,
      this.height,
      { isStatic: true, label: 'wall' }
    );

    // Right wall
    const rightWall = Bodies.rectangle(
      this.width - thickness / 2,
      this.height / 2,
      thickness,
      this.height,
      { isStatic: true, label: 'wall' }
    );

    this.bodies.static = [ground, leftWall, rightWall];
    World.add(this.world, this.bodies.static);
  }

  setupCollisionHandling() {
    Events.on(this.engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;

        // Check for structure destruction
        if ((bodyA.label === 'structure' || bodyB.label === 'structure') &&
            (bodyA.label === 'bird' || bodyB.label === 'bird' ||
             bodyA.label === 'structure' || bodyB.label === 'structure')) {
          const target = bodyA.label === 'structure' ? bodyA : bodyB;
          const source = bodyA.label === 'structure' ? bodyB : bodyA;

          if (!target.isStatic && source.velocity) {
            const speed = Math.sqrt(
              source.velocity.x ** 2 + source.velocity.y ** 2
            );
            if (speed > 8) {
              this.markForDestruction(target);
            }
          }
        }

        // Check for pig removal
        if (bodyA.label === 'pig' && this.shouldRemove(bodyB)) {
          this.markForDestruction(bodyA);
        } else if (bodyB.label === 'pig' && this.shouldRemove(bodyA)) {
          this.markForDestruction(bodyB);
        }
      });
    });
  }

  shouldRemove(body) {
    return body.label === 'bird' || body.label === 'structure' || body.label === 'ground';
  }

  markForDestruction(body) {
    if (!this.destroyed.has(body.id)) {
      this.destroyed.add(body.id);
      if (body.label === 'structure') {
        body.destroy = true;
      }
    }
  }

  addStructure(x, y, width, height, materialType, angle = 0) {
    const structure = Bodies.rectangle(x, y, width, height, {
      label: 'structure',
      angle: angle,
      friction: 0.5,
      restitution: 0.3,
      material: materialType
    });
    this.bodies.structures.push(structure);
    World.add(this.world, structure);
    return structure;
  }

  addPig(x, y, radius = 10) {
    const pig = Bodies.circle(x, y, radius, {
      label: 'pig',
      friction: 0.5,
      restitution: 0.5
    });
    this.bodies.pigs.push(pig);
    World.add(this.world, pig);
    return pig;
  }

  addBird(x, y, radius = 8) {
    const bird = Bodies.circle(x, y, radius, {
      label: 'bird',
      friction: 0.5,
      restitution: 0.7
    });
    this.bodies.birds.push(bird);
    World.add(this.world, bird);
    return bird;
  }

  launchBird(bird, velocity) {
    Body.setVelocity(bird, velocity);
    this.birdsLaunched++;
  }

  update() {
    if (!this.paused) {
      Engine.update(this.engine);
      this.removeDestroyedBodies();
      this.checkOutOfBounds();
    }
  }

  removeDestroyedBodies() {
    const toRemove = [];

    // Remove destroyed structures
    this.bodies.structures = this.bodies.structures.filter(body => {
      if (body.destroy) {
        toRemove.push(body);
        return false;
      }
      return true;
    });

    // Remove out-of-bounds pigs
    this.bodies.pigs = this.bodies.pigs.filter(body => {
      if (body.position.y > this.height || this.destroyed.has(body.id)) {
        toRemove.push(body);
        return false;
      }
      return true;
    });

    toRemove.forEach(body => World.remove(this.world, body));
  }

  checkOutOfBounds() {
    this.bodies.birds = this.bodies.birds.filter(body => {
      if (body.position.y > this.height + 100 || body.position.x < -100 || body.position.x > this.width + 100) {
        World.remove(this.world, body);
        return false;
      }
      return true;
    });
  }

  clearWorld() {
    this.destroyed.clear();
    this.birdsLaunched = 0;

    const allBodies = World.allBodies(this.world);
    allBodies.forEach(body => {
      if (!body.isStatic && !this.bodies.static.includes(body)) {
        World.remove(this.world, body);
      }
    });

    this.bodies.structures = [];
    this.bodies.pigs = [];
    this.bodies.birds = [];
  }

  pauseSimulation() {
    this.paused = true;
  }

  resumeSimulation() {
    this.paused = false;
  }

  getAlivePigs() {
    return this.bodies.pigs.length;
  }

  getAliveBirds() {
    return this.bodies.birds.length;
  }

  getTotalStructures() {
    return this.bodies.structures.length;
  }
}

let physicsEngine;
