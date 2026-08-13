(function() {
  const C = window.AB.C;
  const Engine = Matter.Engine;
  const Composite = Matter.Composite;
  const Bodies = Matter.Bodies;
  const Body = Matter.Body;
  const Events = Matter.Events;

  let engine = null;
  let removeQueue = [];

  const Physics = {
    on: {
      onDestroy: () => {},
      onDamage: () => {}
    },

    init() {
      engine = Engine.create({ enableSleeping: true });
      removeQueue = [];
      Events.on(engine, 'collisionStart', handleCollisionStart);
    },

    loadLevel(level) {
      if (!engine) return;
      Composite.clear(engine.world, false);
      removeQueue = [];

      // Ground
      const ground = Bodies.rectangle(640, 660, 2560, 120, {
        isStatic: true,
        label: 'ground',
        friction: 0.9
      });
      Composite.add(engine.world, ground);

      // Terrain
      if (level.terrain) {
        for (const ter of level.terrain) {
          const body = Bodies.rectangle(ter.x, ter.y, ter.w, ter.h, {
            isStatic: true,
            label: 'ground'
          });
          Composite.add(engine.world, body);
        }
      }

      // Blocks
      if (level.blocks) {
        for (const block of level.blocks) {
          const mat = C.MATERIALS[block.type];
          const body = Bodies.rectangle(block.x, block.y, block.w, block.h, {
            density: mat.density,
            restitution: mat.restitution,
            friction: mat.friction,
            label: block.type
          });
          body.hp = mat.hp;
          body.maxHp = mat.hp;
          body.gScore = C.SCORE_BLOCK;
          body.dead = false;
          Composite.add(engine.world, body);
        }
      }

      // Pigs
      if (level.pigs) {
        for (const pig of level.pigs) {
          const pigType = pig.r === 18 ? 'small' : 'big';
          const pigData = C.PIGS[pigType];
          const body = Bodies.circle(pig.x, pig.y, pig.r, {
            density: pigData.density,
            restitution: pigData.restitution,
            friction: pigData.friction,
            label: 'pig'
          });
          body.hp = pigData.hp;
          body.maxHp = pigData.hp;
          body.gScore = pigData.score;
          body.dead = false;
          Composite.add(engine.world, body);
        }
      }
    },

    spawnBird(type) {
      const bird = C.BIRDS[type];
      const body = Bodies.circle(C.SLING.x, C.SLING.y, bird.radius, {
        density: bird.density,
        restitution: bird.restitution,
        friction: bird.friction,
        frictionAir: bird.frictionAir,
        label: 'bird',
        isStatic: true
      });
      body.birdType = type;
      body.hp = 1;
      body.maxHp = 1;
      body.dead = false;
      Composite.add(engine.world, body);
      return body;
    },

    launch(bird, vx, vy) {
      Body.setStatic(bird, false);
      Body.setVelocity(bird, { x: vx, y: vy });
    },

    step() {
      if (!engine) return;
      Engine.update(engine, C.FIXED_DT);
      flushRemoveQueue();
    },

    explode(x, y) {
      if (!engine) return;
      const bodies = Composite.allBodies(engine.world);
      for (const body of bodies) {
        if (body.label === 'ground' || body.isStatic) continue;
        const dx = body.position.x - x;
        const dy = body.position.y - y;
        const d = Math.hypot(dx, dy);
        if (d > C.BLAST_R) continue;
        const f = 1 - d / C.BLAST_R;
        let dirX = 0, dirY = -1;
        if (d > 1) {
          const len = Math.hypot(dx, dy);
          dirX = dx / len;
          dirY = dy / len;
        }
        Body.applyForce(body, body.position, {
          x: dirX * C.BLAST_IMPULSE * f * body.mass,
          y: dirY * C.BLAST_IMPULSE * f * body.mass
        });
        if (body.label === 'wood' || body.label === 'ice' || body.label === 'stone' || body.label === 'pig') {
          applyDamage(body, C.BLAST_DMG * f);
        }
      }
    },

    remove(body) {
      removeQueue.push(body);
    },

    pigsLeft() {
      if (!engine) return 0;
      const bodies = Composite.allBodies(engine.world);
      return bodies.filter(b => b.label === 'pig' && !b.dead).length;
    },

    isSettled() {
      if (!engine) return true;
      const bodies = Composite.allBodies(engine.world);
      for (const body of bodies) {
        if (body.label === 'ground' || body.isStatic) continue;
        const speed = Math.hypot(body.velocity.x, body.velocity.y);
        if (speed >= C.SETTLE_SPEED && !body.isSleeping) return false;
      }
      return true;
    },

    bodies() {
      if (!engine) return [];
      return Composite.allBodies(engine.world);
    },

    clear() {
      if (!engine) return;
      Composite.clear(engine.world, false);
      removeQueue = [];
    }
  };

  function applyDamage(body, dmg) {
    if (body.dead) return;
    body.hp -= dmg;
    Physics.on.onDamage(body, dmg);
    if (body.hp <= 0) {
      body.dead = true;
      Physics.on.onDestroy(body);
      Physics.remove(body);
    }
  }

  function handleCollisionStart(event) {
    for (const pair of event.pairs) {
      const A = pair.bodyA;
      const B = pair.bodyB;
      const relVx = A.velocity.x - B.velocity.x;
      const relVy = A.velocity.y - B.velocity.y;
      const rel = Math.hypot(relVx, relVy);
      if (rel < C.IMPACT_MIN) continue;
      let dmg = (rel - C.IMPACT_MIN) * C.DMG_SCALE;
      if (A.label === 'bird' || B.label === 'bird') {
        dmg *= C.BIRD_BONUS;
      }
      if (A.label === 'wood' || A.label === 'ice' || A.label === 'stone' || A.label === 'pig') {
        applyDamage(A, dmg);
      }
      if (B.label === 'wood' || B.label === 'ice' || B.label === 'stone' || B.label === 'pig') {
        applyDamage(B, dmg);
      }
    }
  }

  function flushRemoveQueue() {
    while (removeQueue.length > 0) {
      const body = removeQueue.shift();
      Composite.remove(engine.world, body);
    }
  }

  window.AB.Physics = Physics;
})();
