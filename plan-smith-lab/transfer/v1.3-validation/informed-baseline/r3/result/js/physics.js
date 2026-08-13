(function() {
  'use strict';

  const C = window.AB.C;
  const { Engine, Composite, Bodies, Body, Events } = Matter;

  let engine;
  let removeQueue = [];

  window.AB.Physics = {
    on: { onDestroy: null, onDamage: null },

    init() {
      engine = Engine.create({ enableSleeping: true });
    },

    loadLevel(level) {
      if (engine.world.bodies.length > 0) {
        Composite.clear(engine.world);
      }

      // 지면 생성 (정적)
      const groundBody = Bodies.rectangle(
        640, 660, 2560, 120,
        { isStatic: true, label: 'ground', friction: 0.9 }
      );
      Composite.add(engine.world, groundBody);

      // terrain 생성
      if (level.terrain) {
        level.terrain.forEach(t => {
          const terrainBody = Bodies.rectangle(
            t.x, t.y, t.w, t.h,
            { isStatic: true, label: 'ground' }
          );
          Composite.add(engine.world, terrainBody);
        });
      }

      // 블록 생성
      level.blocks.forEach(b => {
        const mat = C.MATERIALS[b.type];
        const blockBody = Bodies.rectangle(
          b.x, b.y, b.w, b.h,
          {
            density: mat.density,
            restitution: mat.restitution,
            friction: mat.friction,
            label: b.type
          }
        );
        blockBody.hp = mat.hp;
        blockBody.maxHp = mat.hp;
        blockBody.dead = false;
        Composite.add(engine.world, blockBody);
      });

      // 돼지 생성
      level.pigs.forEach(p => {
        const pigType = p.r === 18 ? 'small' : 'big';
        const pigMat = C.PIGS[pigType];
        const pigBody = Bodies.circle(
          p.x, p.y, p.r,
          {
            density: pigMat.density,
            restitution: pigMat.restitution,
            friction: pigMat.friction,
            label: 'pig'
          }
        );
        pigBody.hp = pigMat.hp;
        pigBody.maxHp = pigMat.hp;
        pigBody.gScore = pigMat.score;
        pigBody.dead = false;
        Composite.add(engine.world, pigBody);
      });

      // 충돌 리스너 등록 (1회만)
      Events.off(engine, 'collisionStart');
      Events.on(engine, 'collisionStart', this._onCollisionStart.bind(this));
    },

    spawnBird(type) {
      const birdMat = C.BIRDS[type];
      const birdBody = Bodies.circle(
        C.SLING.x, C.SLING.y, birdMat.radius,
        {
          density: birdMat.density,
          restitution: birdMat.restitution,
          friction: birdMat.friction,
          frictionAir: birdMat.frictionAir,
          isStatic: true,
          label: 'bird'
        }
      );
      birdBody.birdType = type;
      birdBody.hp = Infinity;
      birdBody.maxHp = Infinity;
      birdBody.dead = false;
      Composite.add(engine.world, birdBody);
      return birdBody;
    },

    launch(bird, vx, vy) {
      Body.setStatic(bird, false);
      Body.setVelocity(bird, { x: vx, y: vy });
    },

    step() {
      Engine.update(engine, C.FIXED_DT);
      this._flushRemoveQueue();
    },

    explode(x, y) {
      Composite.allBodies(engine.world).forEach(body => {
        if (body.isStatic || body.label === 'ground') return;

        const dx = body.position.x - x;
        const dy = body.position.y - y;
        const d = Math.hypot(dx, dy);

        if (d > C.BLAST_R) return;

        const f = 1 - d / C.BLAST_R;
        let dirX = 0, dirY = -1;
        if (d > 1) {
          dirX = dx / d;
          dirY = dy / d;
        }

        Body.applyForce(body, body.position, {
          x: dirX * C.BLAST_IMPULSE * f * body.mass,
          y: dirY * C.BLAST_IMPULSE * f * body.mass
        });

        if (['wood', 'ice', 'stone', 'pig'].includes(body.label)) {
          this._applyDamage(body, C.BLAST_DMG * f);
        }
      });
    },

    remove(body) {
      removeQueue.push(body);
    },

    pigsLeft() {
      return Composite.allBodies(engine.world)
        .filter(b => b.label === 'pig' && !b.dead).length;
    },

    isSettled() {
      return Composite.allBodies(engine.world).every(body => {
        if (body.isStatic || body.label === 'ground') return true;
        return Body.getSpeed(body) < C.SETTLE_SPEED || body.isSleeping;
      });
    },

    bodies() {
      return Composite.allBodies(engine.world);
    },

    clear() {
      removeQueue = [];
      Composite.clear(engine.world);
    },

    _applyDamage(body, dmg) {
      if (body.dead) return;
      body.hp -= dmg;
      if (this.on.onDamage) this.on.onDamage(body, dmg);
      if (body.hp <= 0) {
        body.dead = true;
        if (this.on.onDestroy) this.on.onDestroy(body);
        this.remove(body);
      }
    },

    _onCollisionStart(event) {
      event.pairs.forEach(pair => {
        const { bodyA, bodyB } = pair;
        const dvx = bodyA.velocity.x - bodyB.velocity.x;
        const dvy = bodyA.velocity.y - bodyB.velocity.y;
        const rel = Math.hypot(dvx, dvy);

        if (rel < C.IMPACT_MIN) return;

        let dmg = (rel - C.IMPACT_MIN) * C.DMG_SCALE;
        if (bodyA.label === 'bird' || bodyB.label === 'bird') {
          dmg *= C.BIRD_BONUS;
        }

        [bodyA, bodyB].forEach(b => {
          if (['wood', 'ice', 'stone', 'pig'].includes(b.label)) {
            this._applyDamage(b, dmg);
          }
        });
      });
    },

    _flushRemoveQueue() {
      removeQueue.forEach(body => {
        Composite.remove(engine.world, body);
      });
      removeQueue = [];
    }
  };
})();
