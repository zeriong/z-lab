(function() {
  'use strict';

  const C = window.AB.C;

  // 내부 상태
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

  const Game = {
    init() {
      canvas = document.getElementById('game-canvas');

      // Matter.js 로드 확인
      if (typeof Matter === 'undefined') {
        window.AB.UI.showError('물리 엔진(Matter.js) 로드 실패 — 인터넷 연결을 확인하세요');
        return;
      }

      // 초기화
      window.AB.Render.init(canvas);
      window.AB.Physics.init();

      // 콜백 등록
      window.AB.Physics.on.onDestroy = onDestroy;
      window.AB.Physics.on.onDamage = onDamage;

      // UI 초기화
      const handlers = {
        onStart: () => Game.startLevel(0),
        onSelect: () => Game.setState('SELECT'),
        onStage: (i) => Game.startLevel(i),
        onResume: () => Game.setState('PLAYING'),
        onRestart: () => Game.startLevel(levelIndex),
        onMain: () => Game.setState('MENU'),
        onNext: () => {
          if (levelIndex < C.LEVEL_COUNT - 1) {
            Game.startLevel(levelIndex + 1);
          }
        },
        onBack: () => Game.setState('MENU')
      };
      window.AB.UI.init(handlers);

      // Input 초기화
      const inputHandlers = {
        onDragStart: (x, y) => {
          if (state === 'PLAYING' && birdPhase === 'READY') {
            birdPhase = 'DRAG';
          }
        },
        onDragMove: (x, y) => {
          if (birdPhase === 'DRAG' && bird) {
            const dx = x - C.SLING.x;
            const dy = y - C.SLING.y;
            let len = Math.hypot(dx, dy);
            if (len > C.DRAG_MAX) {
              len = C.DRAG_MAX;
            }
            const normLen = Math.hypot(dx, dy) || 1;
            const newX = C.SLING.x + (dx / normLen) * len;
            const newY = C.SLING.y + (dy / normLen) * len;
            Matter.Body.setPosition(bird, { x: newX, y: newY });
          }
        },
        onDragEnd: (x, y) => {
          if (birdPhase === 'DRAG' && bird) {
            const dx = x - C.SLING.x;
            const dy = y - C.SLING.y;
            const len = Math.hypot(dx, dy);

            if (len < C.DRAG_MIN) {
              // 취소
              Matter.Body.setPosition(bird, { x: C.SLING.x, y: C.SLING.y });
              birdPhase = 'READY';
            } else {
              // 발사
              const vx = -dx * C.LAUNCH_K;
              const vy = -dy * C.LAUNCH_K;
              const vlen = Math.hypot(vx, vy);
              const vscale = Math.min(1, C.SPEED_MAX / vlen);
              window.AB.Physics.launch(bird, vx * vscale, vy * vscale);
              birdPhase = 'FLYING';
              shotTimer = 0;
              settleTimer = 0;
            }
          }
        },
        onTap: () => {
          if (state === 'PLAYING' && birdPhase === 'FLYING' && !abilityUsed && bird) {
            const birdType = bird.type;
            const birdConfig = C.BIRDS[birdType];
            if (birdConfig.ability === 'dash') {
              // yellow 대시
              const vel = bird.velocity;
              const len = Math.hypot(vel.x, vel.y);
              if (len > 0) {
                const newVel = {
                  x: (vel.x / len) * Math.min(C.DASH_MAX, len * C.DASH_MUL),
                  y: (vel.y / len) * Math.min(C.DASH_MAX, len * C.DASH_MUL)
                };
                Matter.Body.setVelocity(bird, newVel);
              }
              abilityUsed = true;
            } else if (birdConfig.ability === 'blast') {
              // black 폭발
              window.AB.Physics.explode(bird.position.x, bird.position.y);
              spawnExplosionBlast(bird.position.x, bird.position.y);
              window.AB.Physics.remove(bird);
              abilityUsed = true;
            }
          }
        }
      };
      window.AB.Input.attach(canvas, inputHandlers);

      // 진행 상황 로드
      loadProgress();

      // 배율 설정
      updateScale();
      window.addEventListener('resize', updateScale);

      // 상태 설정 및 루프 시작
      Game.setState('MENU');
      lastTs = performance.now();
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
      const level = window.AB.LEVELS[i];

      window.AB.Physics.clear();
      window.AB.Physics.loadLevel(level);

      score = 0;
      queue = [...level.birds];
      bird = null;
      birdPhase = 'READY';
      abilityUsed = false;
      settleTimer = 0;
      shotTimer = 0;
      nextBirdTimer = null;
      clearTimer = null;
      particles = [];
      blasts = [];
      acc = 0;

      spawnNextBird();
      window.AB.UI.setHUD({
        stage: levelIndex + 1,
        score: score,
        birdsLeft: queue
      });

      Game.setState('PLAYING');
    },

    startLevelByIndex(i) {
      Game.startLevel(i);
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
      if (state === 'PLAYING' || state === 'PAUSED' || state === 'FAIL' || state === 'CLEAR') {
        Game.startLevel(levelIndex);
      }
    }
  };

  function loop(ts) {
    requestAnimationFrame(loop);

    const dt = Math.min(ts - lastTs, C.MAX_FRAME_MS);
    lastTs = ts;

    if (state === 'PLAYING') {
      acc += dt;
      let n = 0;
      while (acc >= C.FIXED_DT && n < C.MAX_SUBSTEPS) {
        window.AB.Physics.step();
        tick(C.FIXED_DT);
        acc -= C.FIXED_DT;
        n++;
      }
      if (n === C.MAX_SUBSTEPS) {
        acc = 0;
      }
    } else {
      acc = 0;
    }

    updateEffects(dt);
    render();
  }

  function tick(dt) {
    // 클리어 판정
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

    if (birdPhase === 'FLYING' && bird) {
      shotTimer += dt;

      // 화면 밖 판정
      const outMargin = C.OUT_MARGIN;
      if (bird.position.x < -outMargin ||
          bird.position.x > C.W + outMargin ||
          bird.position.y > C.H + outMargin) {
        endTurn();
        return;
      }

      // 정지 판정
      if (window.AB.Physics.isSettled()) {
        settleTimer += dt;
      } else {
        settleTimer = 0;
      }

      if (settleTimer >= C.SETTLE_MS || shotTimer >= C.SHOT_TIMEOUT_MS) {
        endTurn();
        return;
      }
    }

    // 다음 새
    if (nextBirdTimer !== null) {
      nextBirdTimer -= dt;
      if (nextBirdTimer <= 0) {
        if (queue.length > 0) {
          spawnNextBird();
        } else {
          finishFail();
        }
      }
    }
  }

  function endTurn() {
    if (bird) {
      window.AB.Physics.remove(bird);
    }
    bird = null;
    birdPhase = 'DONE';
    nextBirdTimer = C.NEXT_BIRD_MS;
  }

  function spawnNextBird() {
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

    nextBirdTimer = null;
  }

  function finishClear() {
    const birdsBonus = queue.length + (birdPhase === 'READY' ? 1 : 0);
    score += birdsBonus * C.SCORE_BIRD_LEFT;

    const levelId = levelIndex + 1;
    const stars = score >= C.LEVELS[levelIndex].star3 ? 3 :
                  score >= C.LEVELS[levelIndex].star2 ? 2 : 1;

    if (!progress.stars) progress.stars = {};
    progress.stars[levelId] = Math.max(progress.stars[levelId] || 0, stars);
    progress.unlocked = Math.min(C.LEVEL_COUNT, Math.max(progress.unlocked, levelIndex + 2));

    saveProgress();

    window.AB.UI.setClear({
      score: score,
      stars: stars,
      hasNext: levelIndex < C.LEVEL_COUNT - 1
    });

    Game.setState('CLEAR');
  }

  function finishFail() {
    Game.setState('FAIL');
  }

  function onDestroy(body) {
    if (body.label === 'pig' || body.label === 'wood' || body.label === 'ice' || body.label === 'stone') {
      score += body.gScore || C.SCORE_BLOCK;
      spawnParticles(body);

      window.AB.UI.setHUD({
        stage: levelIndex + 1,
        score: score,
        birdsLeft: queue
      });
    }
  }

  function onDamage(body, dmg) {
    // 렌더링 흔들림/파편 (비시각적이므로 별도 처리 불필요)
  }

  function spawnParticles(body) {
    const color = C.MATERIALS[body.label]?.faceColor || '#999';
    const count = 10;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: body.position.x,
        y: body.position.y,
        vx: Math.random() * 6 - 3,
        vy: Math.random() * 5 - 5,
        life: 600,
        color: color
      });
    }
  }

  function spawnExplosionBlast(x, y) {
    blasts.push({
      x: x,
      y: y,
      r: 0,
      life: 400
    });
  }

  function updateEffects(dt) {
    // 파티클 갱신
    particles = particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25;
      p.life -= dt;
      return p.life > 0;
    });

    // 폭발 원 갱신
    blasts = blasts.filter(b => {
      b.r = (1 - b.life / 400) * C.BLAST_R;
      b.life -= dt;
      return b.life > 0;
    });
  }

  function render() {
    const trajectory = [];
    if (state === 'PLAYING' && birdPhase === 'DRAG' && bird) {
      // 궤적 계산
      const vx = (C.SLING.x - bird.position.x) * C.LAUNCH_K;
      const vy = (C.SLING.y - bird.position.y) * C.LAUNCH_K;

      let px = bird.position.x;
      let py = bird.position.y;
      let pvx = vx;
      let pvy = vy;

      for (let i = 1; i <= C.TRAJ_DOTS * C.TRAJ_STEP; i++) {
        pvy += C.GRAVITY_STEP;
        px += pvx;
        py += pvy;

        if (i % C.TRAJ_STEP === 0) {
          trajectory.push({ x: px, y: py });
        }

        if (py > C.GROUND_Y) break;
      }
    }

    const view = {
      bodies: window.AB.Physics.bodies(),
      bird: bird,
      drag: (state === 'PLAYING' && birdPhase === 'DRAG') ? { active: true, x: bird.position.x, y: bird.position.y } : null,
      trajectory: trajectory,
      particles: particles,
      blasts: blasts
    };

    window.AB.Render.draw(view);
  }

  function loadProgress() {
    try {
      const data = localStorage.getItem(C.STORAGE_KEY);
      if (data) {
        progress = JSON.parse(data);
      }
    } catch (e) {
      progress = { unlocked: 1, stars: {} };
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(C.STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      // 오류 무시, 메모리 사용 중
    }
  }

  function updateScale() {
    const app = document.getElementById('app');
    if (!app) return;

    const s = Math.min(innerWidth / 1280, innerHeight / 720);
    app.style.transform = `scale(${s})`;
    app.style.left = (innerWidth - 1280 * s) / 2 + 'px';
    app.style.top = (innerHeight - 720 * s) / 2 + 'px';
  }

  window.AB = window.AB || {};
  window.AB.Game = Game;
})();

window.addEventListener('load', window.AB.Game.init);
