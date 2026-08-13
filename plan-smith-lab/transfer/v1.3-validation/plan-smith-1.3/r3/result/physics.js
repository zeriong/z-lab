const Physics = (() => {
  const { Engine, Composite, Bodies, Body, Events } = Matter;

  let engine = null;
  let bodyIdCounter = 0;
  const GROUND_Y = 640;
  const DAMAGE_THRESHOLD = 4;
  const DAMAGE_MULTIPLIER = 2.5;
  const BIRD_RADIUS = 18;
  const BIRD_DENSITY = 0.004;

  function createWorld() {
    engine = Engine.create({ enableSleeping: true });

    // Ground
    Composite.add(
      engine.world,
      Bodies.rectangle(640, 680, 1400, 80, {
        isStatic: true,
        label: 'ground',
        plugin: { kind: 'ground' }
      })
    );

    // Left wall
    Composite.add(
      engine.world,
      Bodies.rectangle(-60, 360, 40, 1440, {
        isStatic: true,
        label: 'wall',
        plugin: { kind: 'wall' }
      })
    );

    // Right wall
    Composite.add(
      engine.world,
      Bodies.rectangle(1340, 360, 40, 1440, {
        isStatic: true,
        label: 'wall',
        plugin: { kind: 'wall' }
      })
    );

    // Collision handler
    Events.on(engine, 'collisionStart', handleCollision);
  }

  function handleCollision(event) {
    for (let pair of event.pairs) {
      let { bodyA, bodyB } = pair;

      if (bodyA.plugin.dead || bodyB.plugin.dead) continue;

      if (!bodyA.isStatic && bodyB.isStatic) {
        applyDamage(bodyA, bodyB);
      } else if (bodyA.isStatic && !bodyB.isStatic) {
        applyDamage(bodyB, bodyA);
      } else if (!bodyA.isStatic && !bodyB.isStatic) {
        applyDamage(bodyA, bodyB);
        applyDamage(bodyB, bodyA);
      }
    }
  }

  function applyDamage(damagingBody, targetBody) {
    if (targetBody.isStatic || targetBody.plugin.kind === 'ground') return;
    if (damagingBody.plugin.dead || targetBody.plugin.dead) return;

    const relVx = damagingBody.velocity.x - targetBody.velocity.x;
    const relVy = damagingBody.velocity.y - targetBody.velocity.y;
    const relSpeed = Math.hypot(relVx, relVy);

    if (relSpeed < DAMAGE_THRESHOLD) return;

    const damage = (relSpeed - DAMAGE_THRESHOLD) * targetBody.mass * DAMAGE_MULTIPLIER;
    if (targetBody.plugin.hp !== undefined) {
      targetBody.plugin.hp -= damage;
      if (targetBody.plugin.hp <= 0) {
        targetBody.plugin.dead = true;
      }
    }
  }

  function loadStage(stage) {
    // Clear existing dynamic bodies
    let bodiesToRemove = [];
    Composite.allBodies(engine.world).forEach(body => {
      if (!body.isStatic) {
        bodiesToRemove.push(body);
      }
    });
    bodiesToRemove.forEach(body => Composite.remove(engine.world, body));

    let blocks = [];
    let pigs = [];

    // Create blocks
    for (let blockData of stage.blocks) {
      let blockType = BLOCK_TYPES[blockData.type];
      let body = Bodies.rectangle(
        blockData.x,
        blockData.y,
        blockType.w,
        blockType.h,
        {
          density: blockType.density,
          friction: 0.5,
          restitution: 0.3,
          frictionAir: 0.001,
          label: 'block',
          plugin: {
            kind: 'block',
            id: ++bodyIdCounter,
            type: blockData.type,
            hp: blockType.hp,
            maxHp: blockType.hp,
            color: blockType.color,
            w: blockType.w,
            h: blockType.h,
            dead: false
          }
        }
      );
      Composite.add(engine.world, body);
      blocks.push(body);
    }

    // Create pigs
    for (let pigData of stage.pigs) {
      let body = Bodies.circle(pigData.x, pigData.y, 20, {
        density: 0.002,
        friction: 0.5,
        restitution: 0.3,
        frictionAir: 0.001,
        label: 'pig',
        plugin: {
          kind: 'pig',
          id: ++bodyIdCounter,
          hp: 100,
          maxHp: 100,
          color: '#90EE90',
          dead: false
        }
      });
      Composite.add(engine.world, body);
      pigs.push(body);
    }

    return { blocks, pigs };
  }

  function spawnBirdBody(x, y, vx, vy) {
    let body = Bodies.circle(x, y, BIRD_RADIUS, {
      density: BIRD_DENSITY,
      friction: 0.4,
      restitution: 0.4,
      frictionAir: 0.0005,
      label: 'bird',
      plugin: {
        kind: 'bird',
        id: ++bodyIdCounter,
        hp: 999999,
        dead: false
      }
    });
    Body.setVelocity(body, { x: vx, y: vy });
    Composite.add(engine.world, body);
    return body;
  }

  function step() {
    Engine.update(engine, 1000 / 60);

    // Remove bodies marked as dead
    let bodiesToRemove = [];
    Composite.allBodies(engine.world).forEach(body => {
      if (body.plugin.dead === true) {
        bodiesToRemove.push(body);
      }
      // Remove bodies outside world
      if (body.position.x < -200 || body.position.x > 1480 || body.position.y > 920) {
        if (!body.isStatic) {
          bodiesToRemove.push(body);
        }
      }
    });

    bodiesToRemove.forEach(body => {
      Composite.remove(engine.world, body);
    });
  }

  function isSettled() {
    let allBodies = Composite.allBodies(engine.world);
    for (let body of allBodies) {
      if (body.isStatic) continue;
      let speed = body.speed;
      if (speed > 0.35) return false;
    }
    return true;
  }

  function clear() {
    let bodiesToRemove = [];
    Composite.allBodies(engine.world).forEach(body => {
      if (!body.isStatic) {
        bodiesToRemove.push(body);
      }
    });
    bodiesToRemove.forEach(body => Composite.remove(engine.world, body));
  }

  return {
    createWorld,
    loadStage,
    spawnBirdBody,
    step,
    isSettled,
    clear,
    get engine() { return engine; }
  };
})();
