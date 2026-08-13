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
  progress: { unlocked: 1, best: {} },
  trajectoryPoints: []
};

const MEM = { data: null };

function init() {
  if (typeof Matter === 'undefined') return;

  GAME.engine = createEngine();
  bindCollisions(GAME.engine);
  GAME.progress = loadProgress();

  buildStageGrid();

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  document.getElementById('btn-play').addEventListener('click', () => {
    const idx = Math.min(GAME.progress.unlocked - 1, STAGES.length - 1);
    startStage(idx);
  });

  document.getElementById('btn-pause').addEventListener('click', pauseGame);
  document.getElementById('btn-resume').addEventListener('click', resumeGame);
  document.getElementById('btn-restart').addEventListener('click', restartStage);
  document.getElementById('btn-menu').addEventListener('click', goMenu);
  document.getElementById('btn-next').addEventListener('click', () => {
    if (GAME.stageIndex + 1 < STAGES.length) {
      startStage(GAME.stageIndex + 1);
    }
  });
  document.getElementById('btn-clear-retry').addEventListener('click', restartStage);
  document.getElementById('btn-clear-menu').addEventListener('click', goMenu);
  document.getElementById('btn-fail-retry').addEventListener('click', restartStage);
  document.getElementById('btn-fail-menu').addEventListener('click', goMenu);

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

function startStage(index) {
  hideOverlays();
  GAME.stageIndex = index;
  const stage = STAGES[index];
  const result = buildStage(GAME.engine, stage);
  GAME.blocks = result.blocks;
  GAME.pigs = result.pigs;
  GAME.pigsLeft = GAME.pigs.length;
  GAME.birdsLeft = stage.birds;
  GAME.score = 0;
  GAME.bird = spawnBirdAtSling(GAME.engine);
  GAME.phase = 'AIM';
  GAME.state = 'PLAYING';
  GAME.settleFrames = 0;
  GAME.flightFrames = 0;
  GAME.dragging = false;
  GAME.dragPoint = { x: SLING.x, y: SLING.y };
}

function restartStage() {
  startStage(GAME.stageIndex);
}

function goMenu() {
  Composite.clear(GAME.engine.world, false);
  GAME.state = 'MENU';
  hideOverlays();
  showOverlay('overlay-menu');
}

function pauseGame() {
  if (GAME.state === 'PLAYING') {
    GAME.state = 'PAUSED';
    showOverlay('overlay-pause');
  }
}

function resumeGame() {
  if (GAME.state === 'PAUSED') {
    GAME.state = 'PLAYING';
    hideOverlays();
  }
}

function finishStage(cleared) {
  GAME.state = cleared ? 'CLEAR' : 'FAIL';
  const stage = STAGES[GAME.stageIndex];
  const bestKey = 'stage_' + stage.id;
  const bestScore = GAME.progress.best[bestKey] || 0;
  const finalScore = GAME.score + GAME.birdsLeft * SCORE.birdLeft;
  const stars = starsFor(stage, finalScore);

  if (cleared) {
    if (finalScore > bestScore) {
      GAME.progress.best[bestKey] = finalScore;
    }
    if (GAME.stageIndex + 1 < STAGES.length) {
      GAME.progress.unlocked = Math.max(GAME.progress.unlocked, GAME.stageIndex + 2);
    }
    saveProgress(GAME.progress);
    buildStageGrid();
    showOverlay('overlay-clear');
    document.getElementById('clear-stars').textContent = '★'.repeat(stars);
    document.getElementById('clear-score').textContent = 'Score: ' + finalScore + ' (Best: ' + bestScore + ')';
    playSfx('clear');
  } else {
    showOverlay('overlay-fail');
    document.getElementById('fail-msg').textContent = 'Remaining pigs: ' + GAME.pigsLeft;
    playSfx('fail');
  }
}

function checkOutcome() {
  if (GAME.phase !== 'FLYING') return;
  if (GAME.pigsLeft === 0) {
    GAME.clearDelay++;
    if (GAME.clearDelay > 30) finishStage(true);
    return;
  }
  if (worldSettled()) {
    finishStage(false);
  }
}

function updateShotPhase() {
  if (GAME.phase !== 'FLYING') return;
  GAME.flightFrames++;
  if (GAME.flightFrames > FLIGHT_MAX_FRAMES) {
    resolveShot();
  }
  const v = Math.hypot(GAME.bird.velocity.x, GAME.bird.velocity.y);
  if (v < SETTLE_SPEED) {
    GAME.settleFrames++;
    if (GAME.settleFrames > SETTLE_FRAMES) {
      resolveShot();
    }
  } else {
    GAME.settleFrames = 0;
  }
  if (GAME.bird.position.y > GROUND_Y + 200) {
    resolveShot();
  }
}

function worldSettled() {
  const bodies = GAME.blocks.concat(GAME.pigs);
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b.destroyed) continue;
    const v = Math.hypot(b.velocity.x, b.velocity.y);
    if (v >= SETTLE_SPEED) return false;
  }
  return true;
}

function resolveShot() {
  GAME.phase = 'AIM';
  GAME.flightFrames = 0;
  GAME.settleFrames = 0;
  if (GAME.birdsLeft > 0) {
    GAME.bird = spawnBirdAtSling(GAME.engine);
    GAME.birdsLeft--;
  } else {
    GAME.bird = null;
  }
}

function sweepDestroyed() {
  for (let i = GAME.blocks.length - 1; i >= 0; i--) {
    const b = GAME.blocks[i];
    if (b.destroyed) {
      removeBody(GAME.engine, b);
      GAME.blocks.splice(i, 1);
      GAME.score += SCORE.block;
      spawnDebris(b.position.x, b.position.y, b.color, 12);
    }
  }
  for (let i = GAME.pigs.length - 1; i >= 0; i--) {
    const p = GAME.pigs[i];
    if (p.destroyed) {
      removeBody(GAME.engine, p);
      GAME.pigs.splice(i, 1);
      GAME.score += SCORE.pig;
      spawnDebris(p.position.x, p.position.y, '#90EE90', 14);
      playSfx('pig');
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
  if (d > SLING.maxPull) { dx = dx * SLING.maxPull / d; dy = dy * SLING.maxPull / d; }
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
    vy += G_STEP; x += vx; y += vy;
    if (i % 4 === 3) pts.push({ x: x, y: y });
    if (y > GROUND_Y) break;
  }
  return pts;
}

function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (W / r.width),
           y: (e.clientY - r.top) * (H / r.height) };
}

function onPointerDown(e) {
  if (GAME.state !== 'PLAYING' || GAME.phase !== 'AIM' || !GAME.bird) return;
  GAME.dragging = true;
  const p = canvasPoint(e);
  GAME.dragPoint = p;
  GAME.trajectoryPoints = trajectoryPoints(p);
}

function onPointerMove(e) {
  if (!GAME.dragging || GAME.state !== 'PLAYING') return;
  const p = canvasPoint(e);
  GAME.dragPoint = p;
  GAME.trajectoryPoints = trajectoryPoints(p);
}

function onPointerUp(e) {
  if (!GAME.dragging) return;
  GAME.dragging = false;
  if (GAME.state === 'PLAYING' && GAME.phase === 'AIM' && GAME.bird) {
    launchBird();
  }
}

function syncHud() {
  document.getElementById('hud-stage').textContent = 'STAGE ' + (GAME.stageIndex + 1);
  document.getElementById('hud-score').textContent = GAME.score;
  document.getElementById('hud-birds').textContent = 'BIRDS ' + GAME.birdsLeft;
}

function showOverlay(id) {
  document.querySelectorAll('.overlay').forEach(e => e.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

function hideOverlays() {
  document.querySelectorAll('.overlay').forEach(e => e.classList.add('hidden'));
}

function buildStageGrid() {
  const grid = document.getElementById('stage-grid');
  grid.innerHTML = '';
  for (let i = 0; i < STAGES.length; i++) {
    const stage = STAGES[i];
    const btn = document.createElement('button');
    btn.type = 'button';
    const bestKey = 'stage_' + stage.id;
    const best = GAME.progress.best[bestKey] || 0;
    const stars = best > 0 ? starsFor(stage, best) : 0;
    btn.textContent = (i + 1) + '\n' + '★'.repeat(stars);
    btn.style.whiteSpace = 'pre-wrap';
    if (i >= GAME.progress.unlocked) btn.disabled = true;
    btn.addEventListener('click', () => startStage(i));
    grid.appendChild(btn);
  }
}

function starsFor(stage, score) {
  if (score >= stage.star3) return 3;
  if (score >= stage.star2) return 2;
  if (score > 0) return 1;
  return 0;
}

function loadProgress() {
  try {
    const raw = localStorage.getItem('ab.progress.v1');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return MEM.data || { unlocked: 1, best: {} };
}

function saveProgress(progress) {
  MEM.data = progress;
  try { localStorage.setItem('ab.progress.v1', JSON.stringify(progress)); } catch (e) {}
}

let audioContext = null;

function playSfx(kind) {
  try {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);

    let freq, duration;
    if (kind === 'launch') { freq = 200; duration = 0.1; }
    else if (kind === 'hit') { freq = 600; duration = 0.05; }
    else if (kind === 'pig') { freq = 800; duration = 0.1; }
    else if (kind === 'clear') { freq = 1200; duration = 0.2; }
    else if (kind === 'fail') { freq = 300; duration = 0.2; }

    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    osc.start(now);
    osc.stop(now + duration);
  } catch (e) {}
}

function spawnDebris(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 5;
    GAME.particles.push({
      x: x, y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 2 + Math.random() * 3,
      color: color,
      life: 20
    });
  }
}

function updateParticles() {
  for (let i = GAME.particles.length - 1; i >= 0; i--) {
    const p = GAME.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.3;
    p.life--;
    if (p.life <= 0) GAME.particles.splice(i, 1);
  }
}

// DONE-CHECK
// hop 1: game.js:buildStageGrid
// hop 2: game.js:startStage
// hop 3: game.js:loop
// hop 4: game.js:launchBird
// hop 5: game.js:finishStage
// V 1: buildStage
// V 2: buildStageGrid
// V 3: loop
// V 4: saveProgress
// V 5: onPointerDown
// V 6: trajectoryPoints
// V 7: launchBird
// V 8: resolveShot
// V 9: loop
// V 10: damageBody
// V 11: updateShotPhase
// V 12: sweepDestroyed
// V 13: checkOutcome
// V 14: checkOutcome
// V 15: pauseGame
// V 16: pauseGame
// V 17: restartStage
// V 18: goMenu
// V 19: sweepDestroyed
// V 20: starsFor
// V 21: finishStage
// V 22: drawBackground
// V 23: spawnDebris
// V 24: playSfx
// V 25: drawLoadError

window.addEventListener('load', init);
