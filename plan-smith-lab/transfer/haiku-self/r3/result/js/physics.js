class PhysicsEngine {
  constructor() {
    const Engine = Matter.Engine;
    const World = Matter.World;

    this.engine = Engine.create();
    this.engine.gravity.y = 1;
    this.world = this.engine.world;

    this.collisionPairs = new Map();
    this.bodiesByLabel = new Map();
  }

  createStaticGround(x, y, width, height) {
    const Body = Matter.Body;
    const Bodies = Matter.Bodies;

    const ground = Bodies.rectangle(x, y, width, height, {
      isStatic: true,
      label: 'ground'
    });

    Matter.World.add(this.world, ground);
    return ground;
  }

  createBird(x, y, type = 'red') {
    const Bodies = Matter.Bodies;

    const bird = Bodies.circle(x, y, 12, {
      density: 0.04,
      label: 'bird',
      frictionAir: 0.02,
      restitution: 0.9
    });

    Matter.World.add(this.world, bird);
    return bird;
  }

  createPig(x, y) {
    const Bodies = Matter.Bodies;

    const pig = Bodies.circle(x, y, 10, {
      density: 0.001,
      label: 'pig',
      frictionAir: 0.01,
      restitution: 0.8
    });

    pig.hp = 100;
    Matter.World.add(this.world, pig);
    return pig;
  }

  createBlock(x, y, width, height, material = 'wood') {
    const Bodies = Matter.Bodies;

    const block = Bodies.rectangle(x, y, width, height, {
      density: 0.001,
      label: 'block',
      frictionAir: 0.01,
      restitution: 0.5
    });

    block.material = material;
    block.hp = material === 'wood' ? 80 : 150;
    Matter.World.add(this.world, block);
    return block;
  }

  launchBird(bird, startX, startY, endX, endY) {
    const forceMultiplier = 0.002;
    const force = {
      x: (endX - startX) * forceMultiplier,
      y: (endY - startY) * forceMultiplier
    };

    Matter.Body.setPosition(bird, { x: startX, y: startY });
    Matter.Body.setVelocity(bird, { x: 0, y: 0 });
    Matter.Body.applyForce(bird, bird.position, force);
  }

  calculateTrajectory(startX, startY, dragX, dragY, steps = 20) {
    const points = [];
    const forceMultiplier = 0.002;
    const vx = (dragX - startX) * forceMultiplier;
    const vy = (dragY - startY) * forceMultiplier;

    let posX = startX;
    let posY = startY;
    let velX = vx;
    let velY = vy;

    const dt = 0.016; // 60 fps
    const gravity = 1;

    for (let i = 0; i < steps; i++) {
      points.push({ x: posX, y: posY });

      velY += gravity;
      posX += velX;
      posY += velY;

      if (posY > 800) break;
    }

    return points;
  }

  step(dt) {
    Matter.Engine.update(this.engine, dt);
  }

  applyDamage(body, damage) {
    if (body && body.hp !== undefined) {
      body.hp -= damage;
      return body.hp <= 0;
    }
    return false;
  }

  getAllBodies() {
    return this.world.bodies;
  }

  removeBody(body) {
    Matter.World.remove(this.world, body);
  }

  clearWorld() {
    Matter.World.clear(this.world);
  }

  checkCollisions(bird) {
    const allBodies = this.getAllBodies();
    const collisions = [];

    for (const body of allBodies) {
      if (body === bird || body.label === 'ground') continue;

      const distance = Math.sqrt(
        Math.pow(bird.position.x - body.position.x, 2) +
        Math.pow(bird.position.y - body.position.y, 2)
      );

      const birdRadius = 12;
      const bodyRadius = body.circleRadius || (Math.max(body.bounds.max.x - body.bounds.min.x, body.bounds.max.y - body.bounds.min.y) / 2);

      if (distance < birdRadius + bodyRadius) {
        const birdSpeed = Math.sqrt(bird.velocity.x ** 2 + bird.velocity.y ** 2);
        collisions.push({
          body: body,
          force: birdSpeed
        });
      }
    }

    return collisions;
  }

  getBirdSpeed(bird) {
    if (!bird) return 0;
    return Math.sqrt(bird.velocity.x ** 2 + bird.velocity.y ** 2);
  }
}
