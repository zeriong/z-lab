/* core.js — pure physics / game logic (no DOM).
 * Runs in the browser (window.SlingCore) AND in Node (module.exports = factory),
 * so the exact same simulation used on screen can be verified head-less.
 *
 * Anchors: A1 physics + collision-damage, A2 discrete-step preview + solver,
 * A3 clear/fail judging, A4 data->world loader, A5 reset via fresh engine.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory; // Node: call factory(Matter)
  else root.SlingCore = factory(root.Matter);                                 // Browser: Matter is global
})(typeof self !== 'undefined' ? self : this, function (Matter) {
  'use strict';
  const { Engine, Bodies, Body, Composite, Events } = Matter;

  // ---- world / physics constants ----
  const W = 1280, H = 720;
  const GROUND_TOP = 660;
  const STEP = 1000 / 60;                      // fixed timestep (deterministic)
  const GRAVITY_Y = 1, GRAVITY_SCALE = 0.001;
  const GRAV = GRAVITY_Y * GRAVITY_SCALE * STEP * STEP; // per-step downward velocity gain
  const BIRD_FA = 0.001;                        // bird air friction (tiny -> clean arcs)
  const FRICTION_F = 1 - BIRD_FA;

  const ANCHOR = { x: 230, y: 468 };
  const BIRD_R = 18;
  const MAX_PULL = 130;
  const MAX_SPEED = 16;
  const MIN_PULL = 12;
  const POWER = MAX_SPEED / MAX_PULL;

  const REST_EPS = 0.45;
  const REST_HOLD = 26;
  const CALM_HOLD = 16;
  const MAX_FLIGHT = 300;   // hard cap on a bird's airtime (steps) -> never soft-lock

  const MATERIAL = {
    wood:  { density: 0.005, friction: 0.6, restitution: 0.2,  health: 40,  threshold: 3.2, dmgMul: 3.2, fill: '#c98a3c', edge: '#8a5a1e' },
    stone: { density: 0.024, friction: 0.7, restitution: 0.15, health: 220, threshold: 6.0, dmgMul: 1.6, fill: '#9aa3ab', edge: '#5c646b' },
    ice:   { density: 0.004, friction: 0.4, restitution: 0.25, health: 20,  threshold: 2.3, dmgMul: 5.0, fill: '#a9d9ef', edge: '#5fa7cf' },
  };
  const PIG = { density: 0.006, friction: 0.5, restitution: 0.2, health: 18, threshold: 2.6, dmgMul: 3.2 };
  const BIRD = { density: 0.013, friction: 0.5, restitution: 0.35 };

  // ---- idempotent loader: data -> fresh world (A4, A5) ----
  function buildSession(stage) {
    const engine = Engine.create();
    engine.gravity.y = GRAVITY_Y;
    engine.gravity.scale = GRAVITY_SCALE;
    engine.positionIterations = 8;
    engine.velocityIterations = 8;
    const world = engine.world;

    const s = {
      engine, world, stage,
      pigs: [], blocks: [],
      pigsAlive: 0,
      birdsLoaded: stage.birds,
      currentBird: null,
      birdState: 'none',        // ready | flying | spent | none
      restSteps: 0, calmSteps: 0,
      aimPos: null, aimLaunch: null, aimDist: 0,
      toRemove: [],
      result: null,             // clear | fail | null
    };

    const ground = Bodies.rectangle(W / 2, GROUND_TOP + 60, W + 400, 120, {
      isStatic: true, friction: 0.8, restitution: 0.2,
    });
    ground.gameMeta = { kind: 'ground' };
    Composite.add(world, ground);

    for (const b of stage.blocks) {
      const m = MATERIAL[b.type];
      const body = Bodies.rectangle(b.x, b.y, b.w, b.h, {
        angle: b.angle || 0, density: m.density,
        friction: m.friction, frictionStatic: 1, restitution: m.restitution,
      });
      body.gameMeta = {
        kind: 'block', type: b.type, destructible: true,
        health: m.health, maxHealth: m.health,
        threshold: m.threshold, dmgMul: m.dmgMul, w: b.w, h: b.h,
      };
      s.blocks.push(body);
      Composite.add(world, body);
    }

    for (const p of stage.pigs) {
      const r = p.r || 22;
      const body = Bodies.circle(p.x, p.y, r, {
        density: PIG.density, friction: PIG.friction, restitution: PIG.restitution,
      });
      body.gameMeta = {
        kind: 'pig', destructible: true,
        health: PIG.health, maxHealth: PIG.health,
        threshold: PIG.threshold, dmgMul: PIG.dmgMul, r,
      };
      s.pigs.push(body);
      s.pigsAlive++;
      Composite.add(world, body);
    }

    Events.on(engine, 'collisionStart', function (evt) {
      for (const pair of evt.pairs) {
        const a = pair.bodyA, b = pair.bodyB;
        const impact = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
        applyDamage(s, a, impact);
        applyDamage(s, b, impact);
      }
    });

    return s;
  }

  function applyDamage(s, body, impact) {
    const m = body.gameMeta;
    if (!m || !m.destructible || m.dead) return;
    if (impact <= m.threshold) return;
    m.health -= (impact - m.threshold) * m.dmgMul;
    if (m.health <= 0) {
      m.dead = true;
      s.toRemove.push(body);
      if (m.kind === 'pig') s.pigsAlive--;
    }
  }

  function placeBird(s) {
    if (s.birdsLoaded <= 0) { s.birdState = 'spent'; s.currentBird = null; return; }
    // NB: create DYNAMIC first (finite mass), THEN hold static. Passing isStatic:true
    // to the constructor corrupts mass (stays Infinity -> NaN on launch).
    const bird = Bodies.circle(ANCHOR.x, ANCHOR.y, BIRD_R, {
      density: BIRD.density, friction: BIRD.friction,
      restitution: BIRD.restitution, frictionAir: BIRD_FA,
    });
    Body.setStatic(bird, true);
    bird.gameMeta = { kind: 'bird' };
    s.currentBird = bird;
    s.birdState = 'ready';
    s.aimPos = null; s.aimLaunch = null; s.aimDist = 0;
    Composite.add(s.world, bird);
  }

  function fireBird(s, vx, vy) {
    if (!s.currentBird || s.birdState !== 'ready') return false;
    const bird = s.currentBird;
    Body.setStatic(bird, false);
    Body.setPosition(bird, s.aimPos || { x: ANCHOR.x, y: ANCHOR.y });
    Body.setVelocity(bird, { x: vx, y: vy });
    s.birdState = 'flying';
    s.birdsLoaded--;
    s.calmSteps = 0;
    s.flightSteps = 0;
    s.aimPos = null;
    return true;
  }

  // one fixed step of simulation + game bookkeeping
  function stepSession(s) {
    Engine.update(s.engine, STEP);

    if (s.toRemove.length) {
      for (const body of s.toRemove) Composite.remove(s.world, body);
      s.toRemove.length = 0;
    }

    if (s.pigsAlive <= 0 && !s.result) { s.result = 'clear'; return; }

    if (s.birdState === 'flying' && s.currentBird) {
      const b = s.currentBird;
      const spd = Math.hypot(b.velocity.x, b.velocity.y);
      const oob = b.position.x < -80 || b.position.x > W + 120 || b.position.y > H + 80;
      s.flightSteps = (s.flightSteps || 0) + 1;
      if (spd < REST_EPS) s.calmSteps++; else s.calmSteps = 0;
      if (oob || s.calmSteps >= CALM_HOLD || s.flightSteps >= MAX_FLIGHT) {
        Composite.remove(s.world, b);
        s.currentBird = null; s.calmSteps = 0;
        if (s.pigsAlive > 0) placeBird(s);
      }
    }

    let maxSpeed = 0;
    const bodies = Composite.allBodies(s.world);
    for (const body of bodies) {
      if (body.isStatic) continue;
      const sp = Math.hypot(body.velocity.x, body.velocity.y);
      if (sp > maxSpeed) maxSpeed = sp;
    }
    if (maxSpeed < REST_EPS) s.restSteps++; else s.restSteps = 0;

    if (!s.result && s.birdState === 'spent' && s.pigsAlive > 0 && s.restSteps >= REST_HOLD) {
      s.result = 'fail';
    }
  }

  // discrete-step arc replay (mirrors the integrator; ignores collisions by design)
  function replay(x, y, vx, vy, steps) {
    const pts = [];
    for (let i = 0; i < steps; i++) {
      vx *= FRICTION_F;
      vy = vy * FRICTION_F + GRAV;
      x += vx; y += vy;
      pts.push({ x, y });
      if (y > GROUND_TOP + 40 || x > W + 200) break;
    }
    return pts;
  }

  // find launch (vx,vy) whose free-flight arc passes closest to (tx,ty)
  function solveLaunch(tx, ty, arcPref) {
    const cands = [];
    let globalBest = null;
    for (let deg = 16; deg <= 82; deg += 2) {
      const a = deg * Math.PI / 180;
      for (let spd = 6; spd <= MAX_SPEED; spd += 0.4) {
        const vx0 = spd * Math.cos(a), vy0 = -spd * Math.sin(a);
        // The controls launch from the PULLED-BACK point (ANCHOR - V/POWER), not the
        // anchor, so the achievable arc for this velocity starts there.
        let x = ANCHOR.x - vx0 / POWER, y = ANCHOR.y - vy0 / POWER, vx = vx0, vy = vy0, mind = 1e9;
        for (let st = 0; st < 260; st++) {
          vx *= FRICTION_F; vy = vy * FRICTION_F + GRAV; x += vx; y += vy;
          const d = Math.hypot(x - tx, y - ty);
          if (d < mind) mind = d;
          if (y > 720 || x > W + 200) break;
        }
        const cand = { deg, vx: vx0, vy: vy0, mind };
        if (!globalBest || mind < globalBest.mind) globalBest = cand;
        if (mind < 26) cands.push(cand);
      }
    }
    if (!cands.length) return { vx: globalBest.vx, vy: globalBest.vy };
    // prefer accurate shots: keep only those close to the best fit, then let arcPref
    // pick among near-equal options (flat / mid / high) for variety.
    cands.sort((p, q) => p.mind - q.mind);
    const good = cands.filter((c) => c.mind <= cands[0].mind + 6);
    good.sort((p, q) => p.deg - q.deg);
    const idx = arcPref === 0 ? 0 : arcPref === 2 ? good.length - 1 : (good.length >> 1);
    const c = good[idx];
    return { vx: c.vx, vy: c.vy };
  }

  // head-less greedy auto-player: proves a stage is clearable within its bird budget.
  // Models a persistent player: aims at the nearest pig, and if that pig keeps
  // surviving, escalates through different aim offsets (roof, front column, higher
  // arc) to break its shelter — a conservative lower bound on human skill.
  const AIM_OFFSETS = [[0, 0], [0, -66], [-70, -28], [12, 8], [-34, -92], [46, -18]];
  function verifyStage(stage) {
    const s = buildSession(stage);
    placeBird(s);
    const budget = s.birdsLoaded;
    let used = 0;
    const tries = {};
    while (s.pigsAlive > 0 && s.birdState === 'ready') {
      let ti = -1, bestd = 1e9;
      s.pigs.forEach((p, idx) => {
        if (p.gameMeta.dead) return;
        const d = Math.hypot(p.position.x - ANCHOR.x, p.position.y - ANCHOR.y);
        if (d < bestd) { bestd = d; ti = idx; }
      });
      if (ti < 0) break;
      const p = s.pigs[ti];
      const t = tries[ti] || 0; tries[ti] = t + 1;
      // A plausible player: first two shots aim straight at the pig (mid then flat).
      // If it keeps surviving it's sheltered -> topple the frontmost guarding block;
      // failing that, cycle aim offsets (roof / column / higher arc).
      let aimX = p.position.x, aimY = p.position.y, arc = t === 0 ? 1 : 0;
      if (t >= 2) {
        let guard = null, gx = 1e9;
        for (const b of s.blocks) {
          if (b.gameMeta.dead) continue;
          if (Math.abs(b.position.x - p.position.x) > 120) continue;
          if (b.position.y > p.position.y + 40) continue;
          if (b.position.x < gx) { gx = b.position.x; guard = b; }
        }
        if (guard) { aimX = guard.position.x; aimY = guard.position.y; arc = 0; }
        else { const o = AIM_OFFSETS[t % AIM_OFFSETS.length]; aimX = p.position.x + o[0]; aimY = p.position.y + o[1]; arc = t % 3; }
      }
      const v = solveLaunch(aimX, aimY, arc);
      // fire from the real pulled-back launch point, exactly as the drag controls do
      s.aimPos = { x: ANCHOR.x - v.vx / POWER, y: ANCHOR.y - v.vy / POWER };
      fireBird(s, v.vx, v.vy); used++;
      let i = 0;
      while (i < 320 && s.birdState === 'flying' && !s.result) { stepSession(s); i++; }
      let j = 0;
      while (j < 80 && !s.result && s.restSteps < REST_HOLD) { stepSession(s); j++; }
      if (s.result === 'clear') break;
    }
    return { id: stage.id, cleared: s.pigsAlive === 0, pigsLeft: s.pigsAlive, birdsUsed: used, budget };
  }

  return {
    W, H, GROUND_TOP, ANCHOR, BIRD_R, MAX_PULL, MAX_SPEED, MIN_PULL, POWER,
    STEP, GRAV, MATERIAL,
    buildSession, placeBird, fireBird, stepSession, replay, solveLaunch, verifyStage,
  };
});
