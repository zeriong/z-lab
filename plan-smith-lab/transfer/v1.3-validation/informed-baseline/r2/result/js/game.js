(function() {
  const C = window.AB.C;

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
  let canvas = null;
  let trajectory = [];

  const Game = {
    init() {
      if (typeof Matter === 'undefined') {
        window.AB.UI.showError('물리 엔진(Matter.js) 로드 실패 — 인터넷 연결을 확인하세요');
        return;
      }

      canvas = document.getElementById('game-canvas');
      window.AB.Render.init(canvas);
      window.AB.Physics.init();
      window.AB.Physics.on.onDestroy = onDestroy;
      window.AB.Physics.on.onDamage = onDamage;

      window.AB.UI.init({
        onStart: () => Game.startLevel(0),
        onSelect: () => Game.setState('SELECT'),
        onBack: () => Game.setState('MENU'),
        onResume: () => Game.setState('PLAYING'),
        onRestart: () => Game.startLevel(levelIndex),
        onMain: () => Game.setState('MENU'),
        onNext: () => Game.startLevel(levelIndex + 1),
        togglePause: () => Game.togglePause()
      });

      const inputHandlers = {
        onDragStart: (x, y) => {
          if (state === 'PLAYING' && birdPhase === 'READY') {
            birdPhase = 'DRAG';
            window.AB.Physics.launch(bird, 0, 0);
          }
        },
        onDragMove: (x, y) => {
          if (birdPhase === 'DRAG') {
            const dx = x - C.SLING.x;
            const dy = y - C.SLING.y;
            let len = Math.hypot(dx, dy);
            if (len > C.DRAG_MAX) {
              const scale = C.DRAG_MAX / len;
              len = C.DRAG_MAX;
              bird.position.x = C.SLING.x + dx * scale;
              bird.position.y = C.SLING.y + dy * scale;
            } else {
              bird.position.x = x;
              bird.position.y = y;
            }
            Matter.Body.setPosition(bird, bird.position);
            updateTrajectory();
          }
        },
        onDragEnd: (x, y) => {
          if (birdPhase === 'DRAG') {
            const dx = x - C.SLING.x;
            const dy = y - C.SLING.y;
            let len = Math.hypot(dx, dy);
            if (len < C.DRAG_MIN) {
              birdPhase = 'READY';
              Matter.Body.setPosition(bird, { x: C.SLING.x, y: C.SLING.y });
              trajectory = [];
            } else {
              if (len > C.DRAG_MAX) {
                const scale = C.DRAG_MAX / len;
                len = C.DRAG_MAX;
              }
              let vx = -dx * C.LAUNCH_K;
              let vy = -dy * C.LAUNCH_K;
              const vlen = Math.hypot(vx, vy);
              if (vlen > C.SPEED_MAX) {
                vx = (vx / vlen) * C.SPEED_MAX;
                vy = (vy / vlen) * C.SPEED_MAX;
              }
              window.AB.Physics.launch(bird, vx, vy);
              birdPhase = 'FLYING';
              shotTimer = 0;
              settleTimer = 0;
              trajectory = [];
            }
          }
        },
        onTap: () => {
          if (state === 'PLAYING' && birdPhase === 'FLYING' && !abilityUsed) {
            abilityUsed = true;
            const birdType = bird.birdType;
            if (birdType === 'yellow') {
              let vx = bird.velocity.x * C.DASH_MUL;
              let vy = bird.velocity.y * C.DASH_MUL;
              const len = Math.hypot(vx, vy);
              if (len > C.DASH_MAX) {
                vx = (vx / len) * C.DASH_MAX;
                vy = (vy / len) * C.DASH_MAX;
              }
              Matter.Body.setVelocity(bird, { x: vx, y: vy });
            } else if (birdType === 'black') {
              blasts.push({
                x: bird.position.x,
                y: bird.position.y,
                r: 0,
                life: 400
              });
              window.AB.Physics.explode(bird.position.x, bird.position.y);
              window.AB.Physics.remove(bird);
              birdPhase = 'DONE';
              endTurn();
            }
          }
        }
      };

      window.AB.Input.attach(canvas, inputHandlers);

      loadProgress();
      Game.setState('MENU');
      window.AB.UI.renderStageGrid(progress);

      window.addEventListener('resize', updateScale);
      updateScale();

      requestAnimationFrame(loop);
    },

    setState(newState) {
      state = newState;
      window.AB.UI.show(state);

      if (state === 'SELECT') {
        window.AB.UI.renderStageGrid(progress);
      }
    },

    startLevel(i) {
      levelIndex = i;
      score = 0;
      queue = [...window.AB.LEVELS[i].birds];
      birdPhase = 'READY';
      abilityUsed = false;
      settleTimer = 0;
      shotTimer = 0;
      nextBirdTimer = null;
      clearTimer = null;
      particles = [];
      blasts = [];
      trajectory = [];
      bird = null;

      window.AB.Physics.clear();
      window.AB.Physics.loadLevel(window.AB.LEVELS[i]);

      spawnBird();
      window.AB.UI.setHUD({
        stage: levelIndex + 1,
        score: score,
        birdsLeft: queue
      });
      Game.setState('PLAYING');
    },

    togglePause() {
      if (state === 'PLAYING') {
        Game.setState('PAUSED');
      } else if (state === 'PAUSED') {
        acc = 0;
        Game.setState('PLAYING');
      }
    },

    restart() {
      Game.startLevel(levelIndex);
    }
  };

  function spawnBird() {
    if (queue.length === 0) {
      finishFail();
      return;
    }
    const type = queue.shift();
    bird = window.AB.Physics.spawnBird(type);
    birdPhase = 'READY';
    abilityUsed = false;
    window.AB.UI.setHUD({
      stage: levelIndex + 1,
      score: score,
      birdsLeft: queue
    });
  }

  function endTurn() {
    if (bird && !bird.dead) {
      window.AB.Physics.remove(bird);
    }
    bird = null;
    birdPhase = 'DONE';
    nextBirdTimer = C.NEXT_BIRD_MS;
  }

  function finishClear() {
    const remaining = queue.length + (birdPhase === 'READY' ? 1 : 0);
    score += remaining * C.SCORE_BIRD_LEFT;
    const stars = score >= window.AB.LEVELS[levelIndex].star3 ? 3 :
                  score >= window.AB.LEVELS[levelIndex].star2 ? 2 : 1;
    progress.stars[levelIndex + 1] = Math.max(progress.stars[levelIndex + 1] || 0, stars);
    progress.unlocked = Math.min(C.LEVEL_COUNT, Math.max(progress.unlocked, levelIndex + 2));

    try {
      localStorage.setItem(C.STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
    }

    window.AB.UI.setClear({
      score: score,
      stars: stars,
      hasNext: levelIndex < 9
    });
    Game.setState('CLEAR');
  }

  function finishFail() {
    Game.setState('FAIL');
  }

  function updateTrajectory() {
    trajectory = [];
    if (!bird || birdPhase !== 'DRAG') return;

    let vx = (C.SLING.x - bird.position.x) * C.LAUNCH_K;
    let vy = (C.SLING.y - bird.position.y) * C.LAUNCH_K;
    const vlen = Math.hypot(vx, vy);
    if (vlen > C.SPEED_MAX) {
      vx = (vx / vlen) * C.SPEED_MAX;
      vy = (vy / vlen) * C.SPEED_MAX;
    }

    let x = bird.position.x;
    let y = bird.position.y;

    for (let i = 1; i <= C.TRAJ_DOTS * C.TRAJ_STEP; i++) {
      vy += C.GRAVITY_STEP;
      x += vx;
      y += vy;
      if (i % C.TRAJ_STEP === 0) {
        trajectory.push({ x, y });
      }
      if (y > C.GROUND_Y) break;
    }
  }

  function tick(dt) {
    // Clears
    if (window.AB.Physics.pigsLeft() === 0 && clearTimer === null) {
      clearTimer = C.CLEAR_DELAY_MS;
    }

    if (clearTimer !== null) {
      clearTimer -= dt;
      if (clearTimer <= 0) {
        finishClear();
        return;
      }
    }

    if (birdPhase === 'FLYING') {
      shotTimer += dt;
      const pos = bird.position;
      if (pos.x < -C.OUT_MARGIN || pos.x > C.W + C.OUT_MARGIN || pos.y > C.H + C.OUT_MARGIN) {
        endTurn();
      } else {
        if (window.AB.Physics.isSettled()) {
          settleTimer += dt;
        } else {
          settleTimer = 0;
        }
        if (settleTimer >= C.SETTLE_MS || shotTimer >= C.SHOT_TIMEOUT_MS) {
          endTurn();
        }
      }
    }

    if (birdPhase === 'DONE') {
      if (nextBirdTimer !== null) {
        nextBirdTimer -= dt;
        if (nextBirdTimer <= 0) {
          spawnBird();
        }
      }
    }
  }

  function updateEffects(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.vy += 0.25;
      p.x += p.vx;
      p.y += p.vy;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
    for (let i = blasts.length - 1; i >= 0; i--) {
      const b = blasts[i];
      b.life -= dt;
      b.r += C.BLAST_R / 400 * dt;
      if (b.life <= 0) {
        blasts.splice(i, 1);
      }
    }
  }

  function onDestroy(body) {
    spawnParticles(body);
    score += body.gScore || 0;
    window.AB.UI.setHUD({
      stage: levelIndex + 1,
      score: score,
      birdsLeft: queue
    });
  }

  function onDamage(body, dmg) {
  }

  function spawnParticles(body) {
    const colors = {
      wood: '#c98b44',
      ice: '#9fd8ee',
      stone: '#9aa0a6',
      pig: '#7ac943'
    };
    const color = colors[body.label] || '#999';

    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      particles.push({
        x: body.position.x,
        y: body.position.y,
        vx: Math.cos(angle) * speed - 3 + Math.random() * 6,
        vy: Math.sin(angle) * speed - 5,
        life: 600,
        color: color,
        shape: Math.random() > 0.5 ? 'rect' : 'circle'
      });
    }
  }

  function buildView() {
    const view = {
      bodies: window.AB.Physics.bodies(),
      bird: bird,
      drag: null,
      trajectory: trajectory,
      particles: particles,
      blasts: blasts
    };

    if (birdPhase === 'DRAG' && bird) {
      view.drag = {
        active: true,
        x: bird.position.x,
        y: bird.position.y
      };
    }

    return view;
  }

  function loop(ts) {
    requestAnimationFrame(loop);

    if (lastTs === 0) lastTs = ts;
    let dt = Math.min(ts - lastTs, C.MAX_FRAME_MS);
    lastTs = ts;

    if (state === 'PLAYING') {
      acc += dt;
      let steps = 0;
      while (acc >= C.FIXED_DT && steps < C.MAX_SUBSTEPS) {
        window.AB.Physics.step();
        tick(C.FIXED_DT);
        acc -= C.FIXED_DT;
        steps++;
      }
      if (steps === C.MAX_SUBSTEPS) {
        acc = 0;
      }
    } else {
      acc = 0;
    }

    updateEffects(dt);
    const view = buildView();
    window.AB.Render.draw(view);
  }

  function loadProgress() {
    try {
      const saved = localStorage.getItem(C.STORAGE_KEY);
      if (saved) {
        progress = JSON.parse(saved);
      }
    } catch (e) {
      progress = { unlocked: 1, stars: {} };
    }
  }

  function updateScale() {
    const app = document.getElementById('app');
    const s = Math.min(window.innerWidth / C.W, window.innerHeight / C.H);
    app.style.transform = 'scale(' + s + ')';
    app.style.left = ((window.innerWidth - C.W * s) / 2) + 'px';
    app.style.top = ((window.innerHeight - C.H * s) / 2) + 'px';
  }

  window.AB.Game = Game;
})();

window.addEventListener('load', window.AB.Game.init);
