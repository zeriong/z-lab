function initInput(canvas) {
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  window.addEventListener('keydown', onKeyDown);
}

function toCanvasXY(e) {
  const rect = G.canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * W / rect.width,
    y: (e.clientY - rect.top) * H / rect.height
  };
}

function updateAim(p) {
  const dx = p.x - SLING_X;
  const dy = p.y - SLING_Y;
  let len = Math.hypot(dx, dy);

  if (len > MAX_PULL) {
    len = MAX_PULL / len;
    G.aim = { x: SLING_X + dx * len, y: SLING_Y + dy * len };
  } else {
    G.aim = { x: SLING_X + dx, y: Math.min(SLING_Y + dy, GROUND_Y - BIRDS[G.birdType].r - 2) };
  }
}

function onPointerDown(e) {
  if (G.screen !== 'playing') return;

  const p = toCanvasXY(e);

  if (G.phase === 'aiming' && Math.hypot(p.x - SLING_X, p.y - SLING_Y) <= GRAB_RADIUS) {
    G.dragging = true;
    G.canvas.setPointerCapture(e.pointerId);
    updateAim(p);
    playSound('stretch');
  } else if (G.phase === 'flying') {
    activateAbility();
  }

  e.preventDefault();
}

function onPointerMove(e) {
  if (G.dragging) {
    updateAim(toCanvasXY(e));
  }
}

function onPointerUp(e) {
  if (!G.dragging) return;

  G.dragging = false;

  const pullLen = Math.hypot(G.aim.x - SLING_X, G.aim.y - SLING_Y);
  if (pullLen >= MIN_PULL && G.screen === 'playing' && G.phase === 'aiming') {
    launchBird();
  } else {
    G.aim = { x: SLING_X, y: SLING_Y };
  }
}

function onPointerCancel(e) {
  G.dragging = false;
  G.aim = { x: SLING_X, y: SLING_Y };
}

function onKeyDown(e) {
  if (e.key === 'Escape') {
    if (G.screen === 'playing') {
      pauseGame();
    } else if (G.screen === 'paused') {
      resumeGame();
    }
  }
}
