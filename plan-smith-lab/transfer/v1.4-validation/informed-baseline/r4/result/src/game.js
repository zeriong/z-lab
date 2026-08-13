// Game state machine and logic
const GAME = {
  create: (canvas) => {
    const game = {
      canvas,
      state: 'MENU',
      world: P.createWorld(),
      cam: { x: 0 },
      stageId: 1,
      shot: 'ARMED',
      bird: null,
      birdQueue: [],
      currentBirdType: null,
      flyTime: 0,
      settleTime: 0,
      score: 0,
      maxScore: 0,
      particles: [],
      save: null
    };

    // Load save
    try {
      const saved = JSON.parse(localStorage[C.SAVE_KEY] || '{}');
      if (saved.v === 1) {
        game.save = saved;
      }
    } catch (e) {
      // Ignore
    }

    if (!game.save) {
      game.save = { v: 1, unlocked: 1, stars: {}, best: {} };
    }

    return game;
  },

  loadStage: (game, id) => {
    game.stageId = id;
    game.world = P.createWorld();
    game.shot = 'ARMED';
    game.bird = null;
    game.flyTime = 0;
    game.settleTime = 0;
    game.score = 0;
    game.particles = [];
    game.cam.x = 0;

    // Add ground
    P.addBox(game.world, 960, 680, 960, 60, 0, 0.2, 0.8, true, 'ground', 'ground');

    // Load stage
    const stage = STAGES[id - 1];
    game.birdQueue = [...stage.birds];
    stage.build(game.world);

    // Calculate max score
    const pigCount = game.world.bodies.filter(b => b.kind === 'pig').length;
    const blockScore = game.world.bodies
      .filter(b => b.kind === 'block')
      .reduce((sum, b) => sum + MAT[b.mat].score, 0);
    const birdBonusScore = stage.birds.length * C.SCORE_BIRD_LEFT;
    game.maxScore = pigCount * C.SCORE_PIG + blockScore + birdBonusScore;

    game.state = 'PLAYING';
    GAME._armNextBird(game);
  },

  _armNextBird: (game) => {
    if (game.birdQueue.length === 0) {
      return;
    }
    const birdType = game.birdQueue.shift();
    game.currentBirdType = birdType;
    game.bird = {
      x: C.SLING_X,
      y: C.SLING_Y,
      vx: 0,
      vy: 0,
      type: birdType,
      r: BIRD[birdType].r,
      inWorld: false,
      abilityUsed: false,
      firstContactTime: null
    };
    game.shot = 'ARMED';
  },

  startDrag: (game, px, py) => {
    if (game.state !== 'PLAYING' || game.shot !== 'ARMED' || !game.bird) return;
    const dx = px - C.SLING_X;
    const dy = py - C.SLING_Y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > C.SLING_GRAB_R) return;
    game.shot = 'DRAG';
  },

  moveDrag: (game, px, py) => {
    if (game.shot !== 'DRAG' || !game.bird) return;
    const dx = px - C.SLING_X;
    const dy = py - C.SLING_Y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > C.SLING_MAX_PULL) {
      const factor = C.SLING_MAX_PULL / d;
      game.bird.x = C.SLING_X + dx * factor;
      game.bird.y = C.SLING_Y + dy * factor;
    } else {
      game.bird.x = px;
      game.bird.y = py;
    }
  },

  release: (game) => {
    if (game.shot !== 'DRAG' || !game.bird) return;
    const dx = C.SLING_X - game.bird.x;
    const dy = C.SLING_Y - game.bird.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 12) {
      game.bird.x = C.SLING_X;
      game.bird.y = C.SLING_Y;
      game.shot = 'ARMED';
      return;
    }

    try {
      SFX.play('launch');
    } catch (e) {}

    let vx = dx * C.LAUNCH_POWER;
    let vy = dy * C.LAUNCH_POWER;
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > C.MAX_LAUNCH_SPEED) {
      const factor = C.MAX_LAUNCH_SPEED / speed;
      vx *= factor;
      vy *= factor;
    }

    game.bird.vx = vx;
    game.bird.vy = vy;
    game.bird.inWorld = true;
    const birdBody = P.addCircle(
      game.world,
      game.bird.x, game.bird.y,
      game.bird.r,
      MAT.bird.density,
      MAT.bird.e,
      MAT.bird.mu,
      false,
      'bird',
      'bird'
    );
    birdBody.type = game.currentBirdType;
    birdBody.abilityUsed = false;
    birdBody.firstContactTime = null;
    game.shot = 'FLYING';
    game.flyTime = 0;
  },

  tapAbility: (game) => {
    if (game.shot !== 'FLYING' || !game.bird || game.bird.abilityUsed) return;
    const ability = BIRD[game.currentBirdType].ability;

    if (ability === 'boost') {
      try {
        SFX.play('hit');
      } catch (e) {}
      const birdBody = game.world.bodies.find(b => b.kind === 'bird');
      if (birdBody) {
        let speed = Math.sqrt(birdBody.vx * birdBody.vx + birdBody.vy * birdBody.vy);
        if (speed > 0) {
          let newSpeed = speed * 1.9;
          if (newSpeed > 2400) newSpeed = 2400;
          const factor = newSpeed / speed;
          birdBody.vx *= factor;
          birdBody.vy *= factor;
          game.bird.abilityUsed = true;
        }
      }
    } else if (ability === 'explode') {
      GAME._explodeBird(game);
    }
  },

  _explodeBird: (game) => {
    const birdBody = game.world.bodies.find(b => b.kind === 'bird');
    if (!birdBody) return;

    try {
      SFX.play('break');
    } catch (e) {}

    const nearby = P.queryRadius(game.world, birdBody.x, birdBody.y, C.EXPLODE_R);
    for (let b of nearby) {
      if (b === birdBody) continue;
      const dx = b.x - birdBody.x;
      const dy = b.y - birdBody.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d === 0) continue;
      const nx = dx / d;
      const ny = dy / d;
      const f = Math.max(0, 1 - d / C.EXPLODE_R);
      b.vx += nx * C.EXPLODE_IMPULSE * f * b.invMass;
      b.vy += ny * C.EXPLODE_IMPULSE * f * b.invMass;
      if (b.hp !== Infinity) {
        b.hp -= C.EXPLODE_DMG * f;
        if (b.hp <= 0) {
          b.dead = true;
        }
      }
    }

    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * C.EXPLODE_R;
      const vx = Math.cos(angle) * (Math.random() * 200 + 120);
      const vy = Math.sin(angle) * (Math.random() * 200 + 120);
      game.particles.push({
        x: birdBody.x + Math.cos(angle) * dist,
        y: birdBody.y + Math.sin(angle) * dist,
        vx, vy,
        life: 0.7,
        maxLife: 0.7,
        color: 'rgb(242, 163, 60)',
        size: Math.random() * 3 + 2
      });
    }

    birdBody.dead = true;
    game.shot = 'SETTLING';
    game.settleTime = C.SETTLE_GRACE;
  },

  pause: (game) => {
    if (game.state === 'PLAYING') {
      game.state = 'PAUSED';
    }
  },

  resume: (game) => {
    if (game.state === 'PAUSED') {
      game.state = 'PLAYING';
    }
  },

  retry: (game) => {
    GAME.loadStage(game, game.stageId);
  },

  toMenu: (game) => {
    game.state = 'MENU';
    game.world = P.createWorld();
  },

  update: (game, dt) => {
    if (game.state !== 'PLAYING') return;

    // Fixed timestep accumulation
    if (!game.acc) game.acc = 0;
    game.acc += dt;
    let steps = 0;
    while (game.acc >= C.FIXED_DT && steps < C.MAX_STEPS) {
      P.step(game.world, C.FIXED_DT);
      game.acc -= C.FIXED_DT;
      steps++;
    }
    if (steps === C.MAX_STEPS) game.acc = 0;

    // Update bird if in world
    if (game.shot === 'FLYING') {
      const birdBody = game.world.bodies.find(b => b.kind === 'bird');
      if (birdBody) {
        game.bird.x = birdBody.x;
        game.bird.y = birdBody.y;
        game.bird.vx = birdBody.vx;
        game.bird.vy = birdBody.vy;
        game.bird.angle = Math.atan2(birdBody.vy, birdBody.vx);

        // Handle first contact for black bird
        if (BIRD[game.currentBirdType].ability === 'explode') {
          if (!game.bird.firstContactTime) {
            // Check collision
            let hasContact = false;
            for (let b of game.world.bodies) {
              if (b === birdBody || b.kind === 'bird') continue;
              const d = U.dist(birdBody, b);
              const minDist = birdBody.r + (b.shape === 'circle' ? b.r : Math.max(b.hw, b.hh));
              if (d < minDist) {
                hasContact = true;
                break;
              }
            }
            if (hasContact) {
              game.bird.firstContactTime = 0;
            }
          } else if (game.bird.firstContactTime !== null) {
            game.bird.firstContactTime += dt;
            if (game.bird.firstContactTime > 0.6) {
              GAME._explodeBird(game);
            }
          }
        }

        game.flyTime += dt;

        // Check settling conditions
        let allSleeping = true;
        let birdDead = false;
        for (let b of game.world.bodies) {
          if (b.kind === 'bird') {
            if (b.dead || b.y > C.WORLD_H + 100 || b.x < -50 || b.x > C.WORLD_W + 50) {
              birdDead = true;
            }
          } else if (!b.isStatic && !b.sleeping) {
            allSleeping = false;
          }
        }

        if ((allSleeping && birdDead) || game.flyTime > C.SETTLE_TIMEOUT) {
          game.shot = 'SETTLING';
          game.settleTime = C.SETTLE_GRACE;
        }
      }
    }

    // Handle settling
    if (game.shot === 'SETTLING') {
      game.settleTime -= dt;
      if (game.settleTime <= 0) {
        const pigCount = game.world.bodies.filter(b => b.kind === 'pig' && !b.dead).length;
        const birdCount = game.birdQueue.length;

        if (pigCount === 0) {
          // Clear
          const survivors = birdCount;
          game.score += survivors * C.SCORE_BIRD_LEFT;
          const stars = game.score >= game.maxScore * 0.75 ? 3 : (game.score >= game.maxScore * 0.5 ? 2 : 1);
          game.save.stars[game.stageId] = Math.max(game.save.stars[game.stageId] || 0, stars);
          game.save.best[game.stageId] = Math.max(game.save.best[game.stageId] || 0, game.score);
          game.save.unlocked = Math.max(game.save.unlocked, game.stageId + 1);
          try {
            localStorage[C.SAVE_KEY] = JSON.stringify(game.save);
          } catch (e) {}
          game.state = 'CLEAR';
          try {
            SFX.play('win');
          } catch (e) {}
        } else if (birdCount === 0) {
          game.state = 'FAIL';
          try {
            SFX.play('lose');
          } catch (e) {}
        } else {
          GAME._armNextBird(game);
        }
      }
    }

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

    // Camera follow
    if (game.shot === 'FLYING' && game.bird) {
      const targetCamX = U.clamp(game.bird.x - 420, 0, 640);
      game.cam.x = U.lerp(game.cam.x, targetCamX, 1 - Math.pow(0.001, dt));
    } else {
      game.cam.x = U.lerp(game.cam.x, 0, 1 - Math.pow(0.001, dt));
    }
  }
};
