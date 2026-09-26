window.AB = window.AB || {};

(function() {
  'use strict';

  const C = AB.CONFIG;

  let dragging = false;
  let dragX = C.SLING_X;
  let dragY = C.SLING_Y;

  function reset() {
    dragging = false;
    dragX = C.SLING_X;
    dragY = C.SLING_Y;
  }

  function cancel() {
    reset();
  }

  function beginDrag(x, y, radius) {
    const dist = Math.sqrt((x - C.SLING_X) * (x - C.SLING_X) + (y - C.SLING_Y) * (y - C.SLING_Y));
    if (dist <= C.SLING_GRAB_RADIUS) {
      dragging = true;
      updateDrag(x, y, radius);
      return true;
    }
    return false;
  }

  function updateDrag(x, y, radius) {
    if (!dragging) return;

    let dx = x - C.SLING_X;
    let dy = y - C.SLING_Y;
    let len = Math.sqrt(dx * dx + dy * dy);

    if (len > C.SLING_MAX_PULL) {
      dx *= C.SLING_MAX_PULL / len;
      dy *= C.SLING_MAX_PULL / len;
    }

    dragX = C.SLING_X + dx;
    dragY = Math.min(C.SLING_Y + dy, C.GROUND_Y - radius - 2);
  }

  function getPull() {
    const px = C.SLING_X - dragX;
    const py = C.SLING_Y - dragY;
    const len = Math.sqrt(px * px + py * py);
    return { px: px, py: py, len: len };
  }

  function getLaunchVelocity() {
    const p = getPull();
    return {
      vx: p.px * C.LAUNCH_SCALE,
      vy: p.py * C.LAUNCH_SCALE
    };
  }

  function release() {
    if (!dragging) return null;

    const p = getPull();
    if (p.len < C.SLING_MIN_PULL) {
      reset();
      return null;
    }

    const v = getLaunchVelocity();
    const result = { x: dragX, y: dragY, vx: v.vx, vy: v.vy };
    reset();
    return result;
  }

  function getBirdPos() {
    return { x: dragX, y: dragY };
  }

  function predict() {
    if (!dragging) return [];

    const p = getPull();
    if (p.len < C.SLING_MIN_PULL) return [];

    const v = getLaunchVelocity();
    const result = [];

    for (let k = 1; k <= C.TRAJ_DOT_COUNT; k++) {
      const t = k * C.TRAJ_DOT_INTERVAL;
      const px = dragX + v.vx * t;
      const py = dragY + v.vy * t + 0.5 * C.GRAVITY * t * t;

      if (py > C.GROUND_Y || px > C.WORLD_W) break;

      result.push({ x: px, y: py });
    }

    return result;
  }

  AB.Slingshot = {
    dragging: dragging,
    dragX: dragX,
    dragY: dragY,
    reset: reset,
    cancel: cancel,
    beginDrag: beginDrag,
    updateDrag: updateDrag,
    getPull: getPull,
    getLaunchVelocity: getLaunchVelocity,
    release: release,
    getBirdPos: getBirdPos,
    predict: predict
  };

  Object.defineProperty(AB.Slingshot, 'dragging', {
    get: function() { return dragging; },
    set: function(v) { dragging = v; }
  });

  Object.defineProperty(AB.Slingshot, 'dragX', {
    get: function() { return dragX; },
    set: function(v) { dragX = v; }
  });

  Object.defineProperty(AB.Slingshot, 'dragY', {
    get: function() { return dragY; },
    set: function(v) { dragY = v; }
  });
})();
