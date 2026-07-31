var AB = window.AB || (window.AB = {});

// Step 2 -- drag input, launch-vector mapping, trajectory prediction, and
// the drag-cancel rule.
AB.Slingshot = (function () {
  // Declared-arbitrary tuning constants (Step 7: pending first playtest
  // measurement). Chosen so max-pull-at-45-degrees range (v^2/g) lands
  // structures placed 400-550px from the anchor within reach.
  const MAX_PULL = 90; // px
  const LAUNCH_SCALE = 7.8; // px/s of launch speed per px of pull
  const CANCEL_DEADZONE = 10; // px -- release inside this radius cancels the shot
  const GRAB_RADIUS = 60; // px -- pointer must start within this of the anchor
  const PREDICT_STEPS = 60;
  const PREDICT_DT = 1 / 120; // same dt as the sim's fixed step (Step 2 requirement)

  let canvas = null;
  let anchor = { x: 0, y: 0 };
  let gravity = 900;
  let onLaunch = null;

  let ready = false; // a bird is parked on the sling, awaiting aim
  let dragging = false;
  let dragCurrent = null;
  let birdRadius = 14;

  function init(canvasEl, config, onLaunchCb) {
    canvas = canvasEl;
    anchor = config.slingAnchor;
    gravity = config.gravity;
    onLaunch = onLaunchCb;

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
  }

  function setReady(isReady, radius) {
    ready = isReady;
    if (radius) birdRadius = radius;
    if (!isReady) { dragging = false; dragCurrent = null; }
  }

  function toLocal(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function withinGrab(p) {
    return Math.hypot(p.x - anchor.x, p.y - anchor.y) < GRAB_RADIUS;
  }

  function onDown(e) {
    if (!ready) return;
    const p = toLocal(e.clientX, e.clientY);
    if (!withinGrab(p)) return;
    dragging = true;
    dragCurrent = p;
  }

  function onMove(e) {
    if (!dragging) return;
    dragCurrent = toLocal(e.clientX, e.clientY);
  }

  function computeLaunch() {
    const dx = dragCurrent.x - anchor.x, dy = dragCurrent.y - anchor.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const clamped = Math.min(dist, MAX_PULL);
    const nx = dx / dist, ny = dy / dist;
    return { vx: -nx * clamped * LAUNCH_SCALE, vy: -ny * clamped * LAUNCH_SCALE, dist: dist };
  }

  function onUp() {
    if (!dragging) return;
    dragging = false;
    const launch = computeLaunch();
    dragCurrent = null;
    if (launch.dist < CANCEL_DEADZONE) return; // drag-cancel rule
    ready = false;
    if (onLaunch) onLaunch(launch.vx, launch.vy);
  }

  function onTouchStart(e) { if (e.touches.length) { e.preventDefault(); onDown(e.touches[0]); } }
  function onTouchMove(e) { if (e.touches.length) { e.preventDefault(); onMove(e.touches[0]); } }
  function onTouchEnd() { onUp(); }

  function getPullPos() {
    if (!dragging || !dragCurrent) return { x: anchor.x, y: anchor.y };
    const dx = dragCurrent.x - anchor.x, dy = dragCurrent.y - anchor.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const clamped = Math.min(dist, MAX_PULL);
    return { x: anchor.x + (dx / dist) * clamped, y: anchor.y + (dy / dist) * clamped };
  }

  // Simulated with the same integrator (semi-implicit Euler, same dt and
  // gravity) as the physics world, but without collisions -- the gap between
  // this line and the actual impact point is exactly the plan's named proxy
  // metric for "손맛" (Step 7 playtest checklist), not something this
  // function is expected to eliminate.
  function predict(pos, vx, vy) {
    const pts = [];
    let x = pos.x, y = pos.y, sx = vx, sy = vy;
    for (let i = 0; i < PREDICT_STEPS; i++) {
      sy += gravity * PREDICT_DT;
      x += sx * PREDICT_DT;
      y += sy * PREDICT_DT;
      if (i % 2 === 0) pts.push({ x: x, y: y });
      if (y > AB.CONFIG.height) break;
    }
    return pts;
  }

  function getAimState() {
    const pos = ready ? getPullPos() : null;
    let prediction = null;
    if (dragging && dragCurrent) {
      const launch = computeLaunch();
      prediction = predict(pos, launch.vx, launch.vy);
    }
    return { birdPos: pos, birdRadius: birdRadius, dragging: dragging, prediction: prediction };
  }

  return { init: init, setReady: setReady, getAimState: getAimState };
})();
