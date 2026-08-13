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

function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (W / r.width),
           y: (e.clientY - r.top) * (H / r.height) };
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

function loadProgress() {
  try {
    const raw = localStorage.getItem('ab.progress.v1');
    if (raw) return JSON.parse(raw);
  } catch (e) { }
  return MEM.data || { unlocked: 1, best: {} };
}

function saveProgress(progress) {
  MEM.data = progress;
  try { localStorage.setItem('ab.progress.v1', JSON.stringify(progress)); } catch (e) {}
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

function init() {
  if (typeof Matter === 'undefined') return;

  GAME.progress = loadProgress();
  GAME.engine = createEngine();
  bindCollisions(GAME.engine);

  buildStageGrid();

  document.getElementById('btn-play').addEventListener('click', () => {
    startStage(GAME.progress.unlocked - 1);
  });

  document.getElementById('btn-pause').addEventListener('click', pauseGame);
  document.getElementById('btn-resume').addEventListener('click', resumeGame);
  document.getElementById('btn-restart').addEventListener('click', restartStage);
  document.getElementById('btn-menu').addEventListener('click', goMenu);
  document.getElementById('btn-next').addEventListener('click', () => {
    if (GAME.stageIndex < 9) startStage(GAME.stageIndex + 1);
    else goMenu();
  });
  document.getElementById('btn-clear-retry').addEventListener('click', restartStage);
  document.getElementById('btn-clear-menu').addEventListener('click', goMenu);
  document.getElementById('btn-fail-retry').addEventListener('click', restartStage);
  document.getElementById('btn-fail-menu').addEventListener('click', goMenu);

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  requestAnimationFrame(loop);
}

function startStage(index) {
  GAME.stageIndex = index;
  const stage = STAGES[index];

  const built = buildStage(GAME.engine, stage);
  GAME.blocks = built.blocks;
  GAME.pigs = built.pigs;

  GAME.bird = spawnBirdAtSling(GAME.engine);
  GAME.birdsLeft = stage.birds - 1;
  GAME.pigsLeft = GAME.pigs.length;

  GAME.score = 0;
  GAME.phase = 'AIM';
  GAME.dragging = false;
  GAME.dragPoint = { x: SLING.x, y: SLING.y };
  GAME.settleFrames = 0;
  GAME.flightFrames = 0;
  GAME.clearDelay = 0;

  GAME.state = 'PLAYING';
  hideOverlays();
  syncHud();
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

function goMenu() {
  Composite.clear(GAME.engine.world, false);
  GAME.blocks = [];
  GAME.pigs = [];
  GAME.bird = null;
  GAME.state = 'MENU';
  hideOverlays();
  showOverlay('overlay-menu');
}

function checkOutcome() {
  if (GAME.state !== 'PLAYING') return;

  if (GAME.pigsLeft <= 0 && GAME.clearDelay === 0) {
    GAME.clearDelay = 30;
  }

  if (GAME.clearDelay > 0) {
    GAME.clearDelay--;
    if (GAME.clearDelay === 0) {
      finishStage(true);
    }
  }

  if (GAME.phase === 'FLYING') {
    if (worldSettled() && GAME.pigsLeft > 0) {
      resolveShot();
    }
    if (GAME.flightFrames > FLIGHT_MAX_FRAMES) {
      resolveShot();
    }
  }

  if (GAME.phase === 'AIM' && GAME.birdsLeft === 0 && GAME.bird === null && GAME.pigsLeft > 0) {
    finishStage(false);
  }
}

function updateShotPhase() {
  if (GAME.phase === 'FLYING') {
    GAME.flightFrames++;
  }
}

function worldSettled() {
  let allSettled = true;

  if (GAME.bird && !GAME.bird.isStatic) {
    const speed = Math.hypot(GAME.bird.velocity.x, GAME.bird.velocity.y);
    if (speed > SETTLE_SPEED) {
      allSettled = false;
    }
  }

  for (const block of GAME.blocks) {
    if (!block.destroyed && !block.isStatic) {
      const speed = Math.hypot(block.velocity.x, block.velocity.y);
      if (speed > SETTLE_SPEED) {
        allSettled = false;
        break;
      }
    }
  }

  if (allSettled) {
    GAME.settleFrames++;
  } else {
    GAME.settleFrames = 0;
  }

  return GAME.settleFrames >= SETTLE_FRAMES;
}

function resolveShot() {
  GAME.phase = 'AIM';
  GAME.flightFrames = 0;
  GAME.settleFrames = 0;

  if (GAME.bird && !GAME.bird.isStatic) {
    removeBody(GAME.engine, GAME.bird);
    GAME.bird = null;
  }

  if (GAME.birdsLeft > 0) {
    GAME.bird = spawnBirdAtSling(GAME.engine);
    GAME.birdsLeft--;
  } else {
    GAME.bird = null;
  }
}

function sweepDestroyed() {
  for (let i = GAME.blocks.length - 1; i >= 0; i--) {
    if (GAME.blocks[i].destroyed) {
      const block = GAME.blocks[i];
      removeBody(GAME.engine, block);
      GAME.blocks.splice(i, 1);
      GAME.score += SCORE.block;
      spawnDebris(block.position.x, block.position.y, block.color, 12);
    }
  }

  for (let i = GAME.pigs.length - 1; i >= 0; i--) {
    if (GAME.pigs[i].destroyed) {
      const pig = GAME.pigs[i];
      removeBody(GAME.engine, pig);
      GAME.pigs.splice(i, 1);
      GAME.score += SCORE.pig;
      spawnDebris(pig.position.x, pig.position.y, '#2d5016', 12);
      playSfx('pig');
    }
  }

  GAME.pigsLeft = GAME.pigs.length;
}

function finishStage(cleared) {
  if (cleared) {
    const bonusScore = GAME.birdsLeft * SCORE.birdLeft;
    GAME.score += bonusScore;

    const stage = STAGES[GAME.stageIndex];
    const stars = starsFor(stage, GAME.score);

    if (GAME.progress.best[GAME.stageIndex] === undefined ||
        GAME.score > GAME.progress.best[GAME.stageIndex].score) {
      GAME.progress.best[GAME.stageIndex] = { score: GAME.score, stars: stars };
    } else if (stars > (GAME.progress.best[GAME.stageIndex].stars || 1)) {
      GAME.progress.best[GAME.stageIndex].stars = stars;
    }

    if (GAME.stageIndex + 1 >= GAME.progress.unlocked) {
      GAME.progress.unlocked = Math.min(10, GAME.stageIndex + 2);
    }

    saveProgress(GAME.progress);

    const clearStars = document.getElementById('clear-stars');
    clearStars.innerHTML = '★'.repeat(stars) + '☆'.repeat(3 - stars);

    const clearScore = document.getElementById('clear-score');
    const bestScore = GAME.progress.best[GAME.stageIndex]?.score || 0;
    clearScore.innerHTML = `점수: ${GAME.score} / 최고: ${bestScore}`;

    GAME.state = 'CLEAR';
    showOverlay('overlay-clear');
    playSfx('clear');
  } else {
    const failMsg = document.getElementById('fail-msg');
    failMsg.textContent = `남은 돼지: ${GAME.pigsLeft}마리`;

    GAME.state = 'FAIL';
    showOverlay('overlay-fail');
    playSfx('fail');
  }
}

function syncHud() {
  const stage = STAGES[GAME.stageIndex];
  document.getElementById('hud-stage').textContent = `STAGE ${stage.id}`;
  document.getElementById('hud-score').textContent = String(GAME.score);
  document.getElementById('hud-birds').textContent = `BIRDS ${GAME.birdsLeft + (GAME.bird ? 1 : 0)}`;
}

function showOverlay(id) {
  const overlays = document.querySelectorAll('.overlay');
  for (const overlay of overlays) {
    overlay.classList.add('hidden');
  }
  document.getElementById(id).classList.remove('hidden');
}

function hideOverlays() {
  const overlays = document.querySelectorAll('.overlay');
  for (const overlay of overlays) {
    overlay.classList.add('hidden');
  }
}

function buildStageGrid() {
  const grid = document.getElementById('stage-grid');
  grid.innerHTML = '';

  for (let i = 0; i < 10; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.disabled = i >= GAME.progress.unlocked;

    const stars = GAME.progress.best[i]?.stars || 0;
    const starsText = stars > 0 ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '';

    btn.innerHTML = `<div>${i + 1}</div><div>${starsText}</div>`;
    btn.addEventListener('click', () => {
      if (i < GAME.progress.unlocked) {
        startStage(i);
      }
    });

    grid.appendChild(btn);
  }
}

function starsFor(stage, score) {
  if (score >= stage.star3) return 3;
  if (score >= stage.star2) return 2;
  return 1;
}

let audioContext = null;

function playSfx(kind) {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.connect(gain);
    gain.connect(audioContext.destination);

    let freq, duration;
    switch (kind) {
      case 'launch':
        freq = 200; duration = 0.1;
        break;
      case 'hit':
        freq = 400; duration = 0.05;
        break;
      case 'pig':
        freq = 600; duration = 0.08;
        break;
      case 'clear':
        freq = 800; duration = 0.15;
        break;
      case 'fail':
        freq = 100; duration = 0.2;
        break;
      default:
        return;
    }

    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  } catch (e) { }
}

function spawnDebris(x, y, color, n) {
  const count = n || 12;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 2 + Math.random() * 3;
    GAME.particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: color,
      size: 3 + Math.random() * 2,
      life: 30 + Math.random() * 20,
      maxLife: 30 + Math.random() * 20
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

function onPointerDown(e) {
  if (GAME.state !== 'PLAYING' || GAME.phase !== 'AIM' || !GAME.bird || GAME.dragging) return;
  GAME.dragging = true;
  const pt = canvasPoint(e);
  GAME.dragPoint = pt;
}

function onPointerMove(e) {
  if (!GAME.dragging) return;
  const pt = canvasPoint(e);
  GAME.dragPoint = pt;
}

function onPointerUp(e) {
  if (!GAME.dragging) return;
  GAME.dragging = false;
  if (GAME.state === 'PLAYING' && GAME.phase === 'AIM' && GAME.bird) {
    launchBird();
  }
}

window.addEventListener('load', init);

// DONE-CHECK
// Hop 1: game.js:buildStageGrid
// Hop 2: stages.js:STAGES
// Hop 3: physics.js:createEngine
// Hop 4: render.js:drawFrame
// Hop 5: game.js:checkOutcome
// V1: startStage
// V2: buildStageGrid
// V3: startStage
// V4: saveProgress
// V5: onPointerDown,onPointerMove,onPointerUp
// V6: trajectoryPoints,drawTrajectory
// V7: launchBird
// V8: resolveShot
// V9: Engine.update
// V10: damageBody
// V11: updateParticles
// V12: sweepDestroyed
// V13: finishStage
// V14: checkOutcome
// V15: pauseGame
// V16: loop
// V17: restartStage
// V18: goMenu
// V19: syncHud
// V20: starsFor
// V21: saveProgress
// V22: drawBackground
// V23: spawnDebris
// V24: playSfx
// V25: drawLoadError
