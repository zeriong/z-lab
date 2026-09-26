function initPhysics() {
  G.engine = Engine.create();
  G.engine.gravity.y = 1;
  G.engine.positionIterations = POSITION_ITERATIONS;
  G.engine.velocityIterations = VELOCITY_ITERATIONS;
  Events.on(G.engine, 'collisionStart', onCollisionStart);
}

function clearWorld() {
  Composite.clear(G.engine.world, false);
  Engine.clear(G.engine);
}

function loadLevel(index) {
  const lv = LEVELS[index];
  clearWorld();

  const ground = Bodies.rectangle(W / 2, GROUND_Y + 40, 3000, 80, { isStatic: true, friction: 0.9, label: 'ground' });
  ground.ab = { kind: 'ground' };
  Composite.add(G.engine.world, ground);

  G.pigsLeft = 0;
  lv.items.forEach(item => {
    const body = makeItem(item);
    Composite.add(G.engine.world, body);
    if (body.ab.kind === 'pig') {
      G.pigsLeft += 1;
    }
  });

  G.levelIndex = index;
  G.birdQueue = lv.birds.slice();
  G.birdType = G.birdQueue.shift();
  G.phase = 'aiming';
  G.bird = null;
  G.aim = { x: SLING_X, y: SLING_Y };
  G.dragging = false;
  G.time = 0;
  G.accumulator = 0;
  G.launchTime = 0;
  G.settleCount = 0;
  G.abilityUsed = false;
  G.birdHitAt = -1;
  G.damageEnabled = false;
  G.score = 0;
  G.clearAt = 0;
  G.toRemove = [];
  G.particles = [];
  G.popups = [];
  G.trail = [];
  G.shake = 0;
}

function makeItem(item) {
  if (SHAPES[item.t]) {
    const s = SHAPES[item.t];
    const mat = MATERIALS[item.m];
    const body = Bodies.rectangle(item.x, item.y - s.h / 2, s.w, s.h, {
      density: mat.density,
      friction: 0.8,
      frictionStatic: 1,
      restitution: 0.05,
      label: 'block'
    });
    body.ab = {
      kind: 'block',
      t: item.t,
      m: item.m,
      w: s.w,
      h: s.h,
      hp: mat.hp,
      maxHp: mat.hp,
      score: mat.score,
      dead: false
    };
    return body;
  } else if (PIGS[item.t]) {
    const p = PIGS[item.t];
    const body = Bodies.circle(item.x, item.y - p.r, p.r, {
      density: 0.001,
      friction: 0.6,
      frictionStatic: 0.8,
      restitution: 0.2,
      label: 'pig'
    });
    body.ab = {
      kind: 'pig',
      t: item.t,
      r: p.r,
      hp: p.hp,
      maxHp: p.hp,
      score: p.score,
      dead: false
    };
    return body;
  } else if (item.t === 'ledge') {
    const body = Bodies.rectangle(item.x, item.y - item.h / 2, item.w, item.h, {
      isStatic: true,
      friction: 0.9,
      label: 'ledge'
    });
    body.ab = { kind: 'static', w: item.w, h: item.h };
    return body;
  }
}

function launchBird() {
  const def = BIRDS[G.birdType];
  const dx = SLING_X - G.aim.x;
  const dy = SLING_Y - G.aim.y;

  const body = Bodies.circle(G.aim.x, G.aim.y, def.r, {
    density: def.density,
    friction: 0.5,
    restitution: 0.3,
    frictionAir: 0,
    label: 'bird'
  });
  body.ab = { kind: 'bird', type: G.birdType };

  Composite.add(G.engine.world, body);
  Body.setVelocity(body, {
    x: dx / MAX_PULL * MAX_LAUNCH_SPEED,
    y: dy / MAX_PULL * MAX_LAUNCH_SPEED
  });

  G.bird = body;
  G.phase = 'flying';
  G.launchTime = G.time;
  G.settleCount = 0;
  G.birdHitAt = -1;
  G.abilityUsed = false;
  G.damageEnabled = true;
  G.trail = [];

  playSound('launch');
  updateHud();
}

function onCollisionStart(event) {
  event.pairs.forEach(pair => {
    const a = pair.bodyA;
    const b = pair.bodyB;

    if (G.bird && (a === G.bird || b === G.bird) && G.birdHitAt < 0) {
      G.birdHitAt = G.time;
      G.bird.frictionAir = HIT_FRICTION_AIR;
    }

    if (!G.damageEnabled) return;

    const rel = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
    if (rel <= DAMAGE_MIN_SPEED) return;

    const m = a.isStatic ? b.mass : (b.isStatic ? a.mass : a.mass * b.mass / (a.mass + b.mass));
    const dmg = (rel - DAMAGE_MIN_SPEED) * m * DAMAGE_K;

    applyDamage(a, dmg);
    applyDamage(b, dmg);

    if (dmg >= 5) {
      playSound('hit');
    }
  });
}

function applyDamage(body, amount) {
  const ab = body.ab;
  if (!ab || ab.hp === undefined || ab.dead) return;

  ab.hp -= amount;
  if (ab.hp <= 0) {
    ab.dead = true;
    G.toRemove.push(body);
  }
}

function processRemovals() {
  if (G.toRemove.length === 0) return;

  G.toRemove.forEach(body => {
    Composite.remove(G.engine.world, body);
    G.score += body.ab.score;
    spawnPopup(body.position.x, body.position.y - 20, '+' + body.ab.score);

    if (body.ab.kind === 'pig') {
      G.pigsLeft -= 1;
      spawnParticles(body.position.x, body.position.y, '#7ed957', 16);
      playSound('pig');
    } else if (body.ab.kind === 'block') {
      spawnParticles(body.position.x, body.position.y, MATERIALS[body.ab.m].color, 12);
      playSound(body.ab.m);
    }
  });

  G.toRemove = [];
  updateHud();

  if (G.pigsLeft <= 0 && (G.phase === 'aiming' || G.phase === 'flying')) {
    enterClearing();
  }
}

function killOutOfBounds() {
  Composite.allBodies(G.engine.world).forEach(body => {
    const x = body.position.x;
    const y = body.position.y;

    if (x < -100 || x > W + 100 || y > H + 100) {
      if (body.ab && (body.ab.kind === 'block' || body.ab.kind === 'pig')) {
        applyDamage(body, 99999);
      }
      if (body === G.bird) {
        Composite.remove(G.engine.world, body);
        G.bird = null;
      }
    }
  });
}

function isWorldSettled() {
  return !Composite.allBodies(G.engine.world).some(body =>
    !body.isStatic && (body.speed > SETTLE_SPEED || body.angularSpeed > SETTLE_ANGULAR)
  );
}

function activateAbility() {
  if (!G.bird || G.abilityUsed) return;

  if (G.birdType === 'yellow' && G.birdHitAt < 0) {
    const s = G.bird.speed || 1;
    Body.setVelocity(G.bird, {
      x: G.bird.velocity.x / s * YELLOW_BOOST_SPEED,
      y: G.bird.velocity.y / s * YELLOW_BOOST_SPEED
    });
    G.abilityUsed = true;
    spawnParticles(G.bird.position.x, G.bird.position.y, '#f2c230', 10);
    playSound('launch');
  } else if (G.birdType === 'black') {
    explodeBird();
  }
}

function explodeBird() {
  G.abilityUsed = true;
  const cx = G.bird.position.x;
  const cy = G.bird.position.y;

  Composite.allBodies(G.engine.world).forEach(body => {
    const ab = body.ab;
    if (!ab || (ab.kind !== 'block' && ab.kind !== 'pig') || ab.dead) return;

    const dx = body.position.x - cx;
    const dy = body.position.y - cy;
    const d = Math.hypot(dx, dy);

    if (d < EXPLOSION_RADIUS) {
      const f = 1 - d / EXPLOSION_RADIUS;
      applyDamage(body, EXPLOSION_DAMAGE * f);

      if (d > 0.001) {
        Body.setVelocity(body, {
          x: body.velocity.x + dx / d * EXPLOSION_PUSH * f,
          y: body.velocity.y + dy / d * EXPLOSION_PUSH * f
        });
      }
    }
  });

  Composite.remove(G.engine.world, G.bird);
  G.bird = null;
  spawnParticles(cx, cy, '#ff8a00', 30);
  spawnParticles(cx, cy, '#444444', 20);
  G.shake = 12;
  playSound('explode');
}
