function boot() {
  if (typeof Matter === 'undefined') return;

  G.canvas = document.getElementById('canvas');
  G.ctx = G.canvas.getContext('2d');

  G.progress = loadProgress();
  setMuted(G.progress.muted);

  initPhysics();
  initInput(G.canvas);

  const buttons = {
    'btn-start': () => { playSound('click'); startStage(Math.min(G.progress.unlocked, LEVELS.length) - 1); },
    'btn-select': () => { playSound('click'); setScreen('select'); },
    'btn-sound': () => {
      playSound('click');
      G.progress.muted = !G.progress.muted;
      setMuted(G.progress.muted);
      saveProgress();
      updateMenu();
    },
    'btn-select-back': () => { playSound('click'); setScreen('menu'); updateMenu(); },
    'btn-pause': () => { playSound('click'); pauseGame(); },
    'btn-resume': () => { playSound('click'); resumeGame(); },
    'btn-restart': () => { playSound('click'); restartStage(); },
    'btn-pause-menu': () => { playSound('click'); goMenu(); },
    'btn-next': () => { playSound('click'); startStage(G.levelIndex + 1); },
    'btn-clear-retry': () => { playSound('click'); restartStage(); },
    'btn-clear-menu': () => { playSound('click'); goMenu(); },
    'btn-fail-retry': () => { playSound('click'); restartStage(); },
    'btn-fail-menu': () => { playSound('click'); goMenu(); }
  };

  for (const [id, handler] of Object.entries(buttons)) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', handler);
  }

  const stageGrid = document.getElementById('stage-grid');
  for (let i = 0; i < LEVELS.length; i++) {
    const btn = document.createElement('button');
    btn.className = 'stage-btn';
    btn.textContent = (i + 1).toString();
    if (i + 1 > G.progress.unlocked) {
      btn.classList.add('locked');
      btn.disabled = true;
    }
    btn.addEventListener('click', () => {
      if (i + 1 <= G.progress.unlocked) {
        playSound('click');
        startStage(i);
      }
    });
    stageGrid.appendChild(btn);
  }

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
  const lv = LEVELS[index];
  let max = 0;

  lv.items.forEach(item => {
    if (SHAPES[item.t]) {
      const m = MATERIALS[item.m];
      max += m.score;
    } else if (PIGS[item.t]) {
      const p = PIGS[item.t];
      max += p.score;
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

  const bestEl = document.getElementById('clear-best');
  if (isNewBest) {
    bestEl.textContent = '최고 기록 갱신!';
  } else {
    bestEl.textContent = '최고 기록 ' + best.score.toLocaleString();
  }

  const nextBtn = document.getElementById('btn-next');
  if (G.levelIndex === LEVELS.length - 1) {
    nextBtn.classList.add('hidden');
  } else {
    nextBtn.classList.remove('hidden');
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

  const visibility = {
    'menu': { menu: false, select: true, hud: true, btnPause: true, pauseOverlay: true, clear: true, fail: true },
    'select': { menu: true, select: false, hud: true, btnPause: true, pauseOverlay: true, clear: true, fail: true },
    'playing': { menu: true, select: true, hud: false, btnPause: false, pauseOverlay: true, clear: true, fail: true },
    'paused': { menu: true, select: true, hud: false, btnPause: false, pauseOverlay: false, clear: true, fail: true },
    'clear': { menu: true, select: true, hud: false, btnPause: true, pauseOverlay: true, clear: false, fail: true },
    'fail': { menu: true, select: true, hud: false, btnPause: true, pauseOverlay: true, clear: true, fail: false }
  };

  const vis = visibility[name];
  if (vis) {
    document.getElementById('menu').classList.toggle('hidden', vis.menu);
    document.getElementById('select').classList.toggle('hidden', vis.select);
    document.getElementById('hud').classList.toggle('hidden', vis.hud);
    document.getElementById('btn-pause').classList.toggle('hidden', vis.btnPause);
    document.getElementById('pause-overlay').classList.toggle('hidden', vis.pauseOverlay);
    document.getElementById('clear').classList.toggle('hidden', vis.clear);
    document.getElementById('fail').classList.toggle('hidden', vis.fail);
  }

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
  document.getElementById('hud-birds').textContent = '새 ' + (G.birdQueue.length + (G.phase === 'aiming' ? 1 : 0));

  const tipEl = document.getElementById('hud-tip');
  const tip = G.phase === 'aiming' ? BIRD_TIPS[G.birdType] : '';
  tipEl.textContent = tip;
  tipEl.classList.toggle('hidden', !tip);
}

function updateMenu() {
  const startBtn = document.getElementById('btn-start');
  startBtn.textContent = '게임 시작 · 스테이지 ' + Math.min(G.progress.unlocked, LEVELS.length);

  const soundBtn = document.getElementById('btn-sound');
  soundBtn.textContent = G.progress.muted ? '사운드: 꺼짐' : '사운드: 켜짐';
}

function renderStageSelect() {
  const grid = document.getElementById('stage-grid');
  const buttons = grid.querySelectorAll('.stage-btn');

  buttons.forEach((btn, i) => {
    const best = G.progress.best[i];
    const unlocked = i + 1 <= G.progress.unlocked;

    btn.classList.toggle('locked', !unlocked);
    btn.disabled = !unlocked;

    const textParts = [(i + 1).toString()];
    if (unlocked && best.stars > 0) {
      textParts.push('★'.repeat(best.stars) + '☆'.repeat(3 - best.stars));
    } else if (!unlocked) {
      textParts.push('잠김');
    }

    btn.innerHTML = textParts.map(t => '<div>' + t + '</div>').join('');
  });
}

function resize() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  const gameEl = document.getElementById('game');
  gameEl.style.transform = 'translate(-50%, -50%) scale(' + s + ')';
}

boot();
