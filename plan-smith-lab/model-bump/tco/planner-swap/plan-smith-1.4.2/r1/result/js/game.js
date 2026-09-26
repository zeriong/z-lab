function boot() {
  if (typeof Matter === 'undefined') return;

  G.canvas = document.getElementById('canvas');
  G.ctx = G.canvas.getContext('2d');

  G.progress = loadProgress();
  setMuted(G.progress.muted);

  initPhysics();
  initInput(G.canvas);

  const buttons = [
    { id: 'btn-start', handler: () => { playSound('click'); startStage(Math.min(G.progress.unlocked, LEVELS.length) - 1); } },
    { id: 'btn-select', handler: () => { playSound('click'); setScreen('select'); } },
    { id: 'btn-sound', handler: () => { playSound('click'); G.progress.muted = !G.progress.muted; setMuted(G.progress.muted); saveProgress(); updateMenu(); } },
    { id: 'btn-select-back', handler: () => { playSound('click'); setScreen('menu'); updateMenu(); } },
    { id: 'btn-pause', handler: () => { playSound('click'); pauseGame(); } },
    { id: 'btn-resume', handler: () => { playSound('click'); resumeGame(); } },
    { id: 'btn-restart', handler: () => { playSound('click'); restartStage(); } },
    { id: 'btn-pause-menu', handler: () => { playSound('click'); goMenu(); } },
    { id: 'btn-next', handler: () => { playSound('click'); startStage(G.levelIndex + 1); } },
    { id: 'btn-clear-retry', handler: () => { playSound('click'); restartStage(); } },
    { id: 'btn-clear-menu', handler: () => { playSound('click'); goMenu(); } },
    { id: 'btn-fail-retry', handler: () => { playSound('click'); restartStage(); } },
    { id: 'btn-fail-menu', handler: () => { playSound('click'); goMenu(); } }
  ];

  buttons.forEach(btn => {
    const el = document.getElementById(btn.id);
    if (el) {
      el.addEventListener('click', btn.handler);
    }
  });

  window.addEventListener('resize', resize);
  resize();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.screen === 'playing') {
      pauseGame();
    }
  });

  document.addEventListener('pointerdown', soundInit);
  document.addEventListener('keydown', soundInit);

  setScreen('menu');
  updateMenu();

  G.lastFrame = performance.now();
  requestAnimationFrame(frame);
}

function frame(now) {
  requestAnimationFrame(frame);

  const dt = Math.min(now - G.lastFrame, 100);
  G.lastFrame = now;

  if (G.screen === 'playing') {
    G.accumulator += dt;
    let n = 0;
    while (G.screen === 'playing' && G.accumulator >= STEP_MS && n < 4) {
      stepGame();
      G.accumulator -= STEP_MS;
      n++;
    }
    if (n === 4) {
      G.accumulator = 0;
    }
  }

  render();
}

function stepGame() {
  G.time += STEP_MS;

  Engine.update(G.engine, STEP_MS);

  killOutOfBounds();
  processRemovals();
  updateEffects();

  if (G.phase === 'flying') {
    updateFlight();
  }

  if (G.phase === 'clearing' && G.time >= G.clearAt) {
    showClear();
  }
}

function updateFlight() {
  if (G.bird) {
    if (Math.round(G.time / STEP_MS) % 3 === 0) {
      G.trail.push({ x: G.bird.position.x, y: G.bird.position.y });
      if (G.trail.length > TRAIL_MAX) {
        G.trail.shift();
      }
    }

    if (G.birdType === 'black' && !G.abilityUsed && G.birdHitAt >= 0 && G.time - G.birdHitAt >= BOMB_FUSE_MS) {
      explodeBird();
    }
  }

  const elapsed = G.time - G.launchTime;

  if (elapsed >= MIN_TURN_MS && isWorldSettled()) {
    G.settleCount += 1;
  } else {
    G.settleCount = 0;
  }

  if (G.settleCount >= SETTLE_STEPS || elapsed >= MAX_TURN_MS) {
    endTurn();
  }
}

function endTurn() {
  if (G.bird) {
    spawnParticles(G.bird.position.x, G.bird.position.y, '#ffffff', 10);
    Composite.remove(G.engine.world, G.bird);
    G.bird = null;
  }

  if (G.phase !== 'flying') return;

  if (G.birdQueue.length === 0) {
    showFail();
    return;
  }

  G.birdType = G.birdQueue.shift();
  G.phase = 'aiming';
  G.aim = { x: SLING_X, y: SLING_Y };
  G.abilityUsed = false;
  G.birdHitAt = -1;
  G.settleCount = 0;
  updateHud();
}

function enterClearing() {
  if (G.phase === 'aiming') {
    G.birdQueue.unshift(G.birdType);
    G.dragging = false;
  }
  G.phase = 'clearing';
  G.clearAt = G.time + CLEAR_DELAY_MS;
}

function computeStars(index, score) {
  let max = 0;
  const lv = LEVELS[index];

  lv.items.forEach(item => {
    if (MATERIALS[item.m]) {
      max += MATERIALS[item.m].score;
    }
    if (PIGS[item.t]) {
      max += PIGS[item.t].score;
    }
  });

  max += (lv.birds.length - 1) * BIRD_BONUS;

  const r = score / max;
  if (r >= STAR3_RATIO) return 3;
  if (r >= STAR2_RATIO) return 2;
  return 1;
}

function showClear() {
  if (G.phase === 'ended') return;
  G.phase = 'ended';

  const bonus = G.birdQueue.length * BIRD_BONUS;
  G.score += bonus;

  const stars = computeStars(G.levelIndex, G.score);
  const best = G.progress.best[G.levelIndex];
  const isNewBest = G.score > best.score;

  best.score = Math.max(best.score, G.score);
  best.stars = Math.max(best.stars, stars);
  G.progress.unlocked = Math.max(G.progress.unlocked, Math.min(G.levelIndex + 2, LEVELS.length));

  saveProgress();

  const titleEl = document.getElementById('clear-title');
  if (G.levelIndex === LEVELS.length - 1) {
    titleEl.textContent = '모든 스테이지 클리어!';
  } else {
    titleEl.textContent = '스테이지 ' + (G.levelIndex + 1) + ' 클리어!';
  }

  const starsEl = document.getElementById('clear-stars');
  starsEl.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);

  document.getElementById('clear-score').textContent = '점수 ' + G.score.toLocaleString();
  document.getElementById('clear-bonus').textContent = '남은 새 보너스 +' + bonus.toLocaleString();

  if (isNewBest) {
    document.getElementById('clear-best').textContent = '최고 기록 갱신!';
  } else {
    document.getElementById('clear-best').textContent = '최고 기록 ' + best.score.toLocaleString();
  }

  const btnNext = document.getElementById('btn-next');
  if (G.levelIndex === LEVELS.length - 1) {
    btnNext.classList.add('hidden');
  } else {
    btnNext.classList.remove('hidden');
  }

  updateHud();
  playSound('clear');
  setScreen('clear');
}

function showFail() {
  G.phase = 'ended';
  document.getElementById('fail-text').textContent = '돼지 ' + G.pigsLeft + '마리가 남았습니다';
  playSound('fail');
  setScreen('fail');
}

function loadProgress() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (d && typeof d.unlocked === 'number' && d.unlocked >= 1 && d.unlocked <= 10 &&
        Array.isArray(d.best) && d.best.length === 10) {
      d.muted = !!d.muted;
      return d;
    }
  } catch (e) {}
  return {
    unlocked: 1,
    best: Array.from({ length: 10 }, () => ({ score: 0, stars: 0 })),
    muted: false
  };
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(G.progress));
  } catch (e) {}
}

function setScreen(name) {
  G.screen = name;

  const states = {
    'menu': { menu: false, select: true, hud: true, pause: true, pauseOverlay: true, clear: true, fail: true },
    'select': { menu: true, select: false, hud: true, pause: true, pauseOverlay: true, clear: true, fail: true },
    'playing': { menu: true, select: true, hud: false, pause: false, pauseOverlay: true, clear: true, fail: true },
    'paused': { menu: true, select: true, hud: false, pause: false, pauseOverlay: false, clear: true, fail: true },
    'clear': { menu: true, select: true, hud: false, pause: true, pauseOverlay: true, clear: false, fail: true },
    'fail': { menu: true, select: true, hud: false, pause: true, pauseOverlay: true, clear: true, fail: false }
  };

  const state = states[name] || states['menu'];
  document.getElementById('menu').classList.toggle('hidden', state.menu);
  document.getElementById('select').classList.toggle('hidden', state.select);
  document.getElementById('hud').classList.toggle('hidden', state.hud);
  document.getElementById('btn-pause').classList.toggle('hidden', state.pause);
  document.getElementById('pause-overlay').classList.toggle('hidden', state.pauseOverlay);
  document.getElementById('clear').classList.toggle('hidden', state.clear);
  document.getElementById('fail').classList.toggle('hidden', state.fail);

  if (name === 'select') {
    renderStageSelect();
  }
}

function startStage(index) {
  loadLevel(index);
  updateHud();
  G.lastFrame = performance.now();
  setScreen('playing');
}

function restartStage() {
  startStage(G.levelIndex);
}

function goMenu() {
  clearWorld();
  G.bird = null;
  G.birdType = null;
  G.birdQueue = [];
  G.particles = [];
  G.popups = [];
  G.trail = [];
  G.dragging = false;
  setScreen('menu');
  updateMenu();
}

function pauseGame() {
  if (G.screen !== 'playing') return;
  G.dragging = false;
  if (G.phase === 'aiming') {
    G.aim = { x: SLING_X, y: SLING_Y };
  }
  setScreen('paused');
}

function resumeGame() {
  if (G.screen !== 'paused') return;
  G.accumulator = 0;
  G.lastFrame = performance.now();
  setScreen('playing');
}

function updateHud() {
  document.getElementById('hud-stage').textContent = '스테이지 ' + (G.levelIndex + 1);
  document.getElementById('hud-score').textContent = '점수 ' + G.score.toLocaleString();
  document.getElementById('hud-pigs').textContent = '돼지 ' + G.pigsLeft;

  const birdCount = G.birdQueue.length + (G.phase === 'aiming' ? 1 : 0);
  document.getElementById('hud-birds').textContent = '새 ' + birdCount;

  const tipEl = document.getElementById('hud-tip');
  const tip = G.phase === 'aiming' ? BIRD_TIPS[G.birdType] : '';
  tipEl.textContent = tip;
  tipEl.classList.toggle('hidden', tip === '');
}

function updateMenu() {
  const nextStage = Math.min(G.progress.unlocked, LEVELS.length);
  document.getElementById('btn-start').textContent = '게임 시작 · 스테이지 ' + nextStage;
  document.getElementById('btn-sound').textContent = G.progress.muted ? '사운드: 꺼짐' : '사운드: 켜짐';
}

function renderStageSelect() {
  const grid = document.getElementById('stage-grid');
  grid.innerHTML = '';

  for (let i = 0; i < 10; i++) {
    const btn = document.createElement('button');
    btn.className = 'stage-btn';
    btn.type = 'button';

    const isUnlocked = i + 1 <= G.progress.unlocked;

    if (!isUnlocked) {
      btn.classList.add('locked');
      btn.disabled = true;
      btn.textContent = (i + 1) + '\n잠김';
    } else {
      const best = G.progress.best[i];
      const stars = '★'.repeat(best.stars) + '☆'.repeat(3 - best.stars);
      btn.textContent = (i + 1) + '\n' + stars;
      btn.addEventListener('click', () => {
        playSound('click');
        startStage(i);
      });
    }

    grid.appendChild(btn);
  }
}

function resize() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  const gameEl = document.getElementById('game');
  gameEl.style.transform = 'translate(-50%, -50%) scale(' + s + ')';
}

boot();
