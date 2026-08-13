const Physics = (() => {
  const { Engine, Composite, Bodies, Body, Events } = Matter;

  let engine = null;
  const toRemove = [];

  const GRAVITY_SCALE = 0.001;
  const GRAVITY_Y = 1;
  const LAUNCH_K = 0.22;
  const PREVIEW_G = 0.2778;
  const BIRD_RADIUS = 18;
  const BIRD_DENSITY = 0.004;
  const BIRD_RESTITUTION = 0.4;
  const BIRD_FRICTION = 0.4;
  const BIRD_FRICTION_AIR = 0.0005;
  const DAMAGE_THRESHOLD = 4;
  const DAMAGE_MULTIPLIER = 2.5;
  const SETTLE_SPEED = 0.35;
  const SETTLE_FRAMES = 45;
  const SETTLE_TIMEOUT = 6000;

  function createWorld() {
    engine = Engine.create({ enableSleeping: true });
    engine.gravity.y = GRAVITY_Y;
    engine.gravity.scale = GRAVITY_SCALE;

    const ground = Bodies.rectangle(640, 680, 1400, 80, {
      isStatic: true,
      label: 'ground',
      plugin: { kind: 'ground' }
    });
    const leftWall = Bodies.rectangle(-60, 360, 40, 1440, {
      isStatic: true,
      label: 'wall',
      plugin: { kind: 'wall' }
    });
    const rightWall = Bodies.rectangle(1340, 360, 40, 1440, {
      isStatic: true,
      label: 'wall',
      plugin: { kind: 'wall' }
    });

    Composite.add(engine.world, [ground, leftWall, rightWall]);

    Events.on(engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const { bodyA, bodyB } = pair;
        if (bodyA.plugin.dead) continue;
        if (bodyB.plugin.dead) continue;

        const relVel = Math.hypot(
          bodyA.velocity.x - bodyB.velocity.x,
          bodyA.velocity.y - bodyB.velocity.y
        );

        if (relVel < DAMAGE_THRESHOLD) continue;

        const damage = (relVel - DAMAGE_THRESHOLD) * DAMAGE_MULTIPLIER;

        if (!bodyA.isStatic && bodyA.plugin.kind === 'block') {
          bodyA.plugin.hp -= damage * bodyB.mass;
          if (bodyA.plugin.hp <= 0) {
            bodyA.plugin.dead = true;
            toRemove.push(bodyA);
            Sound.play('hit');
          }
        }

        if (!bodyB.isStatic && bodyB.plugin.kind === 'block') {
          bodyB.plugin.hp -= damage * bodyA.mass;
          if (bodyB.plugin.hp <= 0) {
            bodyB.plugin.dead = true;
            toRemove.push(bodyB);
            Sound.play('hit');
          }
        }

        if (!bodyA.isStatic && bodyA.plugin.kind === 'pig') {
          bodyA.plugin.hp -= damage * bodyB.mass;
          if (bodyA.plugin.hp <= 0) {
            bodyA.plugin.dead = true;
            toRemove.push(bodyA);
            Sound.play('pop');
          }
        }

        if (!bodyB.isStatic && bodyB.plugin.kind === 'pig') {
          bodyB.plugin.hp -= damage * bodyA.mass;
          if (bodyB.plugin.hp <= 0) {
            bodyB.plugin.dead = true;
            toRemove.push(bodyB);
            Sound.play('pop');
          }
        }
      }
    });
  }

  function loadStage(stage) {
    clear();
    const blocks = [];
    const pigs = [];

    for (const blockData of stage.blocks) {
      const blockType = BLOCK_TYPES[blockData.type];
      const options = {
        density: blockType.density,
        restitution: 0.4,
        friction: 0.5,
        frictionAir: 0.001,
        label: 'block',
        plugin: {
          kind: 'block',
          mat: blockType.mat,
          hp: blockType.hp,
          maxHp: blockType.hp,
          color: blockType.color,
          w: blockType.w,
          h: blockType.h,
          dead: false
        }
      };

      const body = Bodies.rectangle(blockData.x, blockData.y, blockType.w, blockType.h, options);
      blocks.push(body);
      Composite.add(engine.world, body);
    }

    for (const pigData of stage.pigs) {
      const options = {
        density: 0.001,
        restitution: 0.6,
        friction: 0.5,
        frictionAir: 0.001,
        label: 'pig',
        plugin: {
          kind: 'pig',
          hp: 100,
          maxHp: 100,
          color: '#90ee90',
          dead: false
        }
      };

      const body = Bodies.circle(pigData.x, pigData.y, 20, options);
      pigs.push(body);
      Composite.add(engine.world, body);
    }

    return { blocks, pigs };
  }

  function spawnBirdBody(x, y, vx, vy) {
    const options = {
      density: BIRD_DENSITY,
      restitution: BIRD_RESTITUTION,
      friction: BIRD_FRICTION,
      frictionAir: BIRD_FRICTION_AIR,
      label: 'bird',
      plugin: {
        kind: 'bird',
        dead: false
      }
    };

    const body = Bodies.circle(x, y, BIRD_RADIUS, options);
    Body.setVelocity(body, { x: vx, y: vy });
    Composite.add(engine.world, body);

    return body;
  }

  function step() {
    Engine.update(engine, 1000 / 60);

    for (const body of toRemove) {
      Composite.remove(engine.world, body);
    }
    toRemove.length = 0;
  }

  function isSettled() {
    const allBodies = Composite.allBodies(engine.world);
    for (const body of allBodies) {
      if (body.isStatic) continue;
      if (body.speed > SETTLE_SPEED) return false;
    }
    return true;
  }

  function clear() {
    if (!engine) return;
    const allBodies = Composite.allBodies(engine.world);
    for (const body of allBodies) {
      if (!body.isStatic) {
        Composite.remove(engine.world, body);
      }
    }
    toRemove.length = 0;
  }

  return {
    createWorld,
    loadStage,
    spawnBirdBody,
    step,
    isSettled,
    clear,
    get engine() { return engine; },
    get LAUNCH_K() { return LAUNCH_K; },
    get PREVIEW_G() { return PREVIEW_G; },
    get BIRD_RADIUS() { return BIRD_RADIUS; }
  };
})();
