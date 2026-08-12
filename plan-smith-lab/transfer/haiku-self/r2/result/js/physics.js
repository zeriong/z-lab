/**
 * PhysicsEngine - Wrapper around Matter.js
 * Handles physics simulation, body creation, collision detection
 */
class PhysicsEngine {
  constructor() {
    const Engine = Matter.Engine;
    const World = Matter.World;
    const Events = Matter.Events;

    this.engine = Engine.create();
    this.world = this.engine.world;
    this.world.gravity.y = 1; // Gravity

    // Configure world
    this.world.bounds = {
      min: { x: -100, y: -100 },
      max: { x: 1100, y: 700 }
    };

    this.collisions = [];
    this.bodiesMap = new Map(); // body -> metadata
  }

  /**
   * Create a bird (circular body)
   */
  createBird(x, y, type = "red") {
    const Body = Matter.Body;
    const Bodies = Matter.Bodies;

    const bird = Bodies.circle(x, y, 14, {
      density: 0.04,
      restitution: 0.8,
      friction: 0.5,
      frictionAir: 0.01,
      label: 'bird',
      isStatic: false
    });

    Matter.World.add(this.world, bird);
    this.bodiesMap.set(bird, { type: 'bird', birdType: type, hp: 100 });
    return bird;
  }

  /**
   * Create a pig (circular body)
   */
  createPig(x, y) {
    const Bodies = Matter.Bodies;

    const pig = Bodies.circle(x, y, 16, {
      density: 0.04,
      restitution: 0.6,
      friction: 0.5,
      frictionAir: 0.02,
      label: 'pig',
      isStatic: false
    });

    Matter.World.add(this.world, pig);
    this.bodiesMap.set(pig, { type: 'pig', hp: 100 });
    return pig;
  }

  /**
   * Create a block (rectangular body)
   */
  createBlock(x, y, w, h, material = "wood") {
    const Bodies = Matter.Bodies;

    const density = material === "stone" ? 0.08 : 0.04;
    const restitution = 0.3;

    const block = Bodies.rectangle(x, y, w, h, {
      density,
      restitution,
      friction: 0.5,
      frictionAir: 0.02,
      label: 'block',
      isStatic: false
    });

    Matter.World.add(this.world, block);
    this.bodiesMap.set(block, { type: 'block', material, hp: material === "stone" ? 120 : 80 });
    return block;
  }

  /**
   * Create a static platform (ground, walls)
   */
  createPlatform(x, y, w, h) {
    const Bodies = Matter.Bodies;

    const platform = Bodies.rectangle(x, y, w, h, {
      isStatic: true,
      label: 'platform'
    });

    Matter.World.add(this.world, platform);
    this.bodiesMap.set(platform, { type: 'platform' });
    return platform;
  }

  /**
   * Step physics simulation
   */
  step(deltaTime = 1000 / 60) {
    const Engine = Matter.Engine;
    Engine.update(this.engine, deltaTime);

    // Detect collisions
    this.collisions = this.getCollisions();
  }

  /**
   * Get all active collisions
   */
  getCollisions() {
    const pairs = this.engine.pairs.collisionStart;
    const collisions = [];

    for (let pair of pairs) {
      const { bodyA, bodyB } = pair;
      const metaA = this.bodiesMap.get(bodyA);
      const metaB = this.bodiesMap.get(bodyB);

      if (metaA && metaB) {
        collisions.push({
          bodyA, bodyB,
          metaA, metaB,
          pair
        });
      }
    }

    return collisions;
  }

  /**
   * Destroy a body (remove from world)
   */
  destroyBody(body) {
    Matter.World.remove(this.world, body);
    this.bodiesMap.delete(body);
  }

  /**
   * Get all bodies of a specific type
   */
  getBodiesByType(type) {
    const bodies = [];
    for (let [body, meta] of this.bodiesMap) {
      if (meta.type === type) {
        bodies.push(body);
      }
    }
    return bodies;
  }

  /**
   * Get body metadata
   */
  getBodyMeta(body) {
    return this.bodiesMap.get(body);
  }

  /**
   * Clear all bodies from world
   */
  clear() {
    const World = Matter.World;
    const bodiesToRemove = Array.from(this.bodiesMap.keys());
    for (let body of bodiesToRemove) {
      World.remove(this.world, body);
      this.bodiesMap.delete(body);
    }
    this.collisions = [];
  }

  /**
   * Apply force to a body (for launching bird)
   */
  applyForce(body, forceX, forceY) {
    Matter.Body.applyForce(body, body.position, { x: forceX, y: forceY });
  }

  /**
   * Set velocity
   */
  setVelocity(body, vx, vy) {
    Matter.Body.setVelocity(body, { x: vx, y: vy });
  }

  /**
   * Get velocity magnitude
   */
  getVelocityMagnitude(body) {
    const v = body.velocity;
    return Math.sqrt(v.x * v.x + v.y * v.y);
  }

  /**
   * Simulate trajectory (for prediction)
   * Returns array of points along predicted path
   */
  simulateTrajectory(startBody, steps = 30, timeStep = 1000 / 60) {
    const Engine = Matter.Engine;
    const World = Matter.World;
    const tempEngine = Engine.create();
    tempEngine.world.gravity.y = 1;

    // Clone the bird body
    const clonedBird = Matter.Bodies.circle(
      startBody.position.x,
      startBody.position.y,
      14,
      {
        density: startBody.density,
        restitution: startBody.restitution,
        friction: startBody.friction,
        frictionAir: startBody.frictionAir,
        isStatic: false
      }
    );

    Matter.Body.setVelocity(clonedBird, startBody.velocity);
    World.add(tempEngine.world, clonedBird);

    const points = [{ x: clonedBird.position.x, y: clonedBird.position.y }];

    for (let i = 0; i < steps; i++) {
      Engine.update(tempEngine, timeStep);

      // Stop if bird leaves screen
      if (clonedBird.position.y > 650 || clonedBird.position.x < -50 || clonedBird.position.x > 1050) {
        break;
      }

      points.push({ x: clonedBird.position.x, y: clonedBird.position.y });

      // Stop if velocity is very low
      const vel = Math.sqrt(clonedBird.velocity.x ** 2 + clonedBird.velocity.y ** 2);
      if (vel < 1) break;
    }

    return points;
  }
}
