/**
 * Bootstrap + main loop.
 *
 * Anchor A1×A3: physics is stepped with a FIXED delta inside an
 * accumulator, decoupled from the render frame rate. Matter.Runner is
 * never used — every Physics.step() call advances by exactly
 * Physics.FIXED_DT, so identical input at identical step-offsets
 * reproduces identical outcomes.
 */
(function () {
  const canvas = document.getElementById('game-canvas');

  window.Physics.init();
  window.Render.init(canvas);
  window.Slingshot.init(canvas, (vx, vy) => window.State.launchCurrentBird(vx, vy));
  window.State.init();

  let lastTime = performance.now();
  let accumulator = 0;
  const FIXED_DT = window.Physics.FIXED_DT;
  const MAX_ACCUMULATED = FIXED_DT * 5; // avoid a spiral of death after tab is backgrounded

  function loop(now) {
    requestAnimationFrame(loop);
    let delta = now - lastTime;
    lastTime = now;
    if (delta > 250) delta = 250;
    accumulator += delta;
    if (accumulator > MAX_ACCUMULATED) accumulator = MAX_ACCUMULATED;

    while (accumulator >= FIXED_DT) {
      if (window.State.isRunning()) {
        window.Physics.step();
        window.State.tickMatch();
      }
      accumulator -= FIXED_DT;
    }

    window.Render.frame();
  }
  requestAnimationFrame(loop);

  // ---- debug hooks (used by automated play-checks; harmless in normal play) ----
  window.__launch = function (angleDeg, power) {
    if (!window.State.isAiming()) return false;
    const rad = (angleDeg * Math.PI) / 180;
    const pull = Math.max(0, Math.min(1, power)) * window.Slingshot.MAX_PULL;
    const vx = pull * Math.cos(rad) * window.Slingshot.POWER_MULT;
    const vy = -pull * Math.sin(rad) * window.Slingshot.POWER_MULT;
    window.State.launchCurrentBird(vx, vy);
    return true;
  };
  window.__goStage = function (n) {
    window.State.debugGoStage(n);
  };
})();
