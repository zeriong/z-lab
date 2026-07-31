var AB = window.AB || (window.AB = {});

// Step 3 -- collision-energy destruction, scoring, clear/fail verdicts.
AB.Judge = (function () {
  // Declared-arbitrary thresholds/values (Step 7: pending first playtest
  // measurement, not derived from any physical constant).
  const BREAK_IMPULSE = { pig: 18 };
  const DEBRIS_PER_BLOCK = 3;
  const DEBRIS_LIFE = 1.5; // seconds

  function processCollisions(world, session) {
    for (let i = 0; i < world.collisions.length; i++) {
      const c = world.collisions[i];
      considerBreak(c.a, c.impulse, world, session);
      considerBreak(c.b, c.impulse, world, session);
    }
  }

  function considerBreak(body, impulse, world, session) {
    if (body.destroyed || body.isStatic) return;
    if (impulse < body.breakImpulse) return;
    body.destroyed = true;
    if (body.tag === 'pig') {
      session.pigsRemaining -= 1;
      session.score += 500;
    } else if (body.tag === 'block') {
      session.score += 100;
      spawnDebris(body, world);
    }
  }

  function spawnDebris(body, world) {
    for (let i = 0; i < DEBRIS_PER_BLOCK; i++) {
      const piece = AB.Physics.createCircle({
        x: body.x + AB.RNG.range(-5, 5),
        y: body.y + AB.RNG.range(-5, 5),
        radius: 4 + AB.RNG.next() * 3,
        density: 0.3,
        restitution: 0.2,
        friction: 0.5,
        tag: 'debris',
        life: DEBRIS_LIFE
      });
      const speed = AB.RNG.range(30, 120);
      const ang = AB.RNG.range(0, Math.PI * 2);
      piece.vx = Math.cos(ang) * speed;
      piece.vy = Math.sin(ang) * speed - 60;
      world.add(piece);
    }
  }

  // Clear: all pigs removed. Fail: birds exhausted and the last one has
  // come to rest (session.activeBird == null is maintained by main.js).
  function checkOutcome(session) {
    if (session.outcome) return session.outcome;
    if (session.pigsRemaining <= 0) {
      session.outcome = 'clear';
      return session.outcome;
    }
    if (session.birdsRemaining <= 0 && session.activeBird == null) {
      session.outcome = 'fail';
      return session.outcome;
    }
    return null;
  }

  return { processCollisions: processCollisions, checkOutcome: checkOutcome, BREAK_IMPULSE: BREAK_IMPULSE };
})();
