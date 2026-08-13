// Game logic
window.GAME = (() => {
  function create(canvas) {
    const game = {
      state: 'MENU',
      shot: 'ARMED',
      world: P.createWorld(),
      cam: { x: 0, y: 0 },
      canvas,
      score: 0,
      currentStageId: 1,
      birds: [],
      bird: null,
      particles: [],
      flyTime: 0,
      settleTimer: 0,
      accTime: 0,
      damageApplied: new Set()
    };
    return game;
  }

  function loadStage(game, stageId) {
    game.currentStageId = stageId;
    game.world = P.createWorld();
    game.score = 0;
    game.shot = 'ARMED';
    game.particles = [];
    game.flyTime = 0;
    game.settleTimer = 0;
    game.accTime = 0;
    game.damageApplied.clear();

    // Add ground
    P.addBox(game.world, 960, 680, 960, 60, 'ground', true);
    game.world.bodies[game.world.bodies.length - 1].kind = 'ground';

    const stage = STAGES[stageId - 1];
    stage.build(game.world);

    // Setup birds
    game.birds = stage.birds.map(type => ({
      type
    }));

    nextBird(game);
    game.cam.x = 0;
    game.state = 'PLAYING';
  }

  function nextBird(game) {
    if (game.birds.length === 0) return;

    const birdTypeObj = game.birds.shift();
    const birdType = birdTypeObj.type;
    const radius = BIRD[birdType].radius;
    game.bird = {
      x: C.SLING_X,
      y: C.SLING_Y,
      r: radius,
      vx: 0,
      vy: 0,
      birdType,
      ability: BIRD[birdType].ability,
      abilityUsed: false,
      angle: 0
    };
  }

  function update(game, dt) {
    if (game.state !== 'PLAYING') return;

    game.accTime += dt;
    let steps = 0;

    while (game.accTime >= C.FIXED_DT && steps < C.MAX_STEPS) {
      P.step(game.world, C.FIXED_DT);
      game.accTime -= C.FIXED_DT;
      steps++;
    }

    if (steps === C.MAX_STEPS) {
      game.accTime = 0;
    }

    // Update shot lifecycle
    if (game.shot === 'FLYING') {
      game.flyTime += dt;

      // Add bird to world if not already there
      if (!game.bird.body) {
        const birdBody = P.addCircle(game.world, game.bird.x, game.bird.y, game.bird.r, 'bird');
        birdBody.kind = 'bird';
        birdBody.birdType = game.bird.birdType;
        birdBody.vx = game.bird.vx;
        birdBody.vy = game.bird.vy;
        birdBody.hp = Infinity;
        game.bird.body = birdBody;
      }

      // Update bird angle
      if (game.bird.body.vx !== 0 || game.bird.body.vy !== 0) {
        game.bird.angle = Math.atan2(game.bird.body.vy, game.bird.body.vx);
      }

      // Check settle conditions
      let allSleeping = true;
      for (const body of game.world.bodies) {
        if (!body.isStatic && !body.sleeping) {
          allSleeping = false;
          break;
        }
      }

      const birdOutOfBounds = game.bird.body.x < -50 ||
                              game.bird.body.x > C.WORLD_W + 50 ||
                              game.bird.body.y > C.WORLD_H + 100;

      const shouldSettle = allSleeping || game.flyTime > C.SETTLE_TIMEOUT || birdOutOfBounds;

      if (shouldSettle && game.shot === 'FLYING') {
        game.shot = 'SETTLING';
        game.settleTimer = 0;
      }
    }

    if (game.shot === 'SETTLING') {
      game.settleTimer += dt;

      if (game.settleTimer > C.SETTLE_GRACE) {
        // Count pigs
        const pigs = game.world.bodies.filter(b => b.kind === 'pig');

        if (pigs.length === 0) {
          // Clear
          calculateScore(game);
          game.state = 'CLEAR';
        } else if (game.birds.length === 0) {
          // Fail
          game.state = 'FAIL';
        } else {
          // Next bird
          if (game.bird.body) {
            game.world.bodies = game.world.bodies.filter(b => b !== game.bird.body);
          }
          game.shot = 'ARMED';
          game.flyTime = 0;
          game.settleTimer = 0;
          nextBird(game);
        }
      }
    }

    // Update camera
    let camTarget = 0;
    if (game.shot === 'FLYING' && game.bird.body) {
      camTarget = U.clamp(game.bird.body.x - 420, 0, 640);
    }
    const lerpFactor = 1 - Math.pow(0.001, dt);
    game.cam.x = U.lerp(game.cam.x, camTarget, lerpFactor);

    // Update particles
    for (let i = game.particles.length - 1; i >= 0; i--) {
      const p = game.particles[i];
      p.vy += C.GRAVITY * 0.5 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      if (p.life <= 0) {
        game.particles.splice(i, 1);
      }
    }
  }

  function startDrag(game, px, py) {
    if (game.state !== 'PLAYING' || game.shot !== 'ARMED') return;

    const dist = Math.sqrt(
      (px - C.SLING_X) ** 2 + (py - C.SLING_Y) ** 2
    );

    if (dist < C.SLING_GRAB_R) {
      game.shot = 'DRAG';
    }
  }

  function moveDrag(game, px, py) {
    if (game.shot !== 'DRAG') return;

    const dx = px - C.SLING_X;
    const dy = py - C.SLING_Y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= C.SLING_MAX_PULL) {
      game.bird.x = C.SLING_X + dx;
      game.bird.y = C.SLING_Y + dy;
    } else {
      const ratio = C.SLING_MAX_PULL / dist;
      game.bird.x = C.SLING_X + dx * ratio;
      game.bird.y = C.SLING_Y + dy * ratio;
    }
  }

  function release(game) {
    if (game.shot !== 'DRAG') return;

    const dx = C.SLING_X - game.bird.x;
    const dy = C.SLING_Y - game.bird.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 12) {
      // Cancel
      game.shot = 'ARMED';
      game.bird.x = C.SLING_X;
      game.bird.y = C.SLING_Y;
      return;
    }

    // Launch
    let vx = dx * C.LAUNCH_POWER;
    let vy = dy * C.LAUNCH_POWER;
    const speed = Math.sqrt(vx * vx + vy * vy);

    if (speed > C.MAX_LAUNCH_SPEED) {
      const ratio = C.MAX_LAUNCH_SPEED / speed;
      vx *= ratio;
      vy *= ratio;
    }

    game.bird.vx = vx;
    game.bird.vy = vy;
    game.shot = 'FLYING';
    game.flyTime = 0;

    try {
      SFX.play('launch');
    } catch (e) {}
  }

  function tapAbility(game) {
    if (game.shot !== 'FLYING' || !game.bird || game.bird.abilityUsed) return;
    if (!game.bird.body) return;

    const ability = game.bird.ability;

    if (ability === 'speed') {
      game.bird.abilityUsed = true;
      const speed = Math.sqrt(game.bird.body.vx ** 2 + game.bird.body.vy ** 2);
      const ratio = 1.9;
      const newSpeed = Math.min(speed * ratio, 2400);
      const scale = newSpeed / (speed || 1);
      game.bird.body.vx *= scale;
      game.bird.body.vy *= scale;
    } else if (ability === 'explode') {
      game.bird.abilityUsed = true;
      explodeBird(game);
    }
  }

  function explodeBird(game) {
    if (!game.bird || !game.bird.body) return;

    const bx = game.bird.body.x;
    const by = game.bird.body.y;
    const nearby = P.queryRadius(game.world, bx, by, C.EXPLODE_R);

    for (const body of nearby) {
      const dx = body.x - bx;
      const dy = body.y - by;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;

      const f = 1 - dist / C.EXPLODE_R;
      if (f > 0) {
        body.vx += nx * C.EXPLODE_IMPULSE * f * body.invMass;
        body.vy += ny * C.EXPLODE_IMPULSE * f * body.invMass;
        body.hp -= C.EXPLODE_DMG * f;
        if (body.hp <= 0 && body.hp !== Infinity) {
          body.dead = true;
        }
      }
    }

    // Create explosion particles
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 120 + Math.random() * 200;
      game.particles.push({
        x: bx,
        y: by,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.7,
        maxLife: 0.7,
        color: '#f2a33c',
        size: 4 + Math.random() * 4
      });
    }

    game.world.bodies = game.world.bodies.filter(b => b !== game.bird.body);
    game.shot = 'SETTLING';
    game.settleTimer = 0;

    try {
      SFX.play('break');
    } catch (e) {}
  }

  function calculateScore(game) {
    const stage = STAGES[game.currentStageId - 1];
    const birdsLeft = game.birds.length;
    const pigs = game.world.bodies.filter(b => b.kind === 'pig');
    let blockScore = 0;

    for (const body of game.world.bodies) {
      if (body.kind === 'block' && body.mat !== 'ground') {
        const mat = MAT[body.mat];
        blockScore += mat.score;
      }
    }

    const pigScore = (stage.birds.length - birdsLeft) * 5000;
    const birdBonusScore = birdsLeft * C.SCORE_BIRD_LEFT;
    game.score = pigScore + blockScore + birdBonusScore;

    // Calculate max score
    const maxPigScore = stage.birds.length * C.SCORE_PIG;
    let maxBlockScore = 0;
    const tempWorld = P.createWorld();
    stage.build(tempWorld);
    for (const body of tempWorld.bodies) {
      if (body.kind === 'block' && body.mat !== 'ground') {
        const mat = MAT[body.mat];
        maxBlockScore += mat.score;
      }
    }
    const maxBirdBonus = stage.birds.length * C.SCORE_BIRD_LEFT;
    const maxScore = maxPigScore + maxBlockScore + maxBirdBonus;

    let stars = 1;
    if (game.score >= maxScore * 0.5) stars = 2;
    if (game.score >= maxScore * 0.75) stars = 3;

    // Save progress
    const save = loadSave();
    save.unlocked = Math.max(save.unlocked, game.currentStageId + 1);
    if (!save.stars) save.stars = {};
    if (!save.best) save.best = {};
    save.stars[game.currentStageId] = Math.max(save.stars[game.currentStageId] || 0, stars);
    save.best[game.currentStageId] = Math.max(save.best[game.currentStageId] || 0, game.score);
    saveSave(save);

    return { score: game.score, stars, maxScore };
  }

  function loadSave() {
    try {
      const data = localStorage.getItem(C.SAVE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {}
    return { v: 1, unlocked: 1, stars: {}, best: {} };
  }

  function saveSave(save) {
    try {
      localStorage.setItem(C.SAVE_KEY, JSON.stringify(save));
    } catch (e) {}
  }

  function pause(game) {
    if (game.state === 'PLAYING') {
      game.state = 'PAUSED';
    }
  }

  function resume(game) {
    if (game.state === 'PAUSED') {
      game.state = 'PLAYING';
    }
  }

  function retry(game) {
    loadStage(game, game.currentStageId);
  }

  function toMenu(game) {
    game.state = 'MENU';
    game.world = P.createWorld();
    game.bird = null;
    game.birds = [];
  }

  return {
    create,
    loadStage,
    update,
    startDrag,
    moveDrag,
    release,
    tapAbility,
    pause,
    resume,
    retry,
    toMenu,
    calculateScore,
    loadSave,
    saveSave
  };
})();
