window.AB = window.AB || {};

(function() {
  'use strict';

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

  function countPigs() {
    if (!G.world) return 0;
    let count = 0;
    for (let i = 0; i < G.world.bodies.length; i++) {
      if (G.world.bodies[i].kind === 'pig' && G.world.bodies[i].alive) {
        count++;
      }
    }
    return count;
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
      restitution: AB.CONFIG.GROUND_RESTITUTION,
      friction: AB.CONFIG.GROUND_FRICTION,
      density: 0
    });
    AB.Physics.addBody(G.world, groundBody);

    // Add blocks
    for (let j = 0; j < def.blocks.length; j++) {
      const b = def.blocks[j];
      const m = AB.MATERIALS[b.material];
      const blockBody = AB.Physics.createBody({
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
      blockBody.sleeping = true;
      AB.Physics.addBody(G.world, blockBody);
    }

    // Add pigs
    for (let j = 0; j < def.pigs.length; j++) {
      const p = def.pigs[j];
      const pt = AB.PIG_TYPES[p.type];
      const pigBody = AB.Physics.createBody({
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
      pigBody.sleeping = true;
      AB.Physics.addBody(G.world, pigBody);
    }

    // Initialize game state
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

  function launchBird(launch) {
    const type = G.birdQueue.shift();
    const t = AB.BIRD_TYPES[type];

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
    if (G.turnPhase !== 'flying' || !G.activeBird || !G.activeBird.alive || G.abilityUsed) {
      return;
    }

    const ability = AB.BIRD_TYPES[G.activeBird.subtype].ability;

    if (ability === 'dash') {
      if (G.activeBird.touched) return;
      G.activeBird.vx *= AB.CONFIG.DASH_MULTIPLIER;
      G.activeBird.vy *= AB.CONFIG.DASH_MULTIPLIER;
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

    const result = AB.Physics.explode(
      G.world,
      bx, by,
      AB.CONFIG.BOMB_RADIUS,
      AB.CONFIG.BOMB_IMPULSE,
      AB.CONFIG.BOMB_MAX_DV
    );

    for (let i = 0; i < result.length; i++) {
      const item = result[i];
      if (item.body.hp !== Infinity) {
        item.body.pendingDamage += AB.CONFIG.BOMB_DAMAGE * item.strength;
      }
    }

    AB.Effects.spawnRing(bx, by, AB.CONFIG.BOMB_RADIUS);
    AB.Effects.spawnDebris(bx, by, '#FF8C1A', 20);

    G.activeBird = null;
    AB.Physics.wakeAll(G.world);
  }

  function destroyBody(body, showEffects) {
    if (!body.alive) return;
    body.alive = false;
    AB.Physics.removeBody(G.world, body);

    if (body.kind === 'block') {
      const m = AB.MATERIALS[body.material];
      G.score += m.score;
      if (showEffects) {
        AB.Effects.spawnDebris(body.x, body.y, m.fill, 10);
        const text = '+' + m.score.toLocaleString('ko-KR');
        AB.Effects.spawnText(body.x, body.y, text, 'white');
      }
    } else if (body.kind === 'pig') {
      const p = AB.PIG_TYPES[body.subtype];
      G.score += p.score;
      if (showEffects) {
        AB.Effects.spawnDebris(body.x, body.y, '#7BC043', 12);
        const text = '+' + p.score.toLocaleString('ko-KR');
        AB.Effects.spawnText(body.x, body.y, text, '#FFF3A0');
      }
    } else if (body.kind === 'bird') {
      if (showEffects) {
        AB.Effects.spawnDebris(body.x, body.y, '#FFFFFF', 6);
      }
    }

    AB.Physics.wakeAll(G.world);
  }

  function endTurn() {
    G.activeBird = null;
    G.turnPhase = 'settling';
    G.phaseTime = 0;
  }

  function completeLevel() {
    const remaining = G.birdQueue.length;
    const bonus = remaining * AB.CONFIG.BIRD_BONUS;
    G.score += bonus;

    const stars = 1 + (remaining >= 1 ? 1 : 0) + (remaining >= 2 ? 1 : 0);
    const best = AB.Storage.recordClear(G.levelIndex, stars, G.score);

    G.lastResult = { stars, bonus, best };

    AB.UI.setClearInfo({
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
    AB.UI.setFailInfo({
      stageNumber: G.levelIndex + 1,
      pigsLeft: G.pigsAlive
    });
    setState('FAILED');
  }

  function fixedUpdate(dt) {
    G.phaseTime += dt;

    AB.Physics.step(G.world, dt);

    // Apply damage
    const bodyList = G.world.bodies.slice();
    const toDestroy = [];
    for (let i = 0; i < bodyList.length; i++) {
      const b = bodyList[i];
      if (b.pendingDamage > 0) {
        if (b.hp !== Infinity) {
          b.hp -= b.pendingDamage;
        }
        b.pendingDamage = 0;
        if (b.hp <= 0) {
          toDestroy.push(b);
        }
      }
    }
    for (let i = 0; i < toDestroy.length; i++) {
      destroyBody(toDestroy[i], true);
    }

    // Out of world / invalid removal
    const bodyList2 = G.world.bodies.slice();
    const toRemove = [];
    for (let i = 0; i < bodyList2.length; i++) {
      const b = bodyList2[i];
      if (b.kind !== 'ground') {
        if (b.x < AB.CONFIG.OUT_LEFT || b.x > AB.CONFIG.OUT_RIGHT ||
            b.y > AB.CONFIG.OUT_BOTTOM ||
            !isFinite(b.x) || !isFinite(b.y)) {
          toRemove.push(b);
        }
      }
    }
    for (let i = 0; i < toRemove.length; i++) {
      destroyBody(toRemove[i], false);
    }

    AB.Effects.update(dt);

    // Clear check
    G.pigsAlive = countPigs();
    if (G.pigsAlive === 0 && G.clearTimer < 0) {
      G.clearTimer = 0;
    }

    if (G.clearTimer >= 0) {
      G.clearTimer += dt;
      if (G.clearTimer >= AB.CONFIG.CLEAR_DELAY) {
        completeLevel();
      }
      return;
    }

    // Turn progression
    if (G.turnPhase === 'flying') {
      // Flying phase logic
      if (!G.activeBird || !G.activeBird.alive) {
        endTurn();
      } else {
        // Trail recording
        G.trailCounter++;
        if (G.trailCounter % AB.CONFIG.TRAIL_INTERVAL_STEPS === 0) {
          G.trail.push({ x: G.activeBird.x, y: G.activeBird.y });
          if (G.trail.length > AB.CONFIG.TRAIL_MAX_POINTS) {
            G.trail.shift();
          }
        }

        // Black bird auto-explode
        if (G.activeBird.subtype === 'black' && !G.abilityUsed && G.activeBird.touched) {
          G.fuseTime += dt;
          if (G.fuseTime >= AB.CONFIG.BLACK_FUSE_TIME) {
            explodeBird();
            endTurn();
            return;
          }
        }

        // Speed check
        const speed = AB.Physics.speedOf(G.activeBird);
        if (speed < AB.CONFIG.BIRD_REST_SPEED) {
          G.birdSlowTime += dt;
        } else {
          G.birdSlowTime = 0;
        }

        // End turn conditions
        if (G.birdSlowTime >= AB.CONFIG.BIRD_REST_TIME ||
            G.activeBird.sleeping ||
            G.phaseTime >= AB.CONFIG.BIRD_MAX_FLIGHT_TIME) {
          if (G.activeBird.subtype === 'black' && !G.abilityUsed) {
            explodeBird();
          } else {
            destroyBody(G.activeBird, true);
          }
          endTurn();
        }
      }
    } else if (G.turnPhase === 'settling') {
      // Settling phase logic
      let isStable = true;
      for (let i = 0; i < G.world.bodies.length; i++) {
        const b = G.world.bodies[i];
        if (!b.isStatic && !b.sleeping) {
          if (AB.Physics.speedOf(b) >= AB.CONFIG.SETTLE_SPEED) {
            isStable = false;
            break;
          }
        }
      }

      const settleReady = (isStable && G.phaseTime >= AB.CONFIG.SETTLE_MIN_TIME) ||
                          G.phaseTime >= AB.CONFIG.SETTLE_MAX_TIME;

      if (settleReady) {
        if (G.birdQueue.length === 0) {
          failLevel();
        } else {
          G.turnPhase = 'ready';
          G.phaseTime = 0;
        }
      }
    }
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
      while (G.accumulator >= AB.CONFIG.FIXED_DT && steps < AB.CONFIG.MAX_STEPS_PER_FRAME) {
        fixedUpdate(AB.CONFIG.FIXED_DT);
        G.accumulator -= AB.CONFIG.FIXED_DT;
        steps++;
        if (G.state !== 'PLAYING') {
          break;
        }
      }
      if (steps >= AB.CONFIG.MAX_STEPS_PER_FRAME) {
        G.accumulator = 0;
      }
    }

    AB.Render.draw();

    requestAnimationFrame(frame);
  }

  function init(canvas) {
    AB.Storage.load();
    AB.Render.init(canvas);
    AB.Input.init(canvas);

    const handlers = {
      onStart: () => { startLevel(AB.Storage.firstPlayableLevel()); },
      onOpenStages: () => { setState('STAGE_SELECT'); },
      onBack: () => { setState('MAIN'); },
      onSelectStage: (i) => { startLevel(i); },
      onPause: () => { pause(); },
      onResume: () => { resume(); },
      onRetry: () => { startLevel(G.levelIndex); },
      onMain: () => { goToMain(); },
      onNext: () => {
        if (G.levelIndex < 9) {
          startLevel(G.levelIndex + 1);
        }
      }
    };

    AB.UI.init(handlers);
    setState('MAIN');

    requestAnimationFrame(frame);
  }

  function getCurrentBirdType() {
    if ((G.turnPhase === 'ready' || G.turnPhase === 'aiming') &&
        G.birdQueue.length > 0 && G.clearTimer < 0) {
      return G.birdQueue[0];
    }
    return null;
  }

  function handlePointerDown(x, y) {
    if (G.state !== 'PLAYING') return;
    if (G.clearTimer >= 0) return;

    if (G.turnPhase === 'ready' && G.birdQueue.length > 0) {
      const radius = AB.BIRD_TYPES[G.birdQueue[0]].radius;
      if (AB.Slingshot.beginDrag(x, y, radius)) {
        G.turnPhase = 'aiming';
      }
    } else if (G.turnPhase === 'flying') {
      tryActivateAbility();
    }
  }

  function handlePointerMove(x, y) {
    if (G.state === 'PLAYING' && G.turnPhase === 'aiming') {
      const radius = AB.BIRD_TYPES[G.birdQueue[0]].radius;
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

  AB.Game = G;
  AB.Game.init = init;
  AB.Game.setState = setState;
  AB.Game.startLevel = startLevel;
  AB.Game.pause = pause;
  AB.Game.resume = resume;
  AB.Game.goToMain = goToMain;
  AB.Game.handlePointerDown = handlePointerDown;
  AB.Game.handlePointerMove = handlePointerMove;
  AB.Game.handlePointerUp = handlePointerUp;
  AB.Game.handlePointerCancel = handlePointerCancel;
  AB.Game.handleKey = handleKey;
  AB.Game.handleVisibilityHidden = handleVisibilityHidden;
  AB.Game.getCurrentBirdType = getCurrentBirdType;
  AB.Game.countPigs = countPigs;
})();
