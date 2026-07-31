import { eventBus } from './eventBus.js';
import { gameState, STATES } from './state.js';
import STAGES from './stages.js';
import { Slingshot } from './slingshot.js';
import { Renderer } from './renderer.js';
import { UI } from './ui.js';
import {
  createEngine,
  createGround,
  createBlock,
  createPig,
  createBird,
  setupCollisions,
} from './physics.js';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BIRD_TYPES,
  REST_VELOCITY_THRESHOLD,
  REST_WAIT_MS,
  MAX_TURN_WAIT_MS,
  PARTICLE_LIFETIME,
} from './constants.js';

const { Engine, World, Body } = Matter;

const canvas = document.getElementById('game-canvas');
const renderer = new Renderer(canvas);
const ui = new UI(STAGES.length);
const slingshot = new Slingshot(STAGES[0].slingshotAnchor);

let engine = null;
let world = null;
let currentStage = null;
let blocks = [];
let pigs = [];
let birdsQueue = [];
let pendingBird = null; // { type }
let currentBirdBody = null;
let particles = [];
let score = 0;

let lastTimestamp = 0;
let launchTime = 0;
let belowThresholdSince = null;
let awaitingFailCheck = false;

// ---------------------------------------------------------------------------
// Stage lifecycle
// ---------------------------------------------------------------------------

function loadStage(stageId) {
  currentStage = STAGES.find((s) => s.id === stageId);
  if (!currentStage) return;

  // Discard the previous Matter world entirely and build a clean one --
  // reusing bodies across stages leaves stale velocity/contact state behind
  // (plan section 4).
  engine = createEngine();
  world = engine.world;
  setupCollisions(engine, world, {
    onBlockDestroyed: handleBlockDestroyed,
    onPigKilled: handlePigKilled,
    onExplosion: handleExplosion,
  });

  createGround(world, CANVAS_WIDTH, currentStage.groundY);

  blocks = currentStage.blocks.map((spec) => {
    const b = createBlock(spec);
    World.add(world, b);
    return b;
  });

  pigs = currentStage.pigs.map((spec) => {
    const p = createPig(spec);
    World.add(world, p);
    return p;
  });

  birdsQueue = [...currentStage.birds];
  currentBirdBody = null;
  pendingBird = null;
  particles = [];
  score = 0;
  awaitingFailCheck = false;
  belowThresholdSince = null;

  slingshot.anchor = currentStage.slingshotAnchor;
  slingshot.reset();

  spawnNextPendingBird();
  updateHUD();
}

function spawnNextPendingBird() {
  if (birdsQueue.length === 0) {
    pendingBird = null;
    return;
  }
  const type = birdsQueue.shift();
  pendingBird = { type };
  slingshot.reset();
}

function totalBirdsLeft() {
  return birdsQueue.length + (pendingBird ? 1 : 0) + (currentBirdBody ? 1 : 0);
}

function updateHUD() {
  ui.updateHUD({ score, birdsLeft: totalBirdsLeft(), stageId: currentStage.id });
}

// ---------------------------------------------------------------------------
// Collision -> game event handlers
// ---------------------------------------------------------------------------

function handleBlockDestroyed(body) {
  score += body.gameData.scoreValue;
  spawnParticles(body.position.x, body.position.y, '#a0764a', 10);
  blocks = blocks.filter((b) => b !== body);
  updateHUD();
}

function handlePigKilled(body) {
  score += body.gameData.scoreValue;
  spawnParticles(body.position.x, body.position.y, '#7bc043', 14);
  pigs = pigs.filter((p) => p !== body);
  updateHUD();
  checkClear();
}

function handleExplosion(pos) {
  spawnParticles(pos.x, pos.y, '#ffcc33', 24);
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: PARTICLE_LIFETIME,
      maxLife: PARTICLE_LIFETIME,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

function updateParticles() {
  particles = particles.filter((p) => p.life > 0);
  particles.forEach((p) => {
    p.vy += 0.15;
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;
  });
}

// ---------------------------------------------------------------------------
// Win / lose judgement
// ---------------------------------------------------------------------------

function checkClear() {
  if (pigs.length === 0 && gameState.is(STATES.INGAME)) {
    score += totalBirdsLeft() * 100; // remaining-bird bonus
    updateHUD();
    gameState.transition(STATES.CLEARED);
  }
}

function checkFail() {
  if (pigs.length > 0 && gameState.is(STATES.INGAME)) {
    gameState.transition(STATES.FAILED);
  }
}

// ---------------------------------------------------------------------------
// Slingshot launch + per-frame turn resolution
// ---------------------------------------------------------------------------

function launchBird() {
  if (!pendingBird) return;
  const anchor = slingshot.anchor;
  const velocity = slingshot.release();
  const body = createBird(pendingBird.type, anchor.x, anchor.y);
  World.add(world, body);
  Body.setVelocity(body, velocity);

  currentBirdBody = body;
  pendingBird = null;
  launchTime = performance.now();
  belowThresholdSince = null;
  updateHUD();
}

function resolveCurrentBird() {
  currentBirdBody = null;
  belowThresholdSince = null;
  spawnNextPendingBird();
  updateHUD();
  if (!pendingBird && pigs.length > 0) {
    // last bird is done and pigs remain: wait for the settle window before
    // failing, so debris from the final shot still gets a chance to crush
    // a pig (plan section 6, "정지 대기" timer).
    awaitingFailCheck = true;
    belowThresholdSince = null;
  }
}

function updateGamePhysics(delta) {
  Engine.update(engine, delta);

  if (currentBirdBody) {
    const pos = currentBirdBody.position;
    const speed = currentBirdBody.speed;
    const outOfBounds = pos.x < -100 || pos.x > CANVAS_WIDTH + 100 || pos.y > CANVAS_HEIGHT + 300;
    const elapsed = performance.now() - launchTime;

    if (outOfBounds) {
      World.remove(world, currentBirdBody);
      resolveCurrentBird();
    } else if (speed < REST_VELOCITY_THRESHOLD) {
      if (belowThresholdSince === null) belowThresholdSince = performance.now();
      if (performance.now() - belowThresholdSince > REST_WAIT_MS) {
        resolveCurrentBird();
      }
    } else {
      belowThresholdSince = null;
      if (elapsed > MAX_TURN_WAIT_MS) {
        resolveCurrentBird();
      }
    }
  } else if (awaitingFailCheck) {
    if (belowThresholdSince === null) belowThresholdSince = performance.now();
    if (performance.now() - belowThresholdSince > REST_WAIT_MS) {
      awaitingFailCheck = false;
      belowThresholdSince = null;
      checkFail();
    }
  }
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function render() {
  renderer.clear();
  renderer.drawGround(currentStage.groundY);
  renderer.drawSlingshot(slingshot.anchor);

  blocks.forEach((b) => renderer.drawBlock(b));
  pigs.forEach((p) => renderer.drawPig(p));

  if (currentBirdBody) {
    const cfg = BIRD_TYPES[currentBirdBody.gameData.type];
    renderer.drawBird(currentBirdBody, cfg.color);
  }

  if (pendingBird) {
    const cfg = BIRD_TYPES[pendingBird.type];
    renderer.drawBands(slingshot.anchor, slingshot.dragPos);
    renderer.drawPendingBird(slingshot.dragPos, cfg.radius, cfg.color);
    if (slingshot.dragging) {
      renderer.drawTrajectory(slingshot.getTrajectoryPoints());
    }
  }

  renderer.drawParticles(particles);
}

// ---------------------------------------------------------------------------
// Main loop -- simulation and rendering are both driven from here, but
// physics only advances while INGAME so there is never a "zombie" loop
// running physics in the background after Pause / 메인으로.
// ---------------------------------------------------------------------------

function loop(timestamp) {
  const delta = lastTimestamp ? Math.min(timestamp - lastTimestamp, 33) : 16.667;
  lastTimestamp = timestamp;

  if (gameState.is(STATES.INGAME)) {
    updateGamePhysics(delta);
    updateParticles();
  }

  if (gameState.is(STATES.INGAME) || gameState.is(STATES.PAUSED)) {
    render();
  }

  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

function pointerPosFromEvent(evt) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (evt.clientX - rect.left) * scaleX,
    y: (evt.clientY - rect.top) * scaleY,
  };
}

canvas.addEventListener('pointerdown', (evt) => {
  if (!gameState.is(STATES.INGAME) || !pendingBird) return;
  slingshot.tryGrab(pointerPosFromEvent(evt));
});

canvas.addEventListener('pointermove', (evt) => {
  if (!slingshot.dragging) return;
  slingshot.updateDrag(pointerPosFromEvent(evt));
});

window.addEventListener('pointerup', () => {
  if (!slingshot.dragging) return;
  launchBird();
});

// ---------------------------------------------------------------------------
// Screen flow -- every transition goes through gameState.transition(); UI
// never flips screens on its own.
// ---------------------------------------------------------------------------

function startStage(stageId) {
  loadStage(stageId);
  ui.showGame();
  gameState.transition(STATES.INGAME);
}

function goToMain() {
  engine = null;
  world = null;
  currentBirdBody = null;
  pendingBird = null;
  particles = [];
  ui.renderStageSelect(startStage);
  ui.showMain();
  gameState.transition(STATES.MAIN);
}

function pauseGame() {
  if (!gameState.is(STATES.INGAME)) return;
  gameState.transition(STATES.PAUSED);
  ui.showPauseOverlay();
}

function restartCurrentStage() {
  ui.hidePauseOverlay();
  ui.hideResult();
  const stageId = currentStage.id;
  loadStage(stageId);
  gameState.transition(STATES.INGAME);
}

function goNextStage() {
  ui.hideResult();
  const nextId = Math.min(currentStage.id + 1, STAGES.length);
  loadStage(nextId);
  gameState.transition(STATES.INGAME);
}

eventBus.on('state:changed', ({ to }) => {
  if (to === STATES.CLEARED) {
    ui.showResult('CLEARED', score, currentStage.id, currentStage.id < STAGES.length);
  } else if (to === STATES.FAILED) {
    ui.showResult('FAILED', score, currentStage.id, false);
  }
});

ui.bindControls({
  onPause: pauseGame,
  onRestart: restartCurrentStage,
  onMain: goToMain,
  onNext: goNextStage,
});

ui.renderStageSelect(startStage);
ui.showMain();
requestAnimationFrame(loop);
