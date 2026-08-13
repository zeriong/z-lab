const Game = (() => {
  const Composite = Matter.Composite;
  const CANVAS = document.getElementById('game-canvas');
  const CTX = CANVAS.getContext('2d');
  const CANVAS_W = 1280;
  const CANVAS_H = 720;
  const SLINGSHOT_X = 200;
  const SLINGSHOT_Y = 540;
  const SLINGSHOT_RANGE = 120;
  const LAUNCH_K = 0.22;
  const PREVIEW_G = 0.2778;

  let state = 'MENU';
  let stageNo = 0;
  let currentStage = null;
  let pigs = [];
  let blocks = [];
  let birdsLeft = 0;
  let currentBird = null;
  let dragging = false;
  let score = 0;
  let settleFrames = 0;
  let settleStartTime = 0;
  let lastFrameTime = 0;

  let particles = [];
  let birdTrail = [];
  let deadPigsTracked = new Set();
  let deadBlocksTracked = new Set();

  function getCanvasCoords(clientX, clientY) {
    let rect = CANVAS.getBoundingClientRect();
    let x = (clientX - rect.left) * (CANVAS_W / rect.width);
    let y = (clientY - rect.top) * (CANVAS_H / rect.height);
    return { x, y };
  }

  function boot() {
    if (typeof Matter === 'undefined') {
      let banner = document.getElementById('load-banner');
      if (banner) banner.style.display = 'block';
      return;
    }

    Physics.createWorld();
    UI.init();
    UI.show('menu');

    // Pointer events
    CANVAS.addEventListener('pointerdown', (e) => {
      if (state !== 'PLAYING') return;

      let { x, y } = getCanvasCoords(e.clientX, e.clientY);
      let dx = x - SLINGSHOT_X;
      let dy = y - SLINGSHOT_Y;
      let dist = Math.hypot(dx, dy);

      if (dist < 60) {
        dragging = true;
      }
    });

    CANVAS.addEventListener('pointermove', (e) => {
      if (!dragging) return;

      let { x, y } = getCanvasCoords(e.clientX, e.clientY);
      let dx = x - SLINGSHOT_X;
      let dy = y - SLINGSHOT_Y;
      let dist = Math.hypot(dx, dy);

      if (dist > SLINGSHOT_RANGE) {
        let ratio = SLINGSHOT_RANGE / dist;
        x = SLINGSHOT_X + dx * ratio;
        y = SLINGSHOT_Y + dy * ratio;
      }

      currentBird = { x, y, px: SLINGSHOT_X, py: SLINGSHOT_Y };
    });

    CANVAS.addEventListener('pointerup', (e) => {
      if (!dragging) return;
      dragging = false;
      if (currentBird) {
        launchBird();
      }
    });

    lastFrameTime = Date.now();
    requestAnimationFrame(tick);
  }

  function start(n) {
    stageNo = n;
    currentStage = STAGES[n - 1];
    score = 0;
    birdsLeft = currentStage.birds;
    settleFrames = 0;
    settleStartTime = Date.now();
    particles = [];
    birdTrail = [];
    deadPigsTracked.clear();
    deadBlocksTracked.clear();

    let result = Physics.loadStage(currentStage);
    blocks = result.blocks;
    pigs = result.pigs;

    currentBird = {
      x: SLINGSHOT_X,
      y: SLINGSHOT_Y,
      px: SLINGSHOT_X,
      py: SLINGSHOT_Y
    };
    dragging = false;
    state = 'PLAYING';

    UI.setHud(score, birdsLeft);
  }

  function launchBird() {
    if (!currentBird || birdsLeft <= 0) return;

    let vx = (SLINGSHOT_X - currentBird.x) * LAUNCH_K;
    let vy = (SLINGSHOT_Y - currentBird.y) * LAUNCH_K;

    Physics.spawnBirdBody(SLINGSHOT_X, SLINGSHOT_Y, vx, vy);
    Sound.play('launch');

    birdsLeft--;
    currentBird = null;
    birdTrail = [];
    settleFrames = 0;
    settleStartTime = Date.now();

    UI.setHud(score, birdsLeft);
  }

  function calculateStars(stageScore) {
    let maxScore = currentStage.pigs.length * 5000 + currentStage.blocks.length * 500 + (currentStage.birds - 1) * 10000;
    let star3Threshold = Math.round(maxScore * 0.7 / 500) * 500;
    let star2Threshold = Math.round(maxScore * 0.5 / 500) * 500;

    if (stageScore >= star3Threshold) return 3;
    if (stageScore >= star2Threshold) return 2;
    return 1;
  }

  function checkResult() {
    if (pigs.length === 0) {
      state = 'CLEAR';
      let stars = calculateStars(score);

      let progress = Store.load();
      if (!progress.unlocked) progress.unlocked = 1;
      if (!progress.stars) progress.stars = {};

      progress.unlocked = Math.max(progress.unlocked, stageNo + 1);
      progress.stars[stageNo] = Math.max(progress.stars[stageNo] || 0, stars);
      Store.save(progress);

      let clearScoreElem = document.getElementById('clear-score');
      if (clearScoreElem) clearScoreElem.textContent = score;

      let clearStarsElem = document.getElementById('clear-stars');
      if (clearStarsElem) clearStarsElem.textContent = '★'.repeat(stars);

      UI.hide('pause');
      UI.show('clear');

      let nextBtn = document.getElementById('btn-next');
      if (stageNo >= 10) {
        nextBtn.style.display = 'none';
      } else {
        nextBtn.style.display = 'block';
      }

      return;
    }

    if (birdsLeft === 0 && Physics.isSettled()) {
      state = 'FAIL';
      UI.hide('pause');
      UI.show('fail');
      return;
    }

    if (Physics.isSettled()) {
      settleFrames++;
    } else {
      settleFrames = 0;
      settleStartTime = Date.now();
    }

    let elapsed = Date.now() - settleStartTime;
    if (settleFrames > 45 || elapsed > 6000) {
      if (birdsLeft > 0) {
        settleFrames = 0;
        settleStartTime = Date.now();
        currentBird = {
          x: SLINGSHOT_X,
          y: SLINGSHOT_Y,
          px: SLINGSHOT_X,
          py: SLINGSHOT_Y
        };
      }
    }
  }

  function tick() {
    let now = Date.now();
    let dt = Math.min(33, now - lastFrameTime);
    lastFrameTime = now;

    render();

    if (state === 'PLAYING') {
      Physics.step();

      // Handle dead pigs and blocks
      for (let pig of pigs) {
        if (pig.plugin.dead) {
          let pigId = pig.plugin.id;
          if (!deadPigsTracked.has(pigId)) {
            deadPigsTracked.add(pigId);
            score += 5000;
            Sound.play('pop');
          }
        }
      }

      for (let block of blocks) {
        if (block.plugin.dead) {
          let blockId = block.plugin.id;
          if (!deadBlocksTracked.has(blockId)) {
            deadBlocksTracked.add(blockId);
            score += 500;
            Sound.play('hit');
            createBlockParticles(block);
          }
        }
      }

      UI.setHud(score, birdsLeft);

      // Update pig and block lists
      pigs = pigs.filter(p => !p.plugin.dead);
      blocks = blocks.filter(b => !b.plugin.dead);

      checkResult();
    }

    requestAnimationFrame(tick);
  }

  function createBlockParticles(block) {
    let x = block.position.x;
    let y = block.position.y;
    let color = block.plugin.color;

    for (let i = 0; i < 8; i++) {
      let angle = (i / 8) * Math.PI * 2;
      let vx = Math.cos(angle) * 3;
      let vy = Math.sin(angle) * 3;

      particles.push({
        x, y,
        vx, vy,
        size: 8,
        color,
        life: 600,
        maxLife: 600
      });
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      let p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= dt;

      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function render() {
    // Clear
    CTX.fillStyle = 'white';
    CTX.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Sky gradient
    let gradient = CTX.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    CTX.fillStyle = gradient;
    CTX.fillRect(0, 0, CANVAS_W, 450);

    // Hills
    CTX.fillStyle = '#90EE90';
    CTX.beginPath();
    CTX.ellipse(300, 500, 400, 150, 0, 0, Math.PI * 2);
    CTX.fill();
    CTX.beginPath();
    CTX.ellipse(1000, 480, 350, 140, 0, 0, Math.PI * 2);
    CTX.fill();

    // Ground
    CTX.fillStyle = '#228B22';
    CTX.fillRect(0, 640, CANVAS_W, 80);

    // Slingshot
    renderSlingshot();

    // Physics bodies
    let allBodies = Composite.allBodies(Physics.engine.world);
    for (let body of allBodies) {
      if (body.plugin.kind === 'block') {
        renderBlock(body);
      } else if (body.plugin.kind === 'pig') {
        renderPig(body);
      } else if (body.plugin.kind === 'bird') {
        renderBird(body);
      }
    }

    // Bird trail
    if (birdTrail.length > 0) {
      CTX.strokeStyle = 'rgba(255, 150, 100, 0.4)';
      CTX.lineWidth = 2;
      CTX.beginPath();
      CTX.moveTo(birdTrail[0].x, birdTrail[0].y);
      for (let i = 1; i < birdTrail.length; i++) {
        CTX.lineTo(birdTrail[i].x, birdTrail[i].y);
      }
      CTX.stroke();
    }

    // Trajectory preview
    if (dragging && currentBird) {
      renderTrajectoryPreview();
    }

    // Dragging band
    if (dragging && currentBird) {
      CTX.strokeStyle = '#8B4513';
      CTX.lineWidth = 3;
      CTX.beginPath();
      CTX.moveTo(SLINGSHOT_X, SLINGSHOT_Y);
      CTX.lineTo(currentBird.x, currentBird.y);
      CTX.stroke();
    }

    // Particles
    CTX.globalAlpha = 1;
    for (let p of particles) {
      let alpha = (p.life / p.maxLife) * 0.8;
      CTX.fillStyle = p.color;
      CTX.globalAlpha = alpha;
      CTX.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    CTX.globalAlpha = 1;

    updateParticles(16);
  }

  function renderSlingshot() {
    // Slingshot base
    CTX.fillStyle = '#8B4513';
    CTX.fillRect(SLINGSHOT_X - 30, SLINGSHOT_Y + 40, 60, 100);

    // Slingshot arms
    CTX.strokeStyle = '#8B4513';
    CTX.lineWidth = 12;
    CTX.beginPath();
    CTX.moveTo(SLINGSHOT_X - 20, SLINGSHOT_Y);
    CTX.lineTo(SLINGSHOT_X - 15, SLINGSHOT_Y - 60);
    CTX.stroke();

    CTX.beginPath();
    CTX.moveTo(SLINGSHOT_X + 20, SLINGSHOT_Y);
    CTX.lineTo(SLINGSHOT_X + 15, SLINGSHOT_Y - 60);
    CTX.stroke();
  }

  function renderBlock(body) {
    CTX.save();
    CTX.translate(body.position.x, body.position.y);
    CTX.rotate(body.angle);

    CTX.fillStyle = body.plugin.color;
    CTX.fillRect(
      -body.plugin.w / 2,
      -body.plugin.h / 2,
      body.plugin.w,
      body.plugin.h
    );

    CTX.strokeStyle = '#000';
    CTX.lineWidth = 1;
    CTX.strokeRect(
      -body.plugin.w / 2,
      -body.plugin.h / 2,
      body.plugin.w,
      body.plugin.h
    );

    CTX.restore();
  }

  function renderPig(body) {
    CTX.fillStyle = body.plugin.color;
    CTX.beginPath();
    CTX.arc(body.position.x, body.position.y, 20, 0, Math.PI * 2);
    CTX.fill();

    CTX.strokeStyle = '#000';
    CTX.lineWidth = 1;
    CTX.stroke();
  }

  function renderBird(body) {
    birdTrail.push({ x: body.position.x, y: body.position.y });
    if (birdTrail.length > 60) birdTrail.shift();

    CTX.fillStyle = '#FFD700';
    CTX.beginPath();
    CTX.arc(body.position.x, body.position.y, 18, 0, Math.PI * 2);
    CTX.fill();

    CTX.strokeStyle = '#000';
    CTX.lineWidth = 1;
    CTX.stroke();
  }

  function renderTrajectoryPreview() {
    let x = SLINGSHOT_X;
    let y = SLINGSHOT_Y;
    let vx = (SLINGSHOT_X - currentBird.x) * LAUNCH_K;
    let vy = (SLINGSHOT_Y - currentBird.y) * LAUNCH_K;

    CTX.fillStyle = 'rgba(255, 150, 100, 0.6)';
    for (let i = 0; i < 18; i++) {
      let px = x + vx * i * 3;
      let py = y + vy * i * 3 + PREVIEW_G * (i * 3) * (i * 3) / 2;

      CTX.beginPath();
      CTX.arc(px, py, 3, 0, Math.PI * 2);
      CTX.fill();
    }
  }

  // Export game state as module properties
  return {
    boot,
    tick,
    start,
    launchBird,
    checkResult,
    get state() { return state; },
    set state(v) { state = v; },
    get stageNo() { return stageNo; },
    get pigs() { return pigs; },
    set pigs(v) { pigs = v; },
    get blocks() { return blocks; },
    set blocks(v) { blocks = v; },
    get birdsLeft() { return birdsLeft; },
    set birdsLeft(v) { birdsLeft = v; },
    get currentBird() { return currentBird; },
    set currentBird(v) { currentBird = v; },
    get dragging() { return dragging; },
    set dragging(v) { dragging = v; },
    get score() { return score; },
    set score(v) { score = v; },
    get settleFrames() { return settleFrames; },
    set settleFrames(v) { settleFrames = v; }
  };
})();

Game.boot();
