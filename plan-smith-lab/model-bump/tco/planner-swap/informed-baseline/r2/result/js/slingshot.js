window.AB = window.AB || {};

(function() {
  'use strict';

  let dragging = false;
  let dragX = AB.CONFIG.SLING_X;
  let dragY = AB.CONFIG.SLING_Y;

  function reset() {
    dragging = false;
    dragX = AB.CONFIG.SLING_X;
    dragY = AB.CONFIG.SLING_Y;
  }

  function cancel() {
    reset();
  }

  function beginDrag(x, y, radius) {
    const dx = x - AB.CONFIG.SLING_X;
    const dy = y - AB.CONFIG.SLING_Y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= AB.CONFIG.SLING_GRAB_RADIUS) {
      dragging = true;
      updateDrag(x, y, radius);
      return true;
    }
    return false;
  }

  function updateDrag(x, y, radius) {
    if (!dragging) return;

    let dx = x - AB.CONFIG.SLING_X;
    let dy = y - AB.CONFIG.SLING_Y;
    let len = Math.sqrt(dx * dx + dy * dy);

    if (len > AB.CONFIG.SLING_MAX_PULL) {
      const factor = AB.CONFIG.SLING_MAX_PULL / len;
      dx *= factor;
      dy *= factor;
    }

    dragX = AB.CONFIG.SLING_X + dx;
    dragY = Math.min(AB.CONFIG.SLING_Y + dy, AB.CONFIG.GROUND_Y - radius - 2);
  }

  function getPull() {
    const px = AB.CONFIG.SLING_X - dragX;
    const py = AB.CONFIG.SLING_Y - dragY;
    const len = Math.sqrt(px * px + py * py);
    return { px, py, len };
  }

  function getLaunchVelocity() {
    const pull = getPull();
    return {
      vx: pull.px * AB.CONFIG.LAUNCH_SCALE,
      vy: pull.py * AB.CONFIG.LAUNCH_SCALE
    };
  }

  function release() {
    if (!dragging) return null;

    const pull = getPull();
    if (pull.len < AB.CONFIG.SLING_MIN_PULL) {
      reset();
      return null;
    }

    const vel = getLaunchVelocity();
    const result = {
      x: dragX,
      y: dragY,
      vx: vel.vx,
      vy: vel.vy
    };

    reset();
    return result;
  }

  function getBirdPos() {
    return { x: dragX, y: dragY };
  }

  function predict() {
    if (!dragging) return [];

    const pull = getPull();
    if (pull.len < AB.CONFIG.SLING_MIN_PULL) {
      return [];
    }

    const vel = getLaunchVelocity();
    const points = [];

    for (let k = 1; k <= AB.CONFIG.TRAJ_DOT_COUNT; k++) {
      const t = k * AB.CONFIG.TRAJ_DOT_INTERVAL;
      const px = dragX + vel.vx * t;
      const py = dragY + vel.vy * t + 0.5 * AB.CONFIG.GRAVITY * t * t;

      if (py > AB.CONFIG.GROUND_Y || px > AB.CONFIG.WORLD_W) {
        break;
      }

      points.push({ x: px, y: py });
    }

    return points;
  }

  AB.Slingshot = {
    get dragging() { return dragging; },
    get dragX() { return dragX; },
    get dragY() { return dragY; },
    reset,
    cancel,
    beginDrag,
    updateDrag,
    getPull,
    getLaunchVelocity,
    release,
    getBirdPos,
    predict
  };
})();
