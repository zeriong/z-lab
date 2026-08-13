(function() {
  'use strict';

  const C = window.AB.C;
  const Engine = Matter.Engine;
  const Composite = Matter.Composite;
  const Bodies = Matter.Bodies;
  const Body = Matter.Body;
  const Events = Matter.Events;

  let engine = null;
  const removeQueue = [];
  const allBodies = [];

  const Physics = {
    on: {
      onDestroy: null,
      onDamage: null
    },

    init() {
      engine = Engine.create({ enableSleeping: true });
      Events.on(engine, 'collisionStart', handleCollisionStart);
    },

    loadLevel(level) {
      Composite.clear(engine.world, false);
      allBodies.length = 0;
      removeQueue.length = 0;

      // 지면
      const ground = Bodies.rectangle(640, 660, 2560, 120, {
        isStatic: true,
        label: 'ground',
        friction: 0.9
      });
      Composite.add(engine.world, ground);
      allBodies.push(ground);

      // terrain
      level.terrain.forEach(t => {
        const terrain = Bodies.rectangle(t.x, t.y, t.w, t.h, {
          isStatic: true,
          label: 'ground'
        });
        Composite.add(engine.world, terrain);
        allBodies.push(terrain);
      });

      // blocks
      level.blocks.forEach(b => {
        const mat = C.MATERIALS[b.type];
        const block = Bodies.rectangle(b.x, b.y, b.w, b.h, {
          density: mat.density,
          restitution: mat.restitution,
          friction: mat.friction,
          label: b.type
        });
        block.hp = mat.hp;
        block.maxHp = mat.hp;
        block.gScore = C.SCORE_BLOCK;
        block.dead = false;
        Composite.add(engine.world, block);
        allBodies.push(block);
      });

      // pigs
      level.pigs.forEach(p => {
        const pigConfig = p.r === 18 ? C.PIG_SMALL : C.PIG_BIG;
        const pig = Bodies.circle(p.x, p.y, p.r, {
          density: pigConfig.density,
          restitution: pigConfig.restitution,
          friction: pigConfig.friction,
          label: 'pig'
        });
        pig.hp = pigConfig.hp;
        pig.maxHp = pigConfig.hp;
        pig.gScore = pigConfig.gScore;
        pig.dead = false;
        Composite.add(engine.world, pig);
        allBodies.push(pig);
      });
    },

    spawnBird(type) {
      const birdConfig = C.BIRDS[type];
      const bird = Bodies.circle(C.SLING.x, C.SLING.y, birdConfig.radius, {
        density: birdConfig.density,
        restitution: birdConfig.restitution,
        friction: birdConfig.friction,
        frictionAir: birdConfig.frictionAir,
        isStatic: true,
        label: 'bird'
      });
      bird.hp = 9999;
      bird.maxHp = 9999;
      bird.dead = false;
      bird.type = type;
      Composite.add(engine.world, bird);
      allBodies.push(bird);
      return bird;
    },

    launch(bird, vx, vy) {
      Body.setStatic(bird, false);
      Body.setVelocity(bird, { x: vx, y: vy });
    },

    step() {
      Engine.update(engine, C.FIXED_DT);

      // 제거 큐 비우기
      while (removeQueue.length > 0) {
        const body = removeQueue.shift();
        const idx = allBodies.indexOf(body);
        if (idx >= 0) allBodies.splice(idx, 1);
        Composite.remove(engine.world, body);
      }
    },

    explode(x, y) {
      allBodies.forEach(body => {
        if (body.label === 'ground') return;

        const dx = body.position.x - x;
        const dy = body.position.y - y;
        const d = Math.hypot(dx, dy);

        if (d > C.BLAST_R) return;

        const f = 1 - d / C.BLAST_R;

        // 방향 정규화
        let dirX = 0, dirY = -1;
        if (d > 1) {
          const len = Math.hypot(dx, dy);
          dirX = dx / len;
          dirY = dy / len;
        }

        // 힘 적용
        Body.applyForce(body, body.position, {
          x: dirX * C.BLAST_IMPULSE * f * body.mass,
          y: dirY * C.BLAST_IMPULSE * f * body.mass
        });

        // 데미지
        if (body.label === 'wood' || body.label === 'ice' || body.label === 'stone' || body.label === 'pig') {
          applyDamage(body, C.BLAST_DMG * f);
        }
      });
    },

    remove(body) {
      removeQueue.push(body);
    },

    pigsLeft() {
      return allBodies.filter(b => b.label === 'pig' && !b.dead).length;
    },

    isSettled() {
      return allBodies.every(body => {
        if (body.label === 'ground') return true;
        return body.speed < C.SETTLE_SPEED || body.isSleeping;
      });
    },

    bodies() {
      return allBodies;
    },

    clear() {
      Composite.clear(engine.world, false);
      allBodies.length = 0;
      removeQueue.length = 0;
    }
  };

  function applyDamage(body, dmg) {
    if (body.dead) return;
    body.hp -= dmg;
    if (Physics.on.onDamage) {
      Physics.on.onDamage(body, dmg);
    }
    if (body.hp <= 0) {
      body.dead = true;
      if (Physics.on.onDestroy) {
        Physics.on.onDestroy(body);
      }
      Physics.remove(body);
    }
  }

  function handleCollisionStart(event) {
    event.pairs.forEach(pair => {
      const { bodyA, bodyB } = pair;

      const relVx = bodyA.velocity.x - bodyB.velocity.x;
      const relVy = bodyA.velocity.y - bodyB.velocity.y;
      const rel = Math.hypot(relVx, relVy);

      if (rel < C.IMPACT_MIN) return;

      let dmg = (rel - C.IMPACT_MIN) * C.DMG_SCALE;
      if (bodyA.label === 'bird' || bodyB.label === 'bird') {
        dmg *= C.BIRD_BONUS;
      }

      const damageable = ['wood', 'ice', 'stone', 'pig'];
      if (damageable.includes(bodyA.label)) {
        applyDamage(bodyA, dmg);
      }
      if (damageable.includes(bodyB.label)) {
        applyDamage(bodyB, dmg);
      }
    });
  }

  window.AB = window.AB || {};
  window.AB.Physics = Physics;
})();
