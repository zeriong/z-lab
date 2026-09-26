window.AB = window.AB || {};

(function() {
  'use strict';

  const C = AB.CONFIG;
  const MATERIALS = AB.MATERIALS;
  const PIG_TYPES = AB.PIG_TYPES;
  const BIRD_TYPES = AB.BIRD_TYPES;

  const G = {
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
    AB.UI.showScreen(s);
    if (s === 'STAGE_SELECT') {
      AB.UI.renderStageGrid();
    }
  }

  function init(canvas) {
    AB.Storage.load();
    AB.Render.init(canvas);
    AB.Input.init(canvas);

    const handlers = {
      onStart: function() {
        startLevel(AB.Storage.firstPlayableLevel());
      },
      onOpenStages: function() {
        setState('STAGE_SELECT');
      },
      onBack: function() {
        setState('MAIN');
      },
      onSelectStage: function(i) {
        startLevel(i);
      },
      onPause: function() {
        pause();
      },
      onResume: function() {
        resume();
      },
      onRetry: function() {
        startLevel(G.levelIndex);
      },
      onMain: function() {
        goToMain();
      },
      onNext: function() {
        if (G.levelIndex < 9) {
          startLevel(G.levelIndex + 1);
        }
      }
    };

    AB.UI.init(handlers);
    setState('MAIN');

    requestAnimationFrame(frame);
  }

  function startLevel(i) {
    G.levelIndex = i;
    const def = AB.LEVELS[i];

    G.world = AB.Physics.createWorld();

    // Add ground
    const groundBody = AB.Physics.createBody({
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
    AB.Physics.addBody(G.world, groundBody);

    // Add blocks
    for (let i = 0; i < def.blocks.length; i++) {
      const bd = def.blocks[i];
      const m = MATERIALS[bd.material];
      const blockBody = AB.Physics.createBody({
        shape: 'box',
        x: bd.x,
        y: bd.y,
        w: bd.w,
        h: bd.h,
        density: m.density,
        restitution: m.restitution,
        friction: m.friction,
        kind: 'block',
        material: bd.material,
        hp: m.hp
      });
      blockBody.sleeping = true;
      AB.Physics.addBody(G.world, blockBody);
    }

    // Add pigs
    for (let i = 0; i < def.pigs.length; i++) {
      const pd = def.pigs[i];
      const p = PIG_TYPES[pd.type];
      const pigBody = AB.Physics.createBody({
        shape: 'circle',
        x: pd.x,
        y: pd.y,
        r: p.radius,
        density: p.density,
        restitution: p.restitution,
        friction: p.friction,
        kind: 'pig',
        subtype: pd.type,
        hp: p.hp
      });
      pigBody.sleeping = true;
      AB.Physics.addBody(G.world, pigBody);
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
    AB.Slingshot.reset();
    AB.Effects.reset();

    setState('PLAYING');
  }

  function countPigs() {
    let count = 0;
    for (let i = 0; i < G.world.bodies.length; i++) {
      const body = G.world.bodies[i];
      if (body.kind === 'pig' && body.alive) {
        count++;
      }
    }
    return count;
  }

  function pause() {
    if (G.state !== 'PLAYING') return;
    if (G.turnPhase === 'aiming') {
      AB.Slingshot.cancel();
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
    AB.Slingshot.reset();
    AB.Effects.reset();
    setState('MAIN');
  }

  function getCurrentBirdType() {
    if ((G.turnPhase === 'ready' || G.turnPhase === 'aiming') && G.birdQueue.length > 0 && G.clearTimer < 0) {
      return G.birdQueue[0];
    }
    return null;
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

    AB.Render.draw();
    requestAnimationFrame(frame);
  }

  function fixedUpdate(dt) {
    G.phaseTime += dt;

    AB.Physics.step(G.world, dt);

    // Apply damage
    const bodiesToRemove = [];
    const bodies = G.world.bodies.slice();
    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i];
      if (body.pendingDamage > 0 && body.hp < Infinity) {
        body.hp -= body.pendingDamage;
      }
      body.pendingDamage = 0;

      if (body.hp <= 0) {
        bodiesToRemove.push(body);
      }
    }

    for (let i = 0; i < bodiesToRemove.length; i++) {
      destroyBody(bodiesToRemove[i], true);
    }

    // Remove out of bounds
    const outOfBounds = [];
    const bodies2 = G.world.bodies.slice();
    for (let i = 0; i < bodies2.length; i++) {
      const body = bodies2[i];
      if (body.kind === 'ground') continue;

      if (body.x < C.OUT_LEFT || body.x > C.OUT_RIGHT || body.y > C.OUT_BOTTOM || !isFinite(body.x) || !isFinite(body.y)) {
        outOfBounds.push(body);
      }
    }

    for (let i = 0; i < outOfBounds.length; i++) {
      destroyBody(outOfBounds[i], false);
    }

    AB.Effects.update(dt);

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
    if (G.activeBird === null || !G.activeBird.alive) {
      endTurn();
      return;
    }

    // Trail
    G.trailCounter++;
    if (G.trailCounter % C.TRAIL_INTERVAL_STEPS === 0) {
      G.trail.push({ x: G.activeBird.x, y: G.activeBird.y });
      if (G.trail.length > C.TRAIL_MAX_POINTS) {
        G.trail.shift();
      }
    }

    // Black bomb auto fuse
    if (G.activeBird.subtype === 'black' && !G.abilityUsed && G.activeBird.touched) {
      G.fuseTime += dt;
      if (G.fuseTime >= C.BLACK_FUSE_TIME) {
        explodeBird();
        endTurn();
        return;
      }
    }

    // Rest check
    const speed = AB.Physics.speedOf(G.activeBird);
    if (speed < C.BIRD_REST_SPEED) {
      G.birdSlowTime += dt;
    } else {
      G.birdSlowTime = 0;
    }

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
    // Check stability
    let isStable = true;
    for (let i = 0; i < G.world.bodies.length; i++) {
      const body = G.world.bodies[i];
      if (body.isStatic || body.sleeping) continue;

      if (AB.Physics.speedOf(body) >= C.SETTLE_SPEED) {
        isStable = false;
        break;
      }
    }

    if ((isStable && G.phaseTime >= C.SETTLE_MIN_TIME) || G.phaseTime >= C.SETTLE_MAX_TIME) {
      if (G.birdQueue.length === 0) {
        failLevel();
      } else {
        G.turnPhase = 'ready';
        G.phaseTime = 0;
      }
    }
  }

  function endTurn() {
    G.activeBird = null;
    G.turnPhase = 'settling';
    G.phaseTime = 0;
  }

  function launchBird(launch) {
    const type = G.birdQueue.shift();
    const t = BIRD_TYPES[type];

    const birdBody = AB.Physics.createBody({
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

    birdBody.vx = launch.vx;
    birdBody.vy = launch.vy;
    AB.Physics.addBody(G.world, birdBody);

    G.activeBird = birdBody;
    G.turnPhase = 'flying';
    G.phaseTime = 0;
    G.birdSlowTime = 0;
    G.abilityUsed = false;
    G.fuseTime = 0;
    G.trail = [];
    G.trailCounter = 0;
  }

  function tryActivateAbility() {
    if (G.turnPhase !== 'flying' || G.activeBird === null || !G.activeBird.alive || G.abilityUsed) return;

    const ability = BIRD_TYPES[G.activeBird.subtype].ability;

    if (ability === 'dash') {
      if (G.activeBird.touched) return;
      G.activeBird.vx *= C.DASH_MULTIPLIER;
      G.activeBird.vy *= C.DASH_MULTIPLIER;
      G.abilityUsed = true;
      AB.Effects.spawnDebris(G.activeBird.x, G.activeBird.y, '#FFE066', 8);
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
    AB.Physics.removeBody(G.world, b);

    const result = AB.Physics.explode(G.world, bx, by, C.BOMB_RADIUS, C.BOMB_IMPULSE, C.BOMB_MAX_DV);

    for (let i = 0; i < result.length; i++) {
      const item = result[i];
      if (item.body.hp < Infinity) {
        item.body.pendingDamage += C.BOMB_DAMAGE * item.strength;
      }
    }

    AB.Effects.spawnRing(bx, by, C.BOMB_RADIUS);
    AB.Effects.spawnDebris(bx, by, '#FF8C1A', 20);

    G.activeBird = null;
    AB.Physics.wakeAll(G.world);
  }

  function destroyBody(body, showEffects) {
    if (!body.alive) return;

    body.alive = false;
    AB.Physics.removeBody(G.world, body);

    if (body.kind === 'block') {
      G.score += MATERIALS[body.material].score;
      if (showEffects) {
        AB.Effects.spawnDebris(body.x, body.y, MATERIALS[body.material].fill, 10);
        const scoreText = '+' + MATERIALS[body.material].score.toLocaleString('ko-KR');
        AB.Effects.spawnText(body.x, body.y, scoreText, 'white');
      }
    } else if (body.kind === 'pig') {
      G.score += PIG_TYPES[body.subtype].score;
      if (showEffects) {
        AB.Effects.spawnDebris(body.x, body.y, '#7BC043', 12);
        const scoreText = '+' + PIG_TYPES[body.subtype].score.toLocaleString('ko-KR');
        AB.Effects.spawnText(body.x, body.y, scoreText, '#FFF3A0');
      }
    } else if (body.kind === 'bird') {
      if (showEffects) {
        AB.Effects.spawnDebris(body.x, body.y, '#FFFFFF', 6);
      }
    }

    AB.Physics.wakeAll(G.world);
  }

  function completeLevel() {
    const remaining = G.birdQueue.length;
    const bonus = remaining * C.BIRD_BONUS;
    G.score += bonus;

    let stars = 1;
    if (remaining >= 1) stars++;
    if (remaining >= 2) stars++;

    const best = AB.Storage.recordClear(G.levelIndex, stars, G.score);
    G.lastResult = { stars: stars, bonus: bonus, best: best };

    AB.UI.setClearInfo({
      stageNumber: G.levelIndex + 1,
      score: G.score,
      bonus: bonus,
      stars: stars,
      best: best,
      isLast: G.levelIndex === 9
    });

    setState('CLEARED');
  }

  function failLevel() {
    AB.UI.setFailInfo({
      stageNumber: G.levelIndex + 1,
      pigsLeft: G.pigsAlive
    });
    setState('FAILED');
  }

  function handlePointerDown(x, y) {
    if (G.state !== 'PLAYING') return;
    if (G.clearTimer >= 0) return;

    if (G.turnPhase === 'ready' && G.birdQueue.length > 0) {
      const type = G.birdQueue[0];
      const radius = BIRD_TYPES[type].radius;
      if (AB.Slingshot.beginDrag(x, y, radius)) {
        G.turnPhase = 'aiming';
      }
    } else if (G.turnPhase === 'flying') {
      tryActivateAbility();
    }
  }

  function handlePointerMove(x, y) {
    if (G.state === 'PLAYING' && G.turnPhase === 'aiming') {
      const type = G.birdQueue[0];
      const radius = BIRD_TYPES[type].radius;
      AB.Slingshot.updateDrag(x, y, radius);
    }
  }

  function handlePointerUp(x, y) {
    if (G.state === 'PLAYING' && G.turnPhase === 'aiming') {
      const launch = AB.Slingshot.release();
      if (launch === null) {
        G.turnPhase = 'ready';
      } else {
        launchBird(launch);
      }
    }
  }

  function handlePointerCancel() {
    if (G.turnPhase === 'aiming') {
      AB.Slingshot.cancel();
      G.turnPhase = 'ready';
    }
  }

  function handleKey(key) {
    if (key === 'Escape') {
      if (G.state === 'PLAYING') {
        pause();
      } else if (G.state === 'PAUSED') {
        resume();
      }
    }
  }

  function handleVisibilityHidden() {
    pause();
  }

  AB.Game = {
    state: G.state,
    levelIndex: G.levelIndex,
    world: G.world,
    score: G.score,
    birdQueue: G.birdQueue,
    activeBird: G.activeBird,
    turnPhase: G.turnPhase,
    phaseTime: G.phaseTime,
    birdSlowTime: G.birdSlowTime,
    abilityUsed: G.abilityUsed,
    fuseTime: G.fuseTime,
    clearTimer: G.clearTimer,
    trail: G.trail,
    trailCounter: G.trailCounter,
    pigsAlive: G.pigsAlive,
    accumulator: G.accumulator,
    lastTime: G.lastTime,
    lastResult: G.lastResult,

    init: init,
    setState: setState,
    startLevel: startLevel,
    pause: pause,
    resume: resume,
    goToMain: goToMain,
    getCurrentBirdType: getCurrentBirdType,
    countPigs: countPigs,
    handlePointerDown: handlePointerDown,
    handlePointerMove: handlePointerMove,
    handlePointerUp: handlePointerUp,
    handlePointerCancel: handlePointerCancel,
    handleKey: handleKey,
    handleVisibilityHidden: handleVisibilityHidden
  };

  // Make properties accessible
  Object.defineProperty(AB.Game, 'state', {
    get: function() { return G.state; },
    set: function(v) { G.state = v; }
  });

  Object.defineProperty(AB.Game, 'levelIndex', {
    get: function() { return G.levelIndex; },
    set: function(v) { G.levelIndex = v; }
  });

  Object.defineProperty(AB.Game, 'world', {
    get: function() { return G.world; },
    set: function(v) { G.world = v; }
  });

  Object.defineProperty(AB.Game, 'score', {
    get: function() { return G.score; },
    set: function(v) { G.score = v; }
  });

  Object.defineProperty(AB.Game, 'birdQueue', {
    get: function() { return G.birdQueue; },
    set: function(v) { G.birdQueue = v; }
  });

  Object.defineProperty(AB.Game, 'activeBird', {
    get: function() { return G.activeBird; },
    set: function(v) { G.activeBird = v; }
  });

  Object.defineProperty(AB.Game, 'turnPhase', {
    get: function() { return G.turnPhase; },
    set: function(v) { G.turnPhase = v; }
  });

  Object.defineProperty(AB.Game, 'phaseTime', {
    get: function() { return G.phaseTime; },
    set: function(v) { G.phaseTime = v; }
  });

  Object.defineProperty(AB.Game, 'trail', {
    get: function() { return G.trail; },
    set: function(v) { G.trail = v; }
  });

  Object.defineProperty(AB.Game, 'pigsAlive', {
    get: function() { return G.pigsAlive; },
    set: function(v) { G.pigsAlive = v; }
  });

  Object.defineProperty(AB.Game, 'clearTimer', {
    get: function() { return G.clearTimer; },
    set: function(v) { G.clearTimer = v; }
  });

  Object.defineProperty(AB.Game, 'birdSlowTime', {
    get: function() { return G.birdSlowTime; },
    set: function(v) { G.birdSlowTime = v; }
  });

  Object.defineProperty(AB.Game, 'abilityUsed', {
    get: function() { return G.abilityUsed; },
    set: function(v) { G.abilityUsed = v; }
  });

  Object.defineProperty(AB.Game, 'fuseTime', {
    get: function() { return G.fuseTime; },
    set: function(v) { G.fuseTime = v; }
  });

  Object.defineProperty(AB.Game, 'trailCounter', {
    get: function() { return G.trailCounter; },
    set: function(v) { G.trailCounter = v; }
  });
})();
