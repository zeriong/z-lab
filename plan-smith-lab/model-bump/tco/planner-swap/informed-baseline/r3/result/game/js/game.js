(function() {
  window.AB = window.AB || {};

  const cfg = AB.CONFIG;

  AB.Game = {
    state: 'MAIN',
    levelIndex: 0,
    world: null,
    score: 0,
    birdQueue: [],
    activeBird: null,
    turnPhase: 'ready',
    phaseTime: 0,
    birdSlowTime: 0,
    abilityUsed: false,
    fuseTime: 0,
    clearTimer: -1,
    trail: [],
    trailCounter: 0,
    pigsAlive: 0,
    accumulator: 0,
    lastTime: null,
    lastResult: null,

    init: function(canvas) {
      AB.Storage.load();
      AB.Render.init(canvas);
      AB.Input.init(canvas);
      AB.UI.init({
        onStart: function() {
          AB.Game.startLevel(AB.Storage.firstPlayableLevel());
        },
        onOpenStages: function() {
          AB.Game.setState('STAGE_SELECT');
        },
        onBack: function() {
          AB.Game.setState('MAIN');
        },
        onSelectStage: function(i) {
          AB.Game.startLevel(i);
        },
        onPause: function() {
          AB.Game.pause();
        },
        onResume: function() {
          AB.Game.resume();
        },
        onRetry: function() {
          AB.Game.startLevel(AB.Game.levelIndex);
        },
        onMain: function() {
          AB.Game.goToMain();
        },
        onNext: function() {
          if (AB.Game.levelIndex < 9) {
            AB.Game.startLevel(AB.Game.levelIndex + 1);
          }
        }
      });
      AB.Game.setState('MAIN');
      requestAnimationFrame(AB.Game.frame);
    },

    setState: function(s) {
      AB.Game.state = s;
      AB.UI.showScreen(s);
      if (s === 'STAGE_SELECT') {
        AB.UI.renderStageGrid();
      }
    },

    startLevel: function(i) {
      AB.Game.levelIndex = i;
      const def = AB.LEVELS[i];
      AB.Game.world = AB.Physics.createWorld();

      // Ground
      const ground = AB.Physics.createBody({
        shape: 'box',
        x: 640,
        y: 680,
        w: 2400,
        h: 80,
        isStatic: true,
        kind: 'ground',
        restitution: cfg.GROUND_RESTITUTION,
        friction: cfg.GROUND_FRICTION
      });
      AB.Physics.addBody(AB.Game.world, ground);

      // Blocks
      for (let i = 0; i < def.blocks.length; i++) {
        const b = def.blocks[i];
        const m = AB.MATERIALS[b.material];
        const block = AB.Physics.createBody({
          shape: 'box',
          x: b.x,
          y: b.y,
          w: b.w,
          h: b.h,
          density: m.density,
          restitution: m.restitution,
          friction: m.friction,
          kind: 'block',
          material: b.material,
          hp: m.hp
        });
        block.sleeping = true;
        AB.Physics.addBody(AB.Game.world, block);
      }

      // Pigs
      for (let i = 0; i < def.pigs.length; i++) {
        const p = def.pigs[i];
        const pt = AB.PIG_TYPES[p.type];
        const pig = AB.Physics.createBody({
          shape: 'circle',
          x: p.x,
          y: p.y,
          r: pt.radius,
          density: pt.density,
          restitution: pt.restitution,
          friction: pt.friction,
          kind: 'pig',
          subtype: p.type,
          hp: pt.hp
        });
        pig.sleeping = true;
        AB.Physics.addBody(AB.Game.world, pig);
      }

      AB.Game.birdQueue = def.birds.slice();
      AB.Game.score = 0;
      AB.Game.activeBird = null;
      AB.Game.turnPhase = 'ready';
      AB.Game.phaseTime = 0;
      AB.Game.birdSlowTime = 0;
      AB.Game.abilityUsed = false;
      AB.Game.fuseTime = 0;
      AB.Game.clearTimer = -1;
      AB.Game.trail = [];
      AB.Game.trailCounter = 0;
      AB.Game.accumulator = 0;
      AB.Game.lastResult = null;

      AB.Game.pigsAlive = AB.Game.countPigs();
      AB.Slingshot.reset();
      AB.Effects.reset();

      AB.Game.setState('PLAYING');
    },

    pause: function() {
      if (AB.Game.state !== 'PLAYING') return;
      if (AB.Game.turnPhase === 'aiming') {
        AB.Slingshot.cancel();
        AB.Game.turnPhase = 'ready';
      }
      AB.Game.setState('PAUSED');
    },

    resume: function() {
      if (AB.Game.state !== 'PAUSED') return;
      AB.Game.accumulator = 0;
      AB.Game.setState('PLAYING');
    },

    goToMain: function() {
      AB.Game.world = null;
      AB.Game.activeBird = null;
      AB.Slingshot.reset();
      AB.Effects.reset();
      AB.Game.setState('MAIN');
    },

    frame: function(now) {
      if (AB.Game.lastTime === null) {
        AB.Game.lastTime = now;
      }
      const frameDt = Math.min((now - AB.Game.lastTime) / 1000, 0.1);
      AB.Game.lastTime = now;

      if (AB.Game.state === 'PLAYING') {
        AB.Game.accumulator += frameDt;
        let steps = 0;
        while (AB.Game.accumulator >= cfg.FIXED_DT && steps < cfg.MAX_STEPS_PER_FRAME && AB.Game.state === 'PLAYING') {
          AB.Game.fixedUpdate(cfg.FIXED_DT);
          AB.Game.accumulator -= cfg.FIXED_DT;
          steps++;
        }
        if (steps >= cfg.MAX_STEPS_PER_FRAME) {
          AB.Game.accumulator = 0;
        }
      }

      AB.Render.draw();
      requestAnimationFrame(AB.Game.frame);
    },

    fixedUpdate: function(dt) {
      AB.Game.phaseTime += dt;
      AB.Physics.step(AB.Game.world, dt);

      // Apply damage
      const bodiesToRemove = [];
      const bodies = AB.Game.world.bodies.slice();
      for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        if (body.pendingDamage > 0) {
          if (body.hp < Infinity) {
            body.hp -= body.pendingDamage;
          }
          body.pendingDamage = 0;
          if (body.hp <= 0) {
            bodiesToRemove.push(body);
          }
        }
      }
      for (let i = 0; i < bodiesToRemove.length; i++) {
        AB.Game.destroyBody(bodiesToRemove[i], true);
      }

      // Remove out of world
      const bodiesToRemove2 = [];
      for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        if (body.kind === 'ground') continue;
        if (body.x < cfg.OUT_LEFT || body.x > cfg.OUT_RIGHT || body.y > cfg.OUT_BOTTOM ||
            !isFinite(body.x) || !isFinite(body.y)) {
          bodiesToRemove2.push(body);
        }
      }
      for (let i = 0; i < bodiesToRemove2.length; i++) {
        AB.Game.destroyBody(bodiesToRemove2[i], false);
      }

      AB.Effects.update(dt);

      // Clear check
      AB.Game.pigsAlive = AB.Game.countPigs();
      if (AB.Game.pigsAlive === 0 && AB.Game.clearTimer < 0) {
        AB.Game.clearTimer = 0;
      }
      if (AB.Game.clearTimer >= 0) {
        AB.Game.clearTimer += dt;
        if (AB.Game.clearTimer >= cfg.CLEAR_DELAY) {
          AB.Game.completeLevel();
        }
        return;
      }

      // Turn phase logic
      if (AB.Game.turnPhase === 'flying') {
        AB.Game.flyingPhase(dt);
      } else if (AB.Game.turnPhase === 'settling') {
        AB.Game.settlingPhase(dt);
      }
    },

    flyingPhase: function(dt) {
      if (AB.Game.activeBird === null || !AB.Game.activeBird.alive) {
        AB.Game.endTurn();
        return;
      }

      // Record trail
      AB.Game.trailCounter++;
      if (AB.Game.trailCounter % cfg.TRAIL_INTERVAL_STEPS === 0) {
        AB.Game.trail.push({ x: AB.Game.activeBird.x, y: AB.Game.activeBird.y });
        if (AB.Game.trail.length > cfg.TRAIL_MAX_POINTS) {
          AB.Game.trail.shift();
        }
      }

      // Black bomb auto-fuse
      if (AB.Game.activeBird.subtype === 'black' && !AB.Game.abilityUsed && AB.Game.activeBird.touched) {
        AB.Game.fuseTime += dt;
        if (AB.Game.fuseTime >= cfg.BLACK_FUSE_TIME) {
          AB.Game.explodeBird();
          AB.Game.endTurn();
          return;
        }
      }

      const speed = AB.Physics.speedOf(AB.Game.activeBird);
      if (speed < cfg.BIRD_REST_SPEED) {
        AB.Game.birdSlowTime += dt;
      } else {
        AB.Game.birdSlowTime = 0;
      }

      if (AB.Game.birdSlowTime >= cfg.BIRD_REST_TIME || AB.Game.activeBird.sleeping || AB.Game.phaseTime >= cfg.BIRD_MAX_FLIGHT_TIME) {
        if (AB.Game.activeBird.subtype === 'black' && !AB.Game.abilityUsed) {
          AB.Game.explodeBird();
        } else {
          AB.Game.destroyBody(AB.Game.activeBird, true);
        }
        AB.Game.endTurn();
      }
    },

    settlingPhase: function(dt) {
      // Check stability
      let allStable = true;
      for (let i = 0; i < AB.Game.world.bodies.length; i++) {
        const body = AB.Game.world.bodies[i];
        if (!body.isStatic && !body.sleeping) {
          if (AB.Physics.speedOf(body) >= cfg.SETTLE_SPEED) {
            allStable = false;
            break;
          }
        }
      }

      const ready = (allStable && AB.Game.phaseTime >= cfg.SETTLE_MIN_TIME) || AB.Game.phaseTime >= cfg.SETTLE_MAX_TIME;
      if (ready) {
        if (AB.Game.birdQueue.length === 0) {
          AB.Game.failLevel();
        } else {
          AB.Game.turnPhase = 'ready';
          AB.Game.phaseTime = 0;
        }
      }
    },

    endTurn: function() {
      AB.Game.activeBird = null;
      AB.Game.turnPhase = 'settling';
      AB.Game.phaseTime = 0;
    },

    launchBird: function(launch) {
      const type = AB.Game.birdQueue.shift();
      const t = AB.BIRD_TYPES[type];
      const bird = AB.Physics.createBody({
        shape: 'circle',
        x: launch.x,
        y: launch.y,
        r: t.radius,
        density: t.density,
        restitution: t.restitution,
        friction: t.friction,
        kind: 'bird',
        subtype: type
      });
      bird.vx = launch.vx;
      bird.vy = launch.vy;
      AB.Physics.addBody(AB.Game.world, bird);
      AB.Game.activeBird = bird;
      AB.Game.turnPhase = 'flying';
      AB.Game.phaseTime = 0;
      AB.Game.birdSlowTime = 0;
      AB.Game.abilityUsed = false;
      AB.Game.fuseTime = 0;
      AB.Game.trail = [];
      AB.Game.trailCounter = 0;
    },

    tryActivateAbility: function() {
      if (AB.Game.turnPhase !== 'flying' || !AB.Game.activeBird || !AB.Game.activeBird.alive || AB.Game.abilityUsed) {
        return;
      }

      const type = AB.Game.activeBird.subtype;
      if (type === 'yellow') {
        if (AB.Game.activeBird.touched) return;
        AB.Game.activeBird.vx *= cfg.DASH_MULTIPLIER;
        AB.Game.activeBird.vy *= cfg.DASH_MULTIPLIER;
        AB.Game.abilityUsed = true;
        AB.Effects.spawnDebris(AB.Game.activeBird.x, AB.Game.activeBird.y, '#FFE066', 8);
      } else if (type === 'black') {
        AB.Game.explodeBird();
      }
    },

    explodeBird: function() {
      const b = AB.Game.activeBird;
      if (!b) return;
      const bx = b.x;
      const by = b.y;
      AB.Game.abilityUsed = true;
      b.alive = false;
      AB.Physics.removeBody(AB.Game.world, b);
      const results = AB.Physics.explode(AB.Game.world, bx, by, cfg.BOMB_RADIUS, cfg.BOMB_IMPULSE, cfg.BOMB_MAX_DV);
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (r.body.hp < Infinity) {
          r.body.pendingDamage += cfg.BOMB_DAMAGE * r.strength;
        }
      }
      AB.Effects.spawnRing(bx, by, cfg.BOMB_RADIUS);
      AB.Effects.spawnDebris(bx, by, '#FF8C1A', 20);
      AB.Game.activeBird = null;
      AB.Physics.wakeAll(AB.Game.world);
    },

    destroyBody: function(body, showEffects) {
      if (!body.alive) return;
      body.alive = false;
      AB.Physics.removeBody(AB.Game.world, body);

      if (body.kind === 'block') {
        const m = AB.MATERIALS[body.material];
        AB.Game.score += m.score;
        if (showEffects) {
          AB.Effects.spawnDebris(body.x, body.y, m.fill, 10);
          AB.Effects.spawnText(body.x, body.y, '+' + m.score.toLocaleString('ko-KR'), 'white');
        }
      } else if (body.kind === 'pig') {
        const p = AB.PIG_TYPES[body.subtype];
        AB.Game.score += p.score;
        if (showEffects) {
          AB.Effects.spawnDebris(body.x, body.y, '#7BC043', 12);
          AB.Effects.spawnText(body.x, body.y, '+' + p.score.toLocaleString('ko-KR'), '#FFF3A0');
        }
      } else if (body.kind === 'bird') {
        if (showEffects) {
          AB.Effects.spawnDebris(body.x, body.y, '#FFFFFF', 6);
        }
      }

      AB.Physics.wakeAll(AB.Game.world);
    },

    completeLevel: function() {
      const remaining = AB.Game.birdQueue.length;
      const bonus = remaining * cfg.BIRD_BONUS;
      AB.Game.score += bonus;
      const stars = 1 + (remaining >= 1 ? 1 : 0) + (remaining >= 2 ? 1 : 0);
      const best = AB.Storage.recordClear(AB.Game.levelIndex, stars, AB.Game.score);
      AB.Game.lastResult = { stars: stars, bonus: bonus, best: best };
      AB.UI.setClearInfo({
        stageNumber: AB.Game.levelIndex + 1,
        score: AB.Game.score,
        bonus: bonus,
        stars: stars,
        best: best,
        isLast: AB.Game.levelIndex === 9
      });
      AB.Game.setState('CLEARED');
    },

    failLevel: function() {
      AB.UI.setFailInfo({
        stageNumber: AB.Game.levelIndex + 1,
        pigsLeft: AB.Game.pigsAlive
      });
      AB.Game.setState('FAILED');
    },

    countPigs: function() {
      let count = 0;
      for (let i = 0; i < AB.Game.world.bodies.length; i++) {
        const body = AB.Game.world.bodies[i];
        if (body.kind === 'pig' && body.alive) {
          count++;
        }
      }
      return count;
    },

    handlePointerDown: function(x, y) {
      if (AB.Game.state !== 'PLAYING') return;
      if (AB.Game.clearTimer >= 0) return;

      if (AB.Game.turnPhase === 'ready' && AB.Game.birdQueue.length > 0) {
        const radius = AB.BIRD_TYPES[AB.Game.birdQueue[0]].radius;
        if (AB.Slingshot.beginDrag(x, y, radius)) {
          AB.Game.turnPhase = 'aiming';
        }
      } else if (AB.Game.turnPhase === 'flying') {
        AB.Game.tryActivateAbility();
      }
    },

    handlePointerMove: function(x, y) {
      if (AB.Game.state === 'PLAYING' && AB.Game.turnPhase === 'aiming') {
        const radius = AB.BIRD_TYPES[AB.Game.birdQueue[0]].radius;
        AB.Slingshot.updateDrag(x, y, radius);
      }
    },

    handlePointerUp: function(x, y) {
      if (AB.Game.state === 'PLAYING' && AB.Game.turnPhase === 'aiming') {
        const launch = AB.Slingshot.release();
        if (launch) {
          AB.Game.launchBird(launch);
        } else {
          AB.Game.turnPhase = 'ready';
        }
      }
    },

    handlePointerCancel: function() {
      if (AB.Game.turnPhase === 'aiming') {
        AB.Slingshot.cancel();
        AB.Game.turnPhase = 'ready';
      }
    },

    handleKey: function(key) {
      if (key === 'Escape') {
        if (AB.Game.state === 'PLAYING') {
          AB.Game.pause();
        } else if (AB.Game.state === 'PAUSED') {
          AB.Game.resume();
        }
      }
    },

    handleVisibilityHidden: function() {
      AB.Game.pause();
    },

    getCurrentBirdType: function() {
      if ((AB.Game.turnPhase === 'ready' || AB.Game.turnPhase === 'aiming') && AB.Game.birdQueue.length > 0 && AB.Game.clearTimer < 0) {
        return AB.Game.birdQueue[0];
      }
      return null;
    }
  };
})();
