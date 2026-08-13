const Game = (() => {
  let state = 'MENU';
  let stageNo = 0;
  let pigs = [];
  let blocks = [];
  let birdsLeft = 0;
  let currentBird = null;
  let dragging = false;
  let score = 0;
  let settleFrames = 0;
  let settleStartTime = 0;

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  const ANCHOR_X = 200;
  const ANCHOR_Y = 540;
  const MAX_DRAG = 120;
  const SLINGSHOT_RADIUS = 40;
  const SETTLE_TIMEOUT = 6000;
  const WORLD_WIDTH = 1280;
  const WORLD_HEIGHT = 720;
  const GROUND_Y = 640;

  let particles = [];

  class Particle {
    constructor(x, y, vx, vy, color) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.color = color;
      this.life = 0.6;
      this.maxLife = 0.6;
    }

    update(dt) {
      this.life -= dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vy += 0.98 * dt;
    }

    draw(ctx) {
      const alpha = this.life / this.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x - 4, this.y - 4, 8, 8);
      ctx.globalAlpha = 1;
    }
  }

  function createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const speed = 200 + Math.random() * 100;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      particles.push(new Particle(x, y, vx, vy, color));
    }
  }

  function boot() {
    if (typeof Matter === 'undefined') {
      document.getElementById('load-banner').style.display = 'flex';
      return;
    }

    Physics.createWorld();
    UI.init();
    UI.show('menu');
    state = 'MENU';

    requestAnimationFrame(tick);
  }

  function start(n) {
    stageNo = n;
    state = 'PLAYING';
    score = 0;
    settleFrames = 0;
    settleStartTime = Date.now();
    particles = [];

    UI.hide('menu');
    UI.hide('select');
    UI.hide('clear');
    UI.hide('fail');
    UI.hide('pause');

    const stage = STAGES[n - 1];
    const result = Physics.loadStage(stage);
    pigs = result.pigs;
    blocks = result.blocks;
    birdsLeft = stage.birds;

    currentBird = { x: ANCHOR_X, y: ANCHOR_Y };
    dragging = false;

    UI.setHud(score, birdsLeft);

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
  }

  function onPointerDown(e) {
    if (state !== 'PLAYING' || !currentBird) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (WORLD_WIDTH / rect.width);
    const y = (e.clientY - rect.top) * (WORLD_HEIGHT / rect.height);

    const dx = x - ANCHOR_X;
    const dy = y - ANCHOR_Y;
    const dist = Math.hypot(dx, dy);

    if (dist < SLINGSHOT_RADIUS) {
      dragging = true;
    }
  }

  function onPointerMove(e) {
    if (!dragging || !currentBird) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (WORLD_WIDTH / rect.width);
    const y = (e.clientY - rect.top) * (WORLD_HEIGHT / rect.height);

    const dx = x - ANCHOR_X;
    const dy = y - ANCHOR_Y;
    const dist = Math.hypot(dx, dy);

    if (dist > MAX_DRAG) {
      const scale = MAX_DRAG / dist;
      currentBird.x = ANCHOR_X + dx * scale;
      currentBird.y = ANCHOR_Y + dy * scale;
    } else {
      currentBird.x = x;
      currentBird.y = y;
    }
  }

  function onPointerUp(e) {
    if (!dragging || !currentBird) return;

    dragging = false;

    const dx = ANCHOR_X - currentBird.x;
    const dy = ANCHOR_Y - currentBird.y;
    const vx = dx * Physics.LAUNCH_K;
    const vy = dy * Physics.LAUNCH_K;

    Physics.spawnBirdBody(ANCHOR_X, ANCHOR_Y, vx, vy);
    Sound.play('launch');

    birdsLeft--;
    currentBird = null;
    settleFrames = 0;
    settleStartTime = Date.now();

    UI.setHud(score, birdsLeft);
  }

  function launchBird() {
    if (state !== 'PLAYING' || !currentBird || birdsLeft <= 0) return;
    if (!dragging) return;

    const dx = ANCHOR_X - currentBird.x;
    const dy = ANCHOR_Y - currentBird.y;
    const vx = dx * Physics.LAUNCH_K;
    const vy = dy * Physics.LAUNCH_K;

    Physics.spawnBirdBody(ANCHOR_X, ANCHOR_Y, vx, vy);
    Sound.play('launch');

    birdsLeft--;
    currentBird = null;
    settleFrames = 0;
    settleStartTime = Date.now();

    UI.setHud(score, birdsLeft);
  }

  function checkResult() {
    if (state !== 'PLAYING') return;

    const livePigs = pigs.filter(p => !p.plugin.dead);
    const liveBlocks = blocks.filter(b => !b.plugin.dead);

    if (livePigs.length === 0) {
      state = 'CLEAR';
      const maxScore = pigs.length * 5000 + blocks.length * 500 + (STAGES[stageNo - 1].birds - 1) * 10000;
      let stars = 1;

      if (score >= Math.round(maxScore * 0.7 / 500) * 500) {
        stars = 3;
      } else if (score >= Math.round(maxScore * 0.5 / 500) * 500) {
        stars = 2;
      }

      const progress = Store.load();
      progress.unlocked = Math.max(progress.unlocked, stageNo + 1);
      progress.stars[stageNo] = Math.max(progress.stars[stageNo] || 0, stars);
      Store.save(progress);

      document.getElementById('clear-score').textContent = score;
      document.getElementById('clear-stars').textContent = '★'.repeat(stars);

      if (stageNo === 10) {
        document.getElementById('btn-next').style.display = 'none';
        document.getElementById('btn-clear-home').textContent = '메인으로';
      } else {
        document.getElementById('btn-next').style.display = 'block';
      }

      UI.show('clear');

      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);

      return;
    }

    if (birdsLeft === 0 && Physics.isSettled() && livePigs.length > 0) {
      state = 'FAIL';
      UI.show('fail');

      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);

      return;
    }

    if (currentBird === null && birdsLeft > 0) {
      if (Physics.isSettled()) {
        settleFrames++;
        if (settleFrames >= 45) {
          currentBird = { x: ANCHOR_X, y: ANCHOR_Y };
          settleFrames = 0;
        }
      } else {
        settleFrames = 0;
      }
    }

    if (currentBird === null && birdsLeft > 0) {
      const elapsed = Date.now() - settleStartTime;
      if (elapsed > SETTLE_TIMEOUT) {
        currentBird = { x: ANCHOR_X, y: ANCHOR_Y };
        settleFrames = 0;
      }
    }
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    ctx.fillStyle = '#90EE90';
    ctx.beginPath();
    ctx.ellipse(300, GROUND_Y - 80, 200, 100, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#7BC67B';
    ctx.beginPath();
    ctx.ellipse(1000, GROUND_Y - 100, 250, 120, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8B7355';
    ctx.fillRect(0, GROUND_Y, WORLD_WIDTH, WORLD_HEIGHT - GROUND_Y);
  }

  function drawGround() {
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(0, GROUND_Y, WORLD_WIDTH, WORLD_HEIGHT - GROUND_Y);
  }

  function drawSlingshot() {
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(ANCHOR_X - 15, ANCHOR_Y - 80);
    ctx.lineTo(ANCHOR_X - 15, ANCHOR_Y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(ANCHOR_X + 15, ANCHOR_Y - 80);
    ctx.lineTo(ANCHOR_X + 15, ANCHOR_Y);
    ctx.stroke();

    ctx.fillStyle = '#8B4513';
    ctx.fillRect(ANCHOR_X - 25, ANCHOR_Y - 90, 50, 15);

    if (currentBird) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ANCHOR_X - 15, ANCHOR_Y);
      ctx.lineTo(currentBird.x, currentBird.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(ANCHOR_X + 15, ANCHOR_Y);
      ctx.lineTo(currentBird.x, currentBird.y);
      ctx.stroke();
    }
  }

  function drawBodies() {
    const allBodies = Composite.allBodies(Physics.engine.world);

    for (const body of allBodies) {
      if (body.plugin.kind === 'block') {
        if (body.plugin.dead) continue;

        const { w, h, color } = body.plugin;
        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);
        ctx.fillStyle = color;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-w / 2, -h / 2, w, h);
        ctx.restore();
      } else if (body.plugin.kind === 'pig') {
        if (body.plugin.dead) continue;

        ctx.fillStyle = body.plugin.color;
        ctx.beginPath();
        ctx.arc(body.position.x, body.position.y, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(body.position.x - 8, body.position.y - 5, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(body.position.x + 8, body.position.y - 5, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (body.plugin.kind === 'bird') {
        ctx.fillStyle = '#FF6B6B';
        ctx.beginPath();
        ctx.arc(body.position.x, body.position.y, Physics.BIRD_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(body.position.x + 10, body.position.y + 5, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawTrajectory() {
    if (!currentBird || !dragging) return;

    const dx = ANCHOR_X - currentBird.x;
    const dy = ANCHOR_Y - currentBird.y;
    const vx = dx * Physics.LAUNCH_K;
    const vy = dy * Physics.LAUNCH_K;

    let x = ANCHOR_X;
    let y = ANCHOR_Y;
    let velX = vx;
    let velY = vy;

    ctx.fillStyle = 'rgba(100, 100, 100, 0.6)';

    for (let i = 0; i < 18; i++) {
      for (let step = 0; step < 3; step++) {
        velY += Physics.PREVIEW_G;
        x += velX;
        y += velY;
      }

      if (x > -200 && x < 1480 && y < 920) {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawTrail() {
    const allBodies = Composite.allBodies(Physics.engine.world);

    for (const body of allBodies) {
      if (body.plugin.kind === 'bird') {
        if (!body.plugin.trail) {
          body.plugin.trail = [];
        }

        body.plugin.trail.push({
          x: body.position.x,
          y: body.position.y,
          age: 0
        });

        if (body.plugin.trail.length > 30) {
          body.plugin.trail.shift();
        }

        for (const point of body.plugin.trail) {
          point.age += 1;
          const alpha = Math.max(0, 1 - point.age / 30);
          ctx.fillStyle = `rgba(200, 200, 200, ${alpha * 0.3})`;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function render() {
    drawBackground();
    drawGround();
    drawBodies();
    drawTrail();
    drawTrajectory();
    drawSlingshot();

    for (const particle of particles) {
      particle.draw(ctx);
    }
  }

  function tick() {
    const dt = 1 / 60;

    if (state === 'PLAYING') {
      Physics.step();

      const allBodies = Composite.allBodies(Physics.engine.world);
      for (const body of allBodies) {
        if (body.plugin.kind === 'block' && body.plugin.dead && !body.plugin.processed) {
          createParticles(body.position.x, body.position.y, body.plugin.color);
          score += 500;
          body.plugin.processed = true;
          UI.setHud(score, birdsLeft);
        }
        if (body.plugin.kind === 'pig' && body.plugin.dead && !body.plugin.processed) {
          createParticles(body.position.x, body.position.y, body.plugin.color);
          score += 5000;
          pigs = pigs.filter(p => p !== body);
          body.plugin.processed = true;
          UI.setHud(score, birdsLeft);
        }
      }

      checkResult();
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update(dt);
      if (particles[i].life <= 0) {
        particles.splice(i, 1);
      }
    }

    render();

    requestAnimationFrame(tick);
  }

  return {
    boot,
    start,
    launchBird,
    checkResult,
    tick,
    get state() { return state; },
    set state(v) { state = v; },
    get stageNo() { return stageNo; },
    get pigs() { return pigs; },
    get blocks() { return blocks; },
    get birdsLeft() { return birdsLeft; },
    get currentBird() { return currentBird; },
    get dragging() { return dragging; },
    get score() { return score; }
  };
})();

Game.boot();
