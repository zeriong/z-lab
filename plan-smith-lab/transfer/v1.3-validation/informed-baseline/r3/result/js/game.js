(function() {
  'use strict';

  const C = window.AB.C;
  const { Physics, Render, Input, UI } = window.AB;

  let state = 'MENU';
  let levelIndex = 0;
  let score = 0;
  let queue = [];
  let bird = null;
  let birdPhase = 'READY';
  let abilityUsed = false;
  let settleTimer = 0;
  let shotTimer = 0;
  let nextBirdTimer = null;
  let clearTimer = null;
  let particles = [];
  let blasts = [];
  let progress = { unlocked: 1, stars: {} };
  let acc = 0;
  let lastTs = 0;

  window.AB.Game = {
    init() {
      if (typeof Matter === 'undefined') {
        UI.showError('물리 엔진(Matter.js) 로드 실패 — 인터넷 연결을 확인하세요');
        return;
      }

      const canvas = document.getElementById('game-canvas');
      Render.init(canvas);
      Physics.init();
      Input.attach(canvas, {
        onDragStart: onDragStart,
        onDragMove: onDragMove,
        onDragEnd: onDragEnd,
        onTap: onTap
      });
      UI.init({
        onStart: () => this.selectStage(0),
        onSelect: () => this.setState('SELECT'),
        onStage: (i) => this.selectStage(i),
        onResume: () => this.togglePause(),
        onRestart: () => this.restart(),
        onMain: () => this.setState('MENU'),
        onNext: () => this.selectStage(levelIndex + 1),
        onBack: () => this.setState('MENU')
      });

      try {
        const saved = localStorage.getItem(C.STORAGE_KEY);
        if (saved) progress = JSON.parse(saved);
      } catch (e) {
        progress = { unlocked: 1, stars: {} };
      }

      setupWindowResize();
      this.setState('MENU');
      requestAnimationFrame(loop);
    },

    setState(next) {
      state = next;
      UI.show(state);
    },

    selectStage(i) {
      if (i < progress.unlocked) {
        levelIndex = i;
        this.startLevel(i);
      }
    },

    startLevel(i) {
      Physics.clear();
      Physics.loadLevel(AB.LEVELS[i]);
      Physics.on = {
        onDestroy: (body) => {
          if (body.label === 'pig') {
            score += body.gScore;
          } else {
            score += C.SCORE_BLOCK;
          }
          spawnParticles(body);
          UI.setHUD({ stage: i + 1, score, birdsLeft: queue });
        },
        onDamage: (body, dmg) => {
          particles.push(...createDamageParticles(body, dmg));
        }
      };

      levelIndex = i;
      score = 0;
      queue = AB.LEVELS[i].birds.slice();
      bird = null;
      birdPhase = 'READY';
      abilityUsed = false;
      settleTimer = 0;
      shotTimer = 0;
      nextBirdTimer = 0;
      clearTimer = null;
      particles = [];
      blasts = [];

      spawnBird();
      UI.setHUD({ stage: i + 1, score, birdsLeft: queue });
      this.setState('PLAYING');
    },

    togglePause() {
      if (state === 'PLAYING') {
        this.setState('PAUSED');
      } else if (state === 'PAUSED') {
        acc = 0;
        this.setState('PLAYING');
      }
    },

    restart() {
      this.startLevel(levelIndex);
    }
  };

  function spawnBird() {
    if (queue.length === 0) {
      finishFail();
      return;
    }
    const type = queue.shift();
    bird = Physics.spawnBird(type);
    birdPhase = 'READY';
    abilityUsed = false;
  }

  function onDragStart(x, y) {
    if (state === 'PLAYING' && birdPhase === 'READY' && bird) {
      birdPhase = 'DRAG';
    }
  }

  function onDragMove(x, y) {
    if (birdPhase !== 'DRAG' || !bird) return;
    const dx = x - C.SLING.x;
    const dy = y - C.SLING.y;
    let len = Math.hypot(dx, dy);
    if (len > C.DRAG_MAX) {
      const scale = C.DRAG_MAX / len;
      x = C.SLING.x + dx * scale;
      y = C.SLING.y + dy * scale;
    }
    Matter.Body.setPosition(bird, { x, y });
  }

  function onDragEnd(x, y) {
    if (birdPhase !== 'DRAG' || !bird) return;
    birdPhase = 'READY';

    const dx = x - C.SLING.x;
    const dy = y - C.SLING.y;
    let len = Math.hypot(dx, dy);

    if (len < C.DRAG_MIN) {
      Matter.Body.setPosition(bird, { x: C.SLING.x, y: C.SLING.y });
      return;
    }

    let vx = -dx * C.LAUNCH_K;
    let vy = -dy * C.LAUNCH_K;
    const vlen = Math.hypot(vx, vy);
    if (vlen > C.SPEED_MAX) {
      vx = vx * C.SPEED_MAX / vlen;
      vy = vy * C.SPEED_MAX / vlen;
    }

    Physics.launch(bird, vx, vy);
    birdPhase = 'FLYING';
    shotTimer = 0;
    settleTimer = 0;
  }

  function onTap() {
    if (state !== 'PLAYING' || birdPhase !== 'FLYING' || abilityUsed || !bird) return;

    const type = bird.birdType;
    if (type === 'yellow') {
      let vlen = Math.hypot(bird.velocity.x, bird.velocity.y);
      const scale = Math.min(1, C.DASH_MAX / (vlen * C.DASH_MUL));
      bird.velocity.x *= C.DASH_MUL * scale;
      bird.velocity.y *= C.DASH_MUL * scale;
      abilityUsed = true;
    } else if (type === 'black') {
      Physics.explode(bird.position.x, bird.position.y);
      blasts.push({ x: bird.position.x, y: bird.position.y, r: 0, life: 400 });
      Physics.remove(bird);
      birdPhase = 'DONE';
      abilityUsed = true;
    }
  }

  function tick(dt) {
    if (clearTimer !== null) {
      clearTimer -= dt;
      if (clearTimer <= 0) {
        finishClear();
      }
      return;
    }

    if (birdPhase === 'FLYING') {
      shotTimer += dt;
      if (bird.position.x < -C.OUT_MARGIN || bird.position.x > C.W + C.OUT_MARGIN ||
          bird.position.y > C.H + C.OUT_MARGIN) {
        endTurn();
        return;
      }
      if (Physics.isSettled()) {
        settleTimer += dt;
      } else {
        settleTimer = 0;
      }
      if (settleTimer >= C.SETTLE_MS || shotTimer >= C.SHOT_TIMEOUT_MS) {
        endTurn();
      }
    }

    if (Physics.pigsLeft() === 0 && clearTimer === null) {
      clearTimer = C.CLEAR_DELAY_MS;
    }

    if (nextBirdTimer !== null) {
      nextBirdTimer -= dt;
      if (nextBirdTimer <= 0) {
        nextBirdTimer = null;
        spawnBird();
      }
    }
  }

  function endTurn() {
    Physics.remove(bird);
    birdPhase = 'DONE';
    nextBirdTimer = C.NEXT_BIRD_MS;
  }

  function finishClear() {
    const bonusBirds = queue.length + (birdPhase === 'READY' ? 1 : 0);
    score += bonusBirds * C.SCORE_BIRD_LEFT;
    const stars = (score >= AB.LEVELS[levelIndex].star3) ? 3 : (score >= AB.LEVELS[levelIndex].star2) ? 2 : 1;
    progress.stars[levelIndex + 1] = Math.max(progress.stars[levelIndex + 1] || 0, stars);
    progress.unlocked = Math.min(C.LEVEL_COUNT, Math.max(progress.unlocked, levelIndex + 2));
    try {
      localStorage.setItem(C.STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {}
    UI.setClear({ score, stars, hasNext: levelIndex < 9 });
    AB.Game.setState('CLEAR');
  }

  function finishFail() {
    AB.Game.setState('FAIL');
  }

  function spawnParticles(body) {
    const color = C.MATERIALS[body.label]?.faceColor || '#ccc';
    for (let i = 0; i < 10; i++) {
      const vx = Math.random() * 6 - 3;
      const vy = Math.random() * 5 - 5;
      particles.push({
        x: body.position.x,
        y: body.position.y,
        vx, vy,
        life: 600,
        color,
        type: Math.random() > 0.5 ? 'box' : 'circle'
      });
    }
  }

  function createDamageParticles(body, dmg) {
    const result = [];
    const n = Math.ceil(dmg / 20);
    for (let i = 0; i < n; i++) {
      const vx = Math.random() * 4 - 2;
      const vy = Math.random() * 4 - 5;
      result.push({
        x: body.position.x,
        y: body.position.y,
        vx, vy,
        life: 400,
        color: 'rgba(200,100,100,0.5)',
        type: 'circle'
      });
    }
    return result;
  }

  function updateEffects(dt) {
    particles = particles.filter(p => {
      p.life -= dt;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25;
      return p.life > 0;
    });
    blasts = blasts.filter(b => {
      b.life -= dt;
      b.r = C.BLAST_R * (1 - b.life / 400);
      return b.life > 0;
    });
  }

  function buildView() {
    const trajectory = [];
    if (birdPhase === 'DRAG' && bird) {
      const vx = (C.SLING.x - bird.position.x) * C.LAUNCH_K;
      const vy = (C.SLING.y - bird.position.y) * C.LAUNCH_K;
      let x = bird.position.x, y = bird.position.y;
      for (let i = 1; i <= C.TRAJ_DOTS * C.TRAJ_STEP; i++) {
        let vyi = vy + C.GRAVITY_STEP * i;
        x += vx;
        y += vyi;
        if (y > C.GROUND_Y) break;
        if (i % C.TRAJ_STEP === 0) trajectory.push({ x, y });
      }
    }
    return {
      bodies: Physics.bodies(),
      bird,
      drag: birdPhase === 'DRAG' ? (bird ? { active: true, x: bird.position.x, y: bird.position.y } : null) : null,
      trajectory,
      particles,
      blasts
    };
  }

  function loop(ts) {
    requestAnimationFrame(loop);
    const dt = Math.min(ts - lastTs, C.MAX_FRAME_MS);
    lastTs = ts;

    if (state === 'PLAYING') {
      acc += dt;
      let n = 0;
      while (acc >= C.FIXED_DT && n < C.MAX_SUBSTEPS) {
        Physics.step();
        tick(C.FIXED_DT);
        acc -= C.FIXED_DT;
        n++;
      }
      if (n === C.MAX_SUBSTEPS) acc = 0;
    } else {
      acc = 0;
    }

    updateEffects(dt);
    Render.draw(buildView());
  }

  function setupWindowResize() {
    const app = document.getElementById('app');
    function updateScale() {
      const s = Math.min(window.innerWidth / C.W, window.innerHeight / C.H);
      app.style.transform = 'scale(' + s + ')';
      app.style.left = ((window.innerWidth - C.W * s) / 2) + 'px';
      app.style.top = ((window.innerHeight - C.H * s) / 2) + 'px';
    }
    updateScale();
    window.addEventListener('resize', updateScale);
  }

  window.addEventListener('load', AB.Game.init);
})();
