/**
 * Collision -> destruction -> score (plan Step 3).
 *
 * Rule: on collisionStart, compute the relative impact speed between
 * the two bodies and convert it to damage via a reduced-mass formula
 * (physically: how much of the impact energy each body actually
 * absorbs). Any destructible body (block/pig) whose hp drops to zero
 * is removed and reported through the onBlockDestroyed/onPigDestroyed
 * callbacks so the match/score layer can react.
 *
 * Only collisionStart is used (not collisionActive), so resting
 * contact never keeps draining hp — only the moment of impact does.
 */
window.Collision = (function () {
  const DAMAGE_SCALE = 0.8;
  const MIN_IMPACT_SPEED = 2;
  const STATIC_MASS_OVERRIDE = 1e7; // treat ground/immovable bodies as effectively infinite mass

  let listeners = null;

  function reducedMass(a, b) {
    const ma = a.isStatic ? STATIC_MASS_OVERRIDE : a.mass;
    const mb = b.isStatic ? STATIC_MASS_OVERRIDE : b.mass;
    return (ma * mb) / (ma + mb);
  }

  function destroy(body) {
    if (!body.plugin || body.plugin.destroyed) return;
    body.plugin.destroyed = true;
    if (body.plugin.kind === 'pig' && listeners && listeners.onPigDestroyed) {
      listeners.onPigDestroyed(body);
    } else if (body.plugin.kind === 'block' && listeners && listeners.onBlockDestroyed) {
      listeners.onBlockDestroyed(body);
    }
    window.Physics.removeBody(body);
  }

  function onCollisionStart(event) {
    for (const pair of event.pairs) {
      const { bodyA, bodyB } = pair;
      if (!bodyA.plugin && !bodyB.plugin) continue;

      const rel = Matter.Vector.magnitude(Matter.Vector.sub(bodyA.velocity, bodyB.velocity));
      if (rel < MIN_IMPACT_SPEED) continue;

      const impact = rel * reducedMass(bodyA, bodyB) * DAMAGE_SCALE;

      [bodyA, bodyB].forEach((body) => {
        if (body.plugin && !body.plugin.destroyed && body.plugin.kind !== 'bird') {
          body.plugin.hp -= impact;
          if (body.plugin.hp <= 0) destroy(body);
        }
      });
    }
  }

  /** Call once at bootstrap. `cb` = { onPigDestroyed(body), onBlockDestroyed(body) }. */
  function init(engine, cb) {
    listeners = cb;
    Matter.Events.on(engine, 'collisionStart', onCollisionStart);
  }

  return { init };
})();
