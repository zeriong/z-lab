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

function init() {
  if (typeof Matter === 'undefined') {
    return;
  }

  GAME.progress = loadProgress();
  GAME.engine = createEngine();
  bindCollisions(GAME.engine);

  buildStageGrid();

  document.getElementById('btn-play').addEventListener('click', function() {
    startStage(GAME.progress.unlocked - 1);
  });

  document.getElementById('btn-pause').addEventListener('click', pauseGame);
  document.getElementById('btn-resume').addEventListener('click', resumeGame);
  document.getElementById('btn-restart').addEventListener('click', restartStage);
  document.getElementById('btn-menu').addEventListener('click', goMenu);
  document.getElementById('btn-next').addEventListener('click', function() {
    if (GAME.stageIndex + 1 < STAGES.length) {
      startStage(GAME.stageIndex + 1);
    } else {
      goMenu();
    }
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
  Bodies.rectangle(W / 2, GROUND_Y + 60, W + 400, 120, { isStatic: true, friction: 0.9 });
  Composite.add(GAME.engine.world, [
    Bodies.rectangle(W / 2, GROUND_Y + 60, W + 400, 120, { isStatic: true, friction: 0.9 })
  ]);
  GAME.state = 'MENU';
  GAME.bird = null;
  GAME.blocks = [];
  GAME.pigs = [];
  GAME.particles = [];
  hideOverlays();
  showOverlay('overlay-menu');
}

function startStage(index) {
  GAME.stageIndex = index;
  const stage = STAGES[index];
  const result = buildStage(GAME.engine, stage);
  GAME.blocks = result.blocks;
  GAME.pigs = result.pigs;
  GAME.bird = spawnBirdAtSling(GAME.engine);
  GAME.phase = 'AIM';
  GAME.score = 0;
  GAME.birdsLeft = stage.birds;
  GAME.pigsLeft = GAME.pigs.length;
  GAME.particles = [];
  GAME.settleFrames = 0;
  GAME.flightFrames = 0;
  GAME.clearDelay = 0;
  GAME.dragging = false;
  GAME.dragPoint = { x: SLING.x, y: SLING.y };
  GAME.trajectoryPoints = [];
  GAME.state = 'PLAYING';
  hideOverlays();
}

function restartStage() {
  startStage(GAME.stageIndex);
}

function pauseGame() {
  GAME.state = 'PAUSED';
  showOverlay('overlay-pause');
}

function resumeGame() {
  GAME.state = 'PLAYING';
  hideOverlays();
}

function finishStage(cleared) {
  GAME.state = cleared ? 'CLEAR' : 'FAIL';
  const stage = STAGES[GAME.stageIndex];

  if (cleared) {
    GAME.score += GAME.birdsLeft * SCORE.birdLeft;
    const stars = starsFor(stage, GAME.score);
    const old = GAME.progress.best[stage.id] || { score: 0, stars: 0 };
    if (GAME.score > old.score) {
      GAME.progress.best[stage.id] = { score: GAME.score, stars };
    } else if (stars > old.stars) {
      GAME.progress.best[stage.id].stars = stars;
    }
    if (GAME.stageIndex + 1 < STAGES.length) {
      GAME.progress.unlocked = Math.max(GAME.progress.unlocked, GAME.stageIndex + 2);
    }
    saveProgress(GAME.progress);

    const html = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    document.getElementById('clear-stars').innerHTML = '<div style="font-size:40px">' + html + '</div>';
    document.getElementById('clear-score').innerHTML = 'Score: ' + GAME.score + '<br>Best: ' + (old.score || GAME.score);
    showOverlay('overlay-clear');
  } else {
    const remaining = GAME.pigsLeft;
    document.getElementById('fail-msg').innerHTML = 'Remaining pigs: ' + remaining;
    showOverlay('overlay-fail');
  }
}

function checkOutcome() {
  if (GAME.state !== 'PLAYING') return;

  if (GAME.phase === 'FLYING') {
    if (GAME.worldSettled()) {
      GAME.clearDelay++;
      if (GAME.clearDelay > 30) {
        GAME.clearDelay = 0;
        if (GAME.pigsLeft === 0) {
          finishStage(true);
        } else if (GAME.birdsLeft === 0) {
          finishStage(false);
        } else {
          resolveShot();
        }
      }
    } else {
      GAME.clearDelay = 0;
    }
  }
}

function updateShotPhase() {
  if (GAME.phase === 'FLYING') {
    GAME.flightFrames++;
    if (GAME.flightFrames > FLIGHT_MAX_FRAMES) {
      resolveShot();
    }
  }
}

function worldSettled() {
  const THRESHOLD = SETTLE_SPEED;
  let allSettled = true;

  if (GAME.bird && !GAME.bird.isStatic) {
    const speed = Math.hypot(GAME.bird.velocity.x, GAME.bird.velocity.y);
    if (speed > THRESHOLD) allSettled = false;
  }

  for (let i = 0; i < GAME.blocks.length; i++) {
    const speed = Math.hypot(GAME.blocks[i].velocity.x, GAME.blocks[i].velocity.y);
    if (speed > THRESHOLD) allSettled = false;
  }

  for (let i = 0; i < GAME.pigs.length; i++) {
    const speed = Math.hypot(GAME.pigs[i].velocity.x, GAME.pigs[i].velocity.y);
    if (speed > THRESHOLD) allSettled = false;
  }

  if (allSettled) {
    GAME.settleFrames++;
    return GAME.settleFrames >= SETTLE_FRAMES;
  } else {
    GAME.settleFrames = 0;
    return false;
  }
}

function resolveShot() {
  GAME.phase = 'AIM';
  GAME.flightFrames = 0;
  GAME.settleFrames = 0;
  GAME.birdsLeft--;

  if (GAME.birdsLeft > 0) {
    GAME.bird = spawnBirdAtSling(GAME.engine);
  } else {
    GAME.bird = null;
  }
}

function sweepDestroyed() {
  for (let i = GAME.blocks.length - 1; i >= 0; i--) {
    if (GAME.blocks[i].destroyed) {
      const body = GAME.blocks[i];
      removeBody(GAME.engine, body);
      GAME.blocks.splice(i, 1);
      GAME.score += SCORE.block;
      spawnDebris(body.position.x, body.position.y, body.color, 12);
    }
  }

  for (let i = GAME.pigs.length - 1; i >= 0; i--) {
    if (GAME.pigs[i].destroyed) {
      const body = GAME.pigs[i];
      removeBody(GAME.engine, body);
      GAME.pigs.splice(i, 1);
      GAME.score += SCORE.pig;
      GAME.pigsLeft = GAME.pigs.length;
      spawnDebris(body.position.x, body.position.y, '#4a0', 14);
      playSfx('pig');
    }
  }

  // Remove out-of-bounds bodies
  const bodies = Composite.allBodies(GAME.engine.world);
  for (let i = bodies.length - 1; i >= 0; i--) {
    const body = bodies[i];
    if (!body.isStatic && body.position.y > GROUND_Y + 200) {
      removeBody(GAME.engine, body);
    }
  }
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
  if (GAME.state !== 'PLAYING' || GAME.phase !== 'AIM') return;
  GAME.dragging = true;
  const p = canvasPoint(e);
  GAME.dragPoint = p;
  GAME.trajectoryPoints = trajectoryPoints(p);
}

function onPointerMove(e) {
  if (!GAME.dragging) return;
  const p = canvasPoint(e);
  GAME.dragPoint = p;
  GAME.trajectoryPoints = trajectoryPoints(p);
}

function onPointerUp(e) {
  if (!GAME.dragging) return;
  GAME.dragging = false;
  launchBird();
}

function syncHud() {
  document.getElementById('hud-stage').textContent = 'STAGE ' + (GAME.stageIndex + 1);
  document.getElementById('hud-score').textContent = GAME.score;
  document.getElementById('hud-birds').textContent = 'BIRDS ' + GAME.birdsLeft;
}

function showOverlay(id) {
  document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

function hideOverlays() {
  document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
}

function buildStageGrid() {
  const grid = document.getElementById('stage-grid');
  grid.innerHTML = '';
  for (let i = 0; i < STAGES.length; i++) {
    const stage = STAGES[i];
    const btn = document.createElement('button');
    btn.textContent = i + 1;
    btn.disabled = i >= GAME.progress.unlocked;
    const best = GAME.progress.best[stage.id];
    if (best) {
      btn.textContent = (i + 1) + '\n' + '★'.repeat(best.stars);
    }
    btn.addEventListener('click', function() {
      startStage(i);
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
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioContext;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    let freq, duration;
    if (kind === 'launch') {
      freq = 400; duration = 0.05;
    } else if (kind === 'hit') {
      freq = 600; duration = 0.03;
    } else if (kind === 'pig') {
      freq = 1000; duration = 0.1;
    } else if (kind === 'clear') {
      freq = 800; duration = 0.2;
    } else if (kind === 'fail') {
      freq = 200; duration = 0.2;
    }

    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, now);
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
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 60 + Math.random() * 30,
      maxLife: 90,
      size: 2 + Math.random() * 3,
      color: color || '#8b4513'
    });
  }
}

function updateParticles() {
  for (let i = GAME.particles.length - 1; i >= 0; i--) {
    const p = GAME.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.2;
    p.life--;
    if (p.life <= 0) {
      GAME.particles.splice(i, 1);
    }
  }
}

window.addEventListener('load', init);

// DONE-CHECK
// hop 1: game.js:buildStageGrid
// hop 2: physics.js:buildStage
// hop 3: game.js:loop
// hop 4: game.js:launchBird
// hop 5: game.js:finishStage
// V 1: stages.js:STAGES
// V 2: game.js:buildStageGrid
// V 3: game.js:startStage, game.js:goMenu
// V 4: physics.js:buildStage, game.js:startStage
// V 5: game.js:onPointerDown, game.js:onPointerMove, game.js:onPointerUp
// V 6: game.js:trajectoryPoints, render.js:drawTrajectory
// V 7: game.js:launchBird, game.js:pullVelocity
// V 8: game.js:resolveShot, game.js:updateShotPhase
// V 9: physics.js:createEngine, game.js:loop
// V 10: physics.js:bindCollisions, physics.js:damageBody
// V 11: game.js:sweepDestroyed, physics.js:removeBody
// V 12: game.js:sweepDestroyed, game.js:playSfx
// V 13: game.js:checkOutcome, game.js:finishStage
// V 14: game.js:worldSettled, game.js:checkOutcome
// V 15: render.js:drawSling
// V 16: game.js:pauseGame, game.js:resumeGame
// V 17: game.js:restartStage
// V 18: game.js:goMenu
// V 19: game.js:syncHud
// V 20: game.js:starsFor
// V 21: game.js:finishStage, game.js:loadProgress
// V 22: render.js:drawBackground
// V 23: game.js:spawnDebris
// V 24: game.js:playSfx
// V 25: render.js:drawLoadError
