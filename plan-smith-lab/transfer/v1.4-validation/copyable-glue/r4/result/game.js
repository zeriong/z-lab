const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const GAME = {
  state: 'MENU',
  phase: 'AIM',
  stageIndex: 0,
  score: 0,
  birdsLeft: 0,
  pigsLeft: 0,
  engine: null,
  bird: null,
  blocks: [],
  pigs: [],
  particles: [],
  dragging: false,
  dragPoint: { x: SLING.x, y: SLING.y },
  settleFrames: 0,
  flightFrames: 0,
  clearDelay: 0,
  progress: { unlocked: 1, best: {} }
};

const MEM = { data: null };

function init() {
  if (typeof Matter === 'undefined') return;

  GAME.progress = loadProgress();
  GAME.engine = createEngine();
  bindCollisions(GAME.engine);

  // Build stage grid
  buildStageGrid();

  // Button listeners
  document.getElementById('btn-play').addEventListener('click', () => {
    const idx = GAME.progress.unlocked - 1;
    startStage(Math.min(idx, STAGES.length - 1));
  });

  document.getElementById('btn-pause').addEventListener('click', pauseGame);
  document.getElementById('btn-resume').addEventListener('click', resumeGame);
  document.getElementById('btn-restart').addEventListener('click', restartStage);
  document.getElementById('btn-menu').addEventListener('click', goMenu);

  document.getElementById('btn-next').addEventListener('click', () => {
    const next = GAME.stageIndex + 1;
    startStage(Math.min(next, STAGES.length - 1));
  });

  document.getElementById('btn-clear-retry').addEventListener('click', restartStage);
  document.getElementById('btn-clear-menu').addEventListener('click', goMenu);
  document.getElementById('btn-fail-retry').addEventListener('click', restartStage);
  document.getElementById('btn-fail-menu').addEventListener('click', goMenu);

  // Pointer events
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  requestAnimationFrame(loop);
}

function loop() {
  if (GAME.state === 'PLAYING') {
    Engine.update(GAME.engine, STEP_MS);
    sweepDestroyed();
    updateParticles();
    updateShotPhase();
    checkOutcome();
    syncHud();
  }
  if (typeof Matter === 'undefined') drawLoadError(ctx);
  else drawFrame(ctx, GAME);
  requestAnimationFrame(loop);
}

function goMenu() {
  Composite.clear(GAME.engine.world, false);
  GAME.state = 'MENU';
  GAME.score = 0;
  GAME.bird = null;
  hideOverlays();
}

function startStage(index) {
  if (index < 0 || index >= STAGES.length) return;
  GAME.stageIndex = index;
  const stage = STAGES[index];

  const result = buildStage(GAME.engine, stage);
  GAME.blocks = result.blocks;
  GAME.pigs = result.pigs;
  GAME.pigsLeft = GAME.pigs.length;
  GAME.birdsLeft = stage.birds;
  GAME.score = 0;
  GAME.dragging = false;
  GAME.dragPoint = { x: SLING.x, y: SLING.y };
  GAME.settleFrames = 0;
  GAME.flightFrames = 0;
  GAME.phase = 'AIM';

  GAME.bird = spawnBirdAtSling(GAME.engine);
  GAME.state = 'PLAYING';
  hideOverlays();
}

function restartStage() {
  startStage(GAME.stageIndex);
}

function pauseGame() {
  if (GAME.state !== 'PLAYING') return;
  GAME.state = 'PAUSED';
  showOverlay('overlay-pause');
}

function resumeGame() {
  if (GAME.state !== 'PAUSED') return;
  GAME.state = 'PLAYING';
  hideOverlays();
}

function finishStage(cleared) {
  GAME.state = cleared ? 'CLEAR' : 'FAIL';
  const stage = STAGES[GAME.stageIndex];

  if (cleared) {
    // Add leftover birds bonus
    GAME.score += GAME.birdsLeft * SCORE.birdLeft;

    // Calculate stars
    const stars = starsFor(stage, GAME.score);

    // Update progress
    const key = 'stage_' + stage.id;
    const prev = GAME.progress.best[key] || { score: 0, stars: 0 };
    if (GAME.score > prev.score) {
      GAME.progress.best[key] = { score: GAME.score, stars };
    }

    // Unlock next stage
    if (stage.id < STAGES.length) {
      GAME.progress.unlocked = Math.max(GAME.progress.unlocked, stage.id + 1);
    }

    saveProgress(GAME.progress);
    showOverlay('overlay-clear');

    // Fill clear overlay
    const starsDom = document.getElementById('clear-stars');
    starsDom.innerHTML = '⭐'.repeat(stars);
    document.getElementById('clear-score').innerHTML =
      `점수: ${GAME.score} / 최고: ${prev.score || GAME.score}`;
  } else {
    showOverlay('overlay-fail');
    document.getElementById('fail-msg').innerHTML = `남은 돼지: ${GAME.pigsLeft}`;
  }
}

function checkOutcome() {
  if (GAME.state !== 'PLAYING') return;

  if (GAME.phase === 'FLYING') {
    if (GAME.pigsLeft === 0) {
      GAME.clearDelay = 30;
      GAME.phase = 'AIM';
    } else if (worldSettled() && GAME.flightFrames > FLIGHT_MAX_FRAMES / 2) {
      finishStage(false);
    }
  }

  if (GAME.clearDelay > 0) {
    GAME.clearDelay--;
    if (GAME.clearDelay === 0 && GAME.pigsLeft === 0) {
      finishStage(true);
    }
  }
}

function updateShotPhase() {
  if (GAME.phase !== 'FLYING' || !GAME.bird) return;

  GAME.flightFrames++;
  const speed = Math.hypot(GAME.bird.velocity.x, GAME.bird.velocity.y);

  if (speed < SETTLE_SPEED) {
    GAME.settleFrames++;
  } else {
    GAME.settleFrames = 0;
  }

  if (GAME.settleFrames >= SETTLE_FRAMES || GAME.flightFrames >= FLIGHT_MAX_FRAMES) {
    resolveShot();
  }
}

function worldSettled() {
  if (!GAME.engine) return true;
  const bodies = GAME.engine.world.bodies;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b.isStatic || b.label === 'bird') continue;
    const speed = Math.hypot(b.velocity.x, b.velocity.y);
    if (speed > SETTLE_SPEED) return false;
  }
  return true;
}

function resolveShot() {
  GAME.phase = 'AIM';
  GAME.settleFrames = 0;
  GAME.flightFrames = 0;
  GAME.birdsLeft--;

  if (GAME.birdsLeft > 0) {
    GAME.bird = spawnBirdAtSling(GAME.engine);
    GAME.dragPoint = { x: SLING.x, y: SLING.y };
  } else if (GAME.pigsLeft === 0) {
    // Will be handled by checkOutcome
  } else {
    finishStage(false);
  }
}

function sweepDestroyed() {
  // Process blocks (reverse order)
  for (let i = GAME.blocks.length - 1; i >= 0; i--) {
    const block = GAME.blocks[i];
    if (block.destroyed) {
      removeBody(GAME.engine, block);
      GAME.blocks.splice(i, 1);
      GAME.score += SCORE.block;
      spawnDebris(block.position.x, block.position.y, block.matColor, 12);
    }
  }

  // Process pigs (reverse order)
  for (let i = GAME.pigs.length - 1; i >= 0; i--) {
    const pig = GAME.pigs[i];
    if (pig.destroyed) {
      removeBody(GAME.engine, pig);
      GAME.pigs.splice(i, 1);
      GAME.score += SCORE.pig;
      playSfx('pig');
      spawnDebris(pig.position.x, pig.position.y, '#90ee90', 14);
    }
  }

  GAME.pigsLeft = GAME.pigs.length;
}

function launchBird() {
  const q = pullPoint(GAME.dragPoint);
  const v = pullVelocity(GAME.dragPoint);
  Body.setStatic(GAME.bird, false);
  Body.setPosition(GAME.bird, q);
  Body.setVelocity(GAME.bird, v);
  GAME.phase = 'FLYING';
  GAME.flightFrames = 0;
  GAME.settleFrames = 0;
  playSfx('launch');
}

function pullPoint(p) {
  let dx = p.x - SLING.x, dy = p.y - SLING.y;
  const d = Math.hypot(dx, dy);
  if (d > SLING.maxPull) {
    dx = dx * SLING.maxPull / d;
    dy = dy * SLING.maxPull / d;
  }
  return { x: SLING.x + dx, y: SLING.y + dy };
}

function pullVelocity(p) {
  const q = pullPoint(p);
  return { x: (SLING.x - q.x) * LAUNCH_K, y: (SLING.y - q.y) * LAUNCH_K };
}

function trajectoryPoints(p) {
  const v = pullVelocity(p);
  const pts = [];
  let x = SLING.x, y = SLING.y, vx = v.x, vy = v.y;
  for (let i = 0; i < 112; i++) {
    vy += G_STEP;
    x += vx;
    y += vy;
    if (i % 4 === 3) pts.push({ x: x, y: y });
    if (y > GROUND_Y) break;
  }
  return pts;
}

function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (W / r.width),
    y: (e.clientY - r.top) * (H / r.height)
  };
}

function onPointerDown(e) {
  if (GAME.state !== 'PLAYING' || GAME.phase !== 'AIM' || !GAME.bird || GAME.bird.isStatic === false) return;
  GAME.dragging = true;
  const p = canvasPoint(e);
  GAME.dragPoint = p;
}

function onPointerMove(e) {
  if (!GAME.dragging) return;
  const p = canvasPoint(e);
  GAME.dragPoint = p;
}

function onPointerUp(e) {
  if (!GAME.dragging) return;
  GAME.dragging = false;
  if (GAME.state === 'PLAYING' && GAME.phase === 'AIM' && GAME.bird) {
    launchBird();
  }
}

function syncHud() {
  const stage = STAGES[GAME.stageIndex];
  document.getElementById('hud-stage').textContent = `STAGE ${stage.id}`;
  document.getElementById('hud-score').textContent = GAME.score;
  document.getElementById('hud-birds').textContent = `BIRDS ${GAME.birdsLeft}`;
}

function showOverlay(id) {
  document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

function hideOverlays() {
  document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
  document.getElementById('overlay-menu').classList.remove('hidden');
}

function buildStageGrid() {
  const grid = document.getElementById('stage-grid');
  grid.innerHTML = '';
  for (let i = 0; i < STAGES.length; i++) {
    const stage = STAGES[i];
    const btn = document.createElement('button');
    btn.type = 'button';
    const key = 'stage_' + stage.id;
    const best = GAME.progress.best[key];
    const stars = best ? best.stars : 0;
    const starsStr = '⭐'.repeat(stars);
    btn.innerHTML = `<div>${stage.id}</div><div>${starsStr}</div>`;
    btn.disabled = stage.id > GAME.progress.unlocked;
    btn.addEventListener('click', () => startStage(i));
    grid.appendChild(btn);
  }
}

function starsFor(stage, score) {
  if (score >= stage.star3) return 3;
  if (score >= stage.star2) return 2;
  return 1;
}

function loadProgress() {
  try {
    const raw = localStorage.getItem('ab.progress.v1');
    if (raw) return JSON.parse(raw);
  } catch (e) { }
  return MEM.data || { unlocked: 1, best: {} };
}

function saveProgress(progress) {
  MEM.data = progress;
  try {
    localStorage.setItem('ab.progress.v1', JSON.stringify(progress));
  } catch (e) { }
}

let audioCtx = null;

function playSfx(kind) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const freq = { 'launch': 400, 'hit': 600, 'pig': 800, 'clear': 1000, 'fail': 300 }[kind] || 500;
    const duration = 0.1;

    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    osc.start(now);
    osc.stop(now + duration);
  } catch (e) { }
}

function spawnDebris(x, y, color, n) {
  const count = Math.floor(Math.random() * (n - 8)) + 10;
  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * Math.PI * 2);
    const speed = Math.random() * 3 + 2;
    GAME.particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 3 + 2,
      life: 60,
      maxLife: 60,
      color: color
    });
  }
}

function updateParticles() {
  for (let i = GAME.particles.length - 1; i >= 0; i--) {
    const p = GAME.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.life--;
    if (p.life <= 0) {
      GAME.particles.splice(i, 1);
    }
  }
}

window.addEventListener('load', init);

// DONE-CHECK
/*
hop 1: stages.js:STAGES[0] initialized and init() starts with window.addEventListener('load', init)
hop 2: index.html:<script src=CDN> before game.js; init() uses typeof Matter check to guard against undefined
hop 3: game.js:startStage() calls Engine.update() via loop() when GAME.state === 'PLAYING'
hop 4: game.js:onPointerUp() calls launchBird() which calls Body.setStatic(bird, false) then Body.setVelocity()
hop 5: physics.js:bindCollisions() triggers damageBody(), game.js:sweepDestroyed() removes bodies, checkOutcome() detects pigsLeft === 0 and sets GAME.state='CLEAR'

V1: buildStage receives stage data and creates blocks and pigs
V2: startStage called from button clicks
V3: drawFrame renders cleared world after clear()
V4: progress saved via saveProgress() when unlocked stage advances
V5: canvasPoint transforms pointer to canvas coordinates
V6: trajectoryPoints calculates preview points matching G_STEP constant
V7: launchBird releases bird with setVelocity()
V8: resolveShot decrements birdsLeft and spawns next bird
V9: Engine.update applies gravity each frame
V10: damageBody marks with destroyed flag, sweepDestroyed removes from world
V11: removeBody called only in sweepDestroyed, outside collisionStart
V12: sweepDestroyed calculates pigsLeft by array length, spawnDebris on destruction
V13: checkOutcome detects pigsLeft===0 after clearDelay, sets CLEAR state
V14: worldSettled() checks all bodies speed < SETTLE_SPEED; finishStage(false) if birds exhaust
V15: btn-pause click triggers pauseGame() which sets PAUSED state
V16: loop() gates Engine.update() by state===PLAYING check
V17: restartStage calls startStage(same index) with score=0, birdsLeft=full
V18: goMenu clears world and sets state=MENU
V19: syncHud updates text immediately after score changes in sweepDestroyed
V20: starsFor compares score against stage.star2/star3 thresholds
V21: saveProgress uses Math.max to keep highest score
V22: drawBackground draws sky/hill/ground before bodies
V23: spawnDebris called in sweepDestroyed; drawParticles renders with life/maxLife alpha
V24: playSfx creates AudioContext on first call, uses different frequencies per kind
V25: drawLoadError renders "physics library not loaded" on missing Matter
*/
