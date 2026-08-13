// Game state machine (§6)
const GAME = {
  create(canvas) {
    const game = {
      state: 'MENU',
      shot: 'ARMED',
      world: P.createWorld(),
      cam: { x: 0 },
      stageId: 1,
      score: 0,
      maxScore: 0,
      birds: [],
      currentBirdIdx: 0,
      currentBird: null,
      particles: [],
      flyTime: 0,
      settleTimer: 0,
      acc: 0,
      abilityUsed: false,
      canvas,
      firstTouchHappened: false
    };

    // Load progress
    game.save = GAME._loadSave();

    return game;
  },

  loadStage(game, id) {
    if (id < 1 || id > STAGES.length) return;

    game.stageId = id;
    game.world = P.createWorld();
    game.score = 0;
    game.particles = [];
    game.flyTime = 0;
    game.settleTimer = 0;
    game.acc = 0;
    game.abilityUsed = false;
    game.shot = 'ARMED';
    game.state = 'PLAYING';
    game.cam.x = 0;

    // Add ground
    P.addBox(game.world, 960, 680, 960, 60, { isStatic: true, mat: 'ground', kind: 'ground' });

    // Load stage
    const stage = STAGES.find(s => s.id === id);
    stage.build(game.world);

    // Set up birds
    game.birds = stage.birds.map(name => {
      const spec = BIRD[name];
      return {
        birdType: name,
        r: spec.r,
        x: C.SLING_X,
        y: C.SLING_Y,
        vx: 0,
        vy: 0,
        kind: 'bird',
        mat: 'bird',
        hp: Infinity,
        maxHp: Infinity,
        dead: false,
        angle: 0,
        id: -1,
        contactTime: -1
      };
    });
    game.currentBirdIdx = 0;
    game.currentBird = game.birds[0];

    // Calculate max score
    let blockScore = 0;
    for (let body of game.world.bodies) {
      if (body.kind === 'block') {
        blockScore += MAT[body.mat].score;
      }
    }
    game.maxScore = (game.birds.length * C.SCORE_PIG) + blockScore + (game.birds.length * C.SCORE_BIRD_LEFT);

    UI.updateHud(game);
  },

  update(game, dt) {
    if (game.state !== 'PLAYING') return;

    SFX.init();

    // Fixed step accumulation
    game.acc += dt;
    let steps = 0;
    while (game.acc >= C.FIXED_DT && steps < C.MAX_STEPS) {
      P.step(game.world, C.FIXED_DT);
      game.acc -= C.FIXED_DT;
      steps++;
    }
    if (steps === C.MAX_STEPS) game.acc = 0;

    // Update particles
    for (let i = game.particles.length - 1; i >= 0; i--) {
      const p = game.particles[i];
      p.vy += C.GRAVITY * 0.5 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) game.particles.splice(i, 1);
    }

    // Shot lifecycle
    if (game.shot === 'FLYING') {
      game.flyTime += dt;
      game.currentBird.angle = Math.atan2(game.currentBird.vy, game.currentBird.vx);

      // Check settling conditions
      const allSleeping = game.world.bodies
        .filter(b => !b.isStatic)
        .every(b => b.sleeping || b.dead);
      const birdOut = game.currentBird.x < -50 || game.currentBird.x > C.WORLD_W + 50 || game.currentBird.y > C.WORLD_H + 100;
      const birdDead = game.currentBird.dead;

      if ((allSleeping && birdDead) || game.flyTime > C.SETTLE_TIMEOUT || birdOut) {
        game.shot = 'SETTLING';
        game.settleTimer = 0;
      }
    }

    if (game.shot === 'SETTLING') {
      game.settleTimer += dt;
      if (game.settleTimer > C.SETTLE_GRACE) {
        // Check outcome
        const pigCount = game.world.bodies.filter(b => b.kind === 'pig' && !b.dead).length;
        const birdIdx = game.currentBirdIdx + 1;

        if (pigCount === 0) {
          game.state = 'CLEAR';
          GAME._saveClear(game);
          SFX.play('win');
          UI.showClear(game);
        } else if (birdIdx >= game.birds.length) {
          game.state = 'FAIL';
          SFX.play('lose');
          UI.showFail(game);
        } else {
          // Next bird
          game.currentBirdIdx = birdIdx;
          game.currentBird = game.birds[birdIdx];
          game.shot = 'ARMED';
          game.abilityUsed = false;
          game.flyTime = 0;
        }
      }
    }

    // Camera follow
    const camTarget = game.shot === 'FLYING' ? U.clamp(game.currentBird.x - 420, 0, 640) : 0;
    game.cam.x = U.lerp(game.cam.x, camTarget, 1 - Math.pow(0.001, dt));

    UI.updateHud(game);
  },

  startDrag(game, px, py) {
    if (game.state !== 'PLAYING' || game.shot !== 'ARMED') return;
    const d = Math.sqrt((px - C.SLING_X) ** 2 + (py - C.SLING_Y) ** 2);
    if (d > C.SLING_GRAB_R) return;
    game.shot = 'DRAG';
  },

  moveDrag(game, px, py) {
    if (game.shot !== 'DRAG') return;
    const dx = px - C.SLING_X;
    const dy = py - C.SLING_Y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d <= C.SLING_MAX_PULL) {
      game.currentBird.x = C.SLING_X + dx;
      game.currentBird.y = C.SLING_Y + dy;
    } else {
      const scale = C.SLING_MAX_PULL / d;
      game.currentBird.x = C.SLING_X + dx * scale;
      game.currentBird.y = C.SLING_Y + dy * scale;
    }
  },

  release(game) {
    if (game.shot !== 'DRAG') return;

    const dx = game.currentBird.x - C.SLING_X;
    const dy = game.currentBird.y - C.SLING_Y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d < 12) {
      game.shot = 'ARMED';
      game.currentBird.x = C.SLING_X;
      game.currentBird.y = C.SLING_Y;
      return;
    }

    // Launch
    let vx = (C.SLING_X - game.currentBird.x) * C.LAUNCH_POWER;
    let vy = (C.SLING_Y - game.currentBird.y) * C.LAUNCH_POWER;
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > C.MAX_LAUNCH_SPEED) {
      const scale = C.MAX_LAUNCH_SPEED / speed;
      vx *= scale;
      vy *= scale;
    }

    // Add to world
    const bird = P.addCircle(game.world, game.currentBird.x, game.currentBird.y, game.currentBird.r, {
      mat: 'bird',
      kind: 'bird'
    });
    bird.vx = vx;
    bird.vy = vy;
    bird.birdType = game.currentBird.birdType;
    bird.hp = Infinity;
    bird.maxHp = Infinity;
    bird.contactTime = 0;

    game.currentBird.id = bird.id;
    game.shot = 'FLYING';
    game.flyTime = 0;

    SFX.play('launch');
  },

  tapAbility(game) {
    if (game.state !== 'PLAYING' || game.shot !== 'FLYING' || game.abilityUsed) return;

    const bird = game.world.bodies.find(b => b.id === game.currentBird.id);
    if (!bird) return;

    const birdType = game.currentBird.birdType;

    if (birdType === 'yellow') {
      // Speed boost
      const speed = Math.sqrt(bird.vx * bird.vx + bird.vy * bird.vy);
      const newSpeed = Math.min(speed * 1.9, 2400);
      const scale = newSpeed / speed;
      bird.vx *= scale;
      bird.vy *= scale;
      game.abilityUsed = true;
      SFX.play('hit');
    } else if (birdType === 'black') {
      // Explode
      bird.contactTime = 0;
      GAME._triggerExplosion(game, bird);
      game.abilityUsed = true;
      SFX.play('break');
    }
  },

  _triggerExplosion(game, bird) {
    const nearby = P.queryRadius(game.world, bird.x, bird.y, C.EXPLODE_R);

    for (let b of nearby) {
      const dx = b.x - bird.x;
      const dy = b.y - bird.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d === 0) continue;

      const nx = dx / d;
      const ny = dy / d;
      const f = 1 - d / C.EXPLODE_R;
      if (f <= 0) continue;

      b.vx += nx * C.EXPLODE_IMPULSE * f * b.invMass;
      b.vy += ny * C.EXPLODE_IMPULSE * f * b.invMass;
      b.hp -= C.EXPLODE_DMG * f;
      if (b.hp <= 0) b.dead = true;
    }

    // Particles
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 200;
      game.particles.push({
        x: bird.x,
        y: bird.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.7,
        maxLife: 0.7,
        color: '#f2a33c',
        size: 4
      });
    }

    bird.dead = true;
    game.shot = 'SETTLING';
    game.settleTimer = 0;
  },

  pause(game) {
    if (game.state === 'PLAYING') {
      game.state = 'PAUSED';
      UI.setScreen('pause');
    }
  },

  resume(game) {
    if (game.state === 'PAUSED') {
      game.state = 'PLAYING';
      UI.setScreen('playing');
    }
  },

  retry(game) {
    GAME.loadStage(game, game.stageId);
  },

  toMenu(game) {
    game.state = 'MENU';
    UI.setScreen('main');
  },

  _loadSave() {
    try {
      const data = localStorage.getItem(C.SAVE_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {}
    return { v: 1, unlocked: 1, stars: {}, best: {} };
  },

  _saveClear(game) {
    const pigCount = STAGES.find(s => s.id === game.stageId).birds.length; // number of birds used
    const birdBonus = (game.birds.length - game.currentBirdIdx - 1) * C.SCORE_BIRD_LEFT;
    game.score += birdBonus;

    const stars = game.score >= game.maxScore * 0.75 ? 3 : game.score >= game.maxScore * 0.5 ? 2 : 1;

    game.save.unlocked = Math.max(game.save.unlocked, game.stageId + 1);
    if (!game.save.stars[game.stageId]) game.save.stars[game.stageId] = stars;
    else game.save.stars[game.stageId] = Math.max(game.save.stars[game.stageId], stars);

    if (!game.save.best[game.stageId]) game.save.best[game.stageId] = game.score;
    else game.save.best[game.stageId] = Math.max(game.save.best[game.stageId], game.score);

    try {
      localStorage.setItem(C.SAVE_KEY, JSON.stringify(game.save));
    } catch (e) {}
  }
};
