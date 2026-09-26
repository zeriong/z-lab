(function() {
  window.AB = window.AB || {};

  const C = window.AB.CONFIG;

  const G = window.AB.Game = {
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
    lastResult: null
  };

  function setState(s) {
    G.state = s;
    window.AB.UI.showScreen(s);
    if (s === 'STAGE_SELECT') {
      window.AB.UI.renderStageGrid();
    }
  }

  function countPigs() {
    if (!G.world) return 0;
    return G.world.bodies.filter(b => b.kind === 'pig' && b.alive).length;
  }

  function init(canvas) {
    window.AB.Storage.load();
    window.AB.Render.init(canvas);
    window.AB.Input.init(canvas);

    const handlers = {
      onStart: () => startLevel(window.AB.Storage.firstPlayableLevel()),
      onOpenStages: () => setState('STAGE_SELECT'),
      onBack: () => setState('MAIN'),
      onSelectStage: (i) => startLevel(i),
      onPause: () => pause(),
      onResume: () => resume(),
      onRetry: () => startLevel(G.levelIndex),
      onMain: () => goToMain(),
      onNext: () => {
        if (G.levelIndex < 9) {
          startLevel(G.levelIndex + 1);
        }
      }
    };

    window.AB.UI.init(handlers);
    setState('MAIN');

    requestAnimationFrame(frame);
  }

  function startLevel(i) {
    G.levelIndex = i;
    const def = window.AB.LEVELS[i];

    G.world = window.AB.Physics.createWorld();

    // Ground
    const ground = window.AB.Physics.createBody({
      shape: 'box',
      x: 640,
      y: 680,
      w: 2400,
      h: 80,
      isStatic: true,
      kind: 'ground',
      restitution: C.GROUND_RESTITUTION,
      friction: C.GROUND_FRICTION,
      density: 0
    });
    window.AB.Physics.addBody(G.world, ground);

    // Blocks
    for (const blockDef of def.blocks) {
      const m = window.AB.MATERIALS[blockDef.material];
      const block = window.AB.Physics.createBody({
        shape: 'box',
        x: blockDef.x,
        y: blockDef.y,
        w: blockDef.w,
        h: blockDef.h,
        density: m.density,
        restitution: m.restitution,
        friction: m.friction,
        kind: 'block',
        material: blockDef.material,
        hp: m.hp
      });
      block.sleeping = true;
      window.AB.Physics.addBody(G.world, block);
    }

    // Pigs
    for (const pigDef of def.pigs) {
      const p = window.AB.PIG_TYPES[pigDef.type];
      const pig = window.AB.Physics.createBody({
        shape: 'circle',
        x: pigDef.x,
        y: pigDef.y,
        r: p.radius,
        density: p.density,
        restitution: p.restitution,
        friction: p.friction,
        kind: 'pig',
        subtype: pigDef.type,
        hp: p.hp
      });
      pig.sleeping = true;
      window.AB.Physics.addBody(G.world, pig);
    }

    G.birdQueue = def.birds.slice();
    G.score = 0;
    G.activeBird = null;
    G.turnPhase = 'ready';
    G.phaseTime = 0;
    G.birdSlowTime = 0;
    G.abilityUsed = false;
    G.fuseTime = 0;
    G.clearTimer = -1;
    G.trail = [];
    G.trailCounter = 0;
    G.accumulator = 0;
    G.lastResult = null;

    G.pigsAlive = countPigs();
    window.AB.Slingshot.reset();
    window.AB.Effects.reset();

    setState('PLAYING');
  }

  function pause() {
    if (G.state !== 'PLAYING') return;
    if (G.turnPhase === 'aiming') {
      window.AB.Slingshot.cancel();
      G.turnPhase = 'ready';
    }
    setState('PAUSED');
  }

  function resume() {
    if (G.state !== 'PAUSED') return;
    G.accumulator = 0;
    setState('PLAYING');
  }

  function goToMain() {
    G.world = null;
    G.activeBird = null;
    window.AB.Slingshot.reset();
    window.AB.Effects.reset();
    setState('MAIN');
  }

  function frame(now) {
    if (G.lastTime === null) {
      G.lastTime = now;
    }

    const frameDt = Math.min((now - G.lastTime) / 1000, 0.1);
    G.lastTime = now;

    if (G.state === 'PLAYING') {
      G.accumulator += frameDt;
      let steps = 0;

      while (G.accumulator >= C.FIXED_DT && steps < C.MAX_STEPS_PER_FRAME) {
        fixedUpdate(C.FIXED_DT);
        G.accumulator -= C.FIXED_DT;
        steps++;

        if (G.state !== 'PLAYING') {
          break;
        }
      }

      if (steps >= C.MAX_STEPS_PER_FRAME) {
        G.accumulator = 0;
      }
    }

    window.AB.Render.draw();
    requestAnimationFrame(frame);
  }

  function fixedUpdate(dt) {
    G.phaseTime += dt;
    window.AB.Physics.step(G.world, dt);

    // Apply damage
    const bodiesToCheck = G.world.bodies.slice();
    const toDestroy = [];
    for (const body of bodiesToCheck) {
      if (body.pendingDamage > 0) {
        if (body.hp !== Infinity) {
          body.hp -= body.pendingDamage;
        }
        body.pendingDamage = 0;
        if (body.hp <= 0) {
          toDestroy.push(body);
        }
      }
    }
    for (const body of toDestroy) {
      destroyBody(body, true);
    }

    // Remove out of bounds
    const toRemove = [];
    for (const body of G.world.bodies) {
      if (body.kind === 'ground') continue;
      if (body.x < C.OUT_LEFT || body.x > C.OUT_RIGHT || body.y > C.OUT_BOTTOM) {
        toRemove.push(body);
      }
      if (!isFinite(body.x) || !isFinite(body.y)) {
        toRemove.push(body);
      }
    }
    for (const body of toRemove) {
      destroyBody(body, false);
    }

    window.AB.Effects.update(dt);

    // Clear check
    G.pigsAlive = countPigs();
    if (G.pigsAlive === 0 && G.clearTimer < 0) {
      G.clearTimer = 0;
    }

    if (G.clearTimer >= 0) {
      G.clearTimer += dt;
      if (G.clearTimer >= C.CLEAR_DELAY) {
        completeLevel();
      }
      return;
    }

    // Turn progression
    if (G.turnPhase === 'flying') {
      flyingPhase(dt);
    } else if (G.turnPhase === 'settling') {
      settlingPhase(dt);
    }
  }

  function flyingPhase(dt) {
    // Bird dead or gone
    if (!G.activeBird || !G.activeBird.alive) {
      endTurn();
      return;
    }

    // Record trail
    G.trailCounter++;
    if (G.trailCounter % C.TRAIL_INTERVAL_STEPS === 0) {
      G.trail.push({ x: G.activeBird.x, y: G.activeBird.y });
      if (G.trail.length > C.TRAIL_MAX_POINTS) {
        G.trail.shift();
      }
    }

    // Black bird fuse
    if (G.activeBird.subtype === 'black' && !G.abilityUsed && G.activeBird.touched) {
      G.fuseTime += dt;
      if (G.fuseTime >= C.BLACK_FUSE_TIME) {
        explodeBird();
        endTurn();
        return;
      }
    }

    // Bird rest
    const speed = window.AB.Physics.speedOf(G.activeBird);
    if (speed < C.BIRD_REST_SPEED) {
      G.birdSlowTime += dt;
    } else {
      G.birdSlowTime = 0;
    }

    // End conditions
    if (G.birdSlowTime >= C.BIRD_REST_TIME || G.activeBird.sleeping || G.phaseTime >= C.BIRD_MAX_FLIGHT_TIME) {
      if (G.activeBird.subtype === 'black' && !G.abilityUsed) {
        explodeBird();
      } else {
        destroyBody(G.activeBird, true);
      }
      endTurn();
    }
  }

  function settlingPhase(dt) {
    // Check if world is stable
    let isStable = true;
    for (const body of G.world.bodies) {
      if (body.isStatic || body.sleeping) continue;
      if (window.AB.Physics.speedOf(body) >= C.SETTLE_SPEED) {
        isStable = false;
        break;
      }
    }

    const minTimeReached = G.phaseTime >= C.SETTLE_MIN_TIME;
    const maxTimeReached = G.phaseTime >= C.SETTLE_MAX_TIME;

    if ((isStable && minTimeReached) || maxTimeReached) {
      if (G.birdQueue.length === 0) {
        failLevel();
      } else {
        G.turnPhase = 'ready';
        G.phaseTime = 0;
      }
    }
  }

  function launchBird(launch) {
    const type = G.birdQueue.shift();
    const t = window.AB.BIRD_TYPES[type];

    const bird = window.AB.Physics.createBody({
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
    window.AB.Physics.addBody(G.world, bird);

    G.activeBird = bird;
    G.turnPhase = 'flying';
    G.phaseTime = 0;
    G.birdSlowTime = 0;
    G.abilityUsed = false;
    G.fuseTime = 0;
    G.trail = [];
    G.trailCounter = 0;
  }

  function tryActivateAbility() {
    if (G.turnPhase !== 'flying') return;
    if (!G.activeBird || !G.activeBird.alive) return;
    if (G.abilityUsed) return;

    const ability = window.AB.BIRD_TYPES[G.activeBird.subtype].ability;

    if (ability === 'dash') {
      if (G.activeBird.touched) return;
      G.activeBird.vx *= C.DASH_MULTIPLIER;
      G.activeBird.vy *= C.DASH_MULTIPLIER;
      G.abilityUsed = true;
      window.AB.Effects.spawnDebris(G.activeBird.x, G.activeBird.y, '#FFE066', 8);
    } else if (ability === 'bomb') {
      explodeBird();
    }
  }

  function explodeBird() {
    const b = G.activeBird;
    const bx = b.x;
    const by = b.y;

    G.abilityUsed = true;
    b.alive = false;
    window.AB.Physics.removeBody(G.world, b);

    const result = window.AB.Physics.explode(G.world, bx, by, C.BOMB_RADIUS, C.BOMB_IMPULSE, C.BOMB_MAX_DV);

    for (const res of result) {
      if (res.body.hp !== Infinity) {
        res.body.pendingDamage += C.BOMB_DAMAGE * res.strength;
      }
    }

    window.AB.Effects.spawnRing(bx, by, C.BOMB_RADIUS);
    window.AB.Effects.spawnDebris(bx, by, '#FF8C1A', 20);
    G.activeBird = null;
    window.AB.Physics.wakeAll(G.world);
  }

  function destroyBody(body, showEffects) {
    if (!body.alive) return;

    body.alive = false;
    window.AB.Physics.removeBody(G.world, body);

    if (body.kind === 'block') {
      const m = window.AB.MATERIALS[body.material];
      G.score += m.score;
      if (showEffects) {
        window.AB.Effects.spawnDebris(body.x, body.y, m.fill, 10);
        const scoreStr = '+' + m.score.toLocaleString('ko-KR');
        window.AB.Effects.spawnText(body.x, body.y, scoreStr, 'white');
      }
    } else if (body.kind === 'pig') {
      const p = window.AB.PIG_TYPES[body.subtype];
      G.score += p.score;
      if (showEffects) {
        window.AB.Effects.spawnDebris(body.x, body.y, '#7BC043', 12);
        const scoreStr = '+' + p.score.toLocaleString('ko-KR');
        window.AB.Effects.spawnText(body.x, body.y, scoreStr, '#FFF3A0');
      }
    } else if (body.kind === 'bird') {
      if (showEffects) {
        window.AB.Effects.spawnDebris(body.x, body.y, '#FFFFFF', 6);
      }
    }

    window.AB.Physics.wakeAll(G.world);
  }

  function endTurn() {
    G.activeBird = null;
    G.turnPhase = 'settling';
    G.phaseTime = 0;
  }

  function completeLevel() {
    const remaining = G.birdQueue.length;
    const bonus = remaining * C.BIRD_BONUS;
    G.score += bonus;

    const stars = 1 + (remaining >= 1 ? 1 : 0) + (remaining >= 2 ? 1 : 0);
    const best = window.AB.Storage.recordClear(G.levelIndex, stars, G.score);

    G.lastResult = { stars, bonus, best };
    window.AB.UI.setClearInfo({
      stageNumber: G.levelIndex + 1,
      score: G.score,
      bonus,
      stars,
      best,
      isLast: G.levelIndex === 9
    });
    setState('CLEARED');
  }

  function failLevel() {
    window.AB.UI.setFailInfo({
      stageNumber: G.levelIndex + 1,
      pigsLeft: G.pigsAlive
    });
    setState('FAILED');
  }

  function getCurrentBirdType() {
    if ((G.turnPhase === 'ready' || G.turnPhase === 'aiming') &&
        G.birdQueue.length > 0 && G.clearTimer < 0) {
      return G.birdQueue[0];
    }
    return null;
  }

  G.init = init;
  G.setState = setState;
  G.startLevel = startLevel;
  G.pause = pause;
  G.resume = resume;
  G.goToMain = goToMain;
  G.getCurrentBirdType = getCurrentBirdType;
  G.countPigs = countPigs;
  G.handlePointerDown = (x, y) => {
    if (G.state !== 'PLAYING') return;
    if (G.clearTimer >= 0) return;

    if (G.turnPhase === 'ready' && G.birdQueue.length > 0) {
      const radius = window.AB.BIRD_TYPES[G.birdQueue[0]].radius;
      if (window.AB.Slingshot.beginDrag(x, y, radius)) {
        G.turnPhase = 'aiming';
      }
    }

    if (G.turnPhase === 'flying') {
      tryActivateAbility();
    }
  };

  G.handlePointerMove = (x, y) => {
    if (G.state === 'PLAYING' && G.turnPhase === 'aiming') {
      const radius = window.AB.BIRD_TYPES[G.birdQueue[0]].radius;
      window.AB.Slingshot.updateDrag(x, y, radius);
    }
  };

  G.handlePointerUp = (x, y) => {
    if (G.state === 'PLAYING' && G.turnPhase === 'aiming') {
      const launch = window.AB.Slingshot.release();
      if (launch === null) {
        G.turnPhase = 'ready';
      } else {
        launchBird(launch);
      }
    }
  };

  G.handlePointerCancel = () => {
    if (G.turnPhase === 'aiming') {
      window.AB.Slingshot.cancel();
      G.turnPhase = 'ready';
    }
  };

  G.handleKey = (key) => {
    if (key === 'Escape') {
      if (G.state === 'PLAYING') {
        pause();
      } else if (G.state === 'PAUSED') {
        resume();
      }
    }
  };

  G.handleVisibilityHidden = () => {
    pause();
  };
})();
