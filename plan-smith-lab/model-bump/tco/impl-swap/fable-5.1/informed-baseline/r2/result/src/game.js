// game.js — §6 상태 머신 + 샷 수명주기 + 점수/저장
// 참조 전역: U, C, MAT, BIRD, P, SB, STAGES, SFX
(function () {
  'use strict';

  var game = null;

  // ---------- 저장 (§13.3) ----------

  function defaultSave() {
    return { v: 1, unlocked: 1, stars: {}, best: {} };
  }

  function loadSave() {
    try {
      var raw = window.localStorage.getItem(C.SAVE_KEY);
      if (!raw) return defaultSave();
      var obj = JSON.parse(raw);
      if (!obj || obj.v !== 1) return defaultSave();
      var s = defaultSave();
      s.unlocked = U.clamp(parseInt(obj.unlocked, 10) || 1, 1, 10);
      s.stars = (obj.stars && typeof obj.stars === 'object') ? obj.stars : {};
      s.best = (obj.best && typeof obj.best === 'object') ? obj.best : {};
      return s;
    } catch (e) {
      return defaultSave();
    }
  }

  function writeSave() {
    try {
      window.localStorage.setItem(C.SAVE_KEY, JSON.stringify(game.save));
    } catch (e) {
      // 저장 실패는 무시
    }
  }

  // ---------- 보조 ----------

  function emitState() {
    if (game.onState) game.onState(game.state, game);
  }

  function anchor() {
    return { x: C.SLING_X, y: C.SLING_Y };
  }

  function launchVelocity(bx, by) {
    var vx = (C.SLING_X - bx) * C.LAUNCH_POWER;
    var vy = (C.SLING_Y - by) * C.LAUNCH_POWER;
    var sp = Math.sqrt(vx * vx + vy * vy);
    if (sp > C.MAX_LAUNCH_SPEED) {
      vx = vx / sp * C.MAX_LAUNCH_SPEED;
      vy = vy / sp * C.MAX_LAUNCH_SPEED;
    }
    return { vx: vx, vy: vy };
  }

  function countPigs() {
    var n = 0;
    if (!game.world) return 0;
    var bodies = game.world.bodies;
    for (var i = 0; i < bodies.length; i++) {
      if (bodies[i].kind === 'pig' && !bodies[i].dead) n++;
    }
    return n;
  }

  function allDynamicSleeping() {
    var bodies = game.world.bodies;
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (b.isStatic || b.dead) continue;
      if (!b.sleeping) return false;
    }
    return true;
  }

  function spawnParticles(x, y, count, color) {
    for (var i = 0; i < count; i++) {
      var ang = Math.random() * Math.PI * 2;
      var sp = 120 + Math.random() * 200;
      game.particles.push({
        x: x, y: y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 0.7, maxLife: 0.7,
        color: color,
        size: 4 + Math.random() * 4
      });
    }
  }

  function updateParticles(dt) {
    var ps = game.particles;
    for (var i = ps.length - 1; i >= 0; i--) {
      var p = ps[i];
      p.vy += C.GRAVITY * 0.5 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) ps.splice(i, 1);
    }
  }

  function onBodyDestroyed(b) {
    if (b.kind === 'pig') {
      game.score += C.SCORE_PIG;
      spawnParticles(b.x, b.y, 8, '#7fc855');
    } else if (b.kind === 'block') {
      var m = MAT[b.mat];
      game.score += m ? m.score : 0;
      spawnParticles(b.x, b.y, 10, m ? m.color : '#c98b4b');
    }
    SFX.play('break');
  }

  function drainEvents() {
    var evs = game.world.events;
    for (var i = 0; i < evs.length; i++) {
      var ev = evs[i];
      if (ev.type === 'hit') {
        if (game.hitSfxCooldown <= 0) {
          SFX.play('hit');
          game.hitSfxCooldown = 0.08;
        }
      } else if (ev.type === 'break') {
        onBodyDestroyed(ev.body);
      }
    }
    evs.length = 0;
  }

  function removeBirdBody() {
    if (!game.bird || !game.world) { game.bird = null; return; }
    var bodies = game.world.bodies;
    var idx = bodies.indexOf(game.bird);
    if (idx >= 0) bodies.splice(idx, 1);
    game.bird = null;
  }

  function armNext() {
    game.birdType = game.birdQueue.shift() || null;
    game.birdPos = anchor();
    game.bird = null;
    game.shot = 'ARMED';
    game.abilityUsed = false;
    game.flyTime = 0;
    game.settleTimer = 0;
    game.blackHitTimer = 0;
  }

  function enterSettling() {
    game.shot = 'SETTLING';
    game.settleTimer = 0;
  }

  function calcStars(score) {
    var stars = 1;
    if (score >= game.maxScore * 0.5) stars = 2;
    if (score >= game.maxScore * 0.75) stars = 3;
    return stars;
  }

  function doClear() {
    var left = game.birdQueue.length;
    game.score += left * C.SCORE_BIRD_LEFT;
    var stars = calcStars(game.score);
    game.resultStars = stars;

    var s = game.save;
    s.unlocked = Math.min(10, Math.max(s.unlocked, game.stageId + 1));
    var prevStars = s.stars[game.stageId] || 0;
    if (stars > prevStars) s.stars[game.stageId] = stars;
    var prevBest = s.best[game.stageId] || 0;
    if (game.score > prevBest) s.best[game.stageId] = game.score;
    writeSave();

    game.state = 'CLEAR';
    SFX.play('win');
    emitState();
  }

  function doFail() {
    game.state = 'FAIL';
    SFX.play('lose');
    emitState();
  }

  // ---------- 폭발 (§10.2) ----------

  function explode() {
    var bird = game.bird;
    if (!bird) return;
    var cx = bird.x, cy = bird.y;
    var hit = P.queryRadius(game.world, cx, cy, C.EXPLODE_R);
    for (var i = 0; i < hit.length; i++) {
      var b = hit[i];
      if (b === bird || b.isStatic || b.dead) continue;
      var d = U.dist(cx, cy, b.x, b.y);
      var f = 1 - d / C.EXPLODE_R;
      if (f < 0) continue;
      var nx = 0, ny = -1;
      if (d > 0) { nx = (b.x - cx) / d; ny = (b.y - cy) / d; }
      b.sleeping = false;
      b.sleepTimer = 0;
      b.vx += nx * C.EXPLODE_IMPULSE * f * b.invMass;
      b.vy += ny * C.EXPLODE_IMPULSE * f * b.invMass;
      if (b.hp !== Infinity) {
        b.hp -= C.EXPLODE_DMG * f;
        if (b.hp <= 0) {
          b.dead = true;   // 다음 P.step 7단계에서 배열에서 제거됨
          onBodyDestroyed(b);
        }
      }
    }
    spawnParticles(cx, cy, 20, '#f2a33c');
    SFX.play('break');
    removeBirdBody();
    enterSettling();
  }

  // ---------- GAME API ----------

  function create(canvas) {
    game = {
      canvas: canvas,
      state: 'MENU',
      stageId: 1,
      stage: null,
      world: null,
      cam: { x: 0 },
      score: 0,
      maxScore: 0,
      resultStars: 0,

      shot: 'ARMED',
      birdQueue: [],
      birdType: null,
      birdPos: anchor(),
      bird: null,
      abilityUsed: false,
      flyTime: 0,
      settleTimer: 0,
      blackHitTimer: 0,
      acc: 0,
      hitSfxCooldown: 0,
      particles: [],

      // 키보드 조준 (§9.3), 단위: 도
      aimAngle: -35,
      aimPower: 0.8,

      save: loadSave(),

      // UI 훅 (ui.js 가 채운다)
      onState: null,
      onHud: null
    };
    return game;
  }

  function loadStage(id) {
    id = U.clamp(id | 0, 1, 10);
    var stage = STAGES[id - 1];
    game.stageId = id;
    game.stage = stage;

    var world = P.createWorld();
    // 지면: 중심 (960, 680), 1920×120 → y 620~740
    P.addBox(world, {
      x: C.WORLD_W / 2, y: C.GROUND_Y + 60, hw: C.WORLD_W / 2, hh: 60,
      isStatic: true, kind: 'ground', mat: 'ground',
      e: MAT.ground.e, mu: MAT.ground.mu, hp: Infinity
    });
    stage.build(world);
    game.world = world;

    // 별 기준 (§11.6)
    var maxScore = 0;
    var pigs = 0;
    for (var i = 0; i < world.bodies.length; i++) {
      var b = world.bodies[i];
      if (b.kind === 'pig') { pigs++; maxScore += C.SCORE_PIG; }
      else if (b.kind === 'block') maxScore += MAT[b.mat].score;
    }
    maxScore += stage.birds.length * C.SCORE_BIRD_LEFT;
    game.maxScore = maxScore;
    game.pigsTotal = pigs;

    game.birdQueue = stage.birds.slice();
    game.score = 0;
    game.resultStars = 0;
    game.particles = [];
    game.acc = 0;
    game.hitSfxCooldown = 0;
    game.cam.x = 0;
    armNext();

    game.state = 'PLAYING';
    emitState();
  }

  function startDrag(px, py) {
    if (game.state !== 'PLAYING' || game.shot !== 'ARMED' || !game.birdType) return false;
    if (U.dist(px, py, C.SLING_X, C.SLING_Y) > C.SLING_GRAB_R) return false;
    game.shot = 'DRAG';
    moveDrag(px, py);
    return true;
  }

  function moveDrag(px, py) {
    if (game.state !== 'PLAYING' || game.shot !== 'DRAG') return;
    var dx = px - C.SLING_X;
    var dy = py - C.SLING_Y;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > C.SLING_MAX_PULL) {
      dx = dx / len * C.SLING_MAX_PULL;
      dy = dy / len * C.SLING_MAX_PULL;
    }
    game.birdPos = { x: C.SLING_X + dx, y: C.SLING_Y + dy };
  }

  function release() {
    if (game.state !== 'PLAYING' || game.shot !== 'DRAG') return;
    var pull = U.dist(game.birdPos.x, game.birdPos.y, C.SLING_X, C.SLING_Y);
    if (pull < 12) {
      game.shot = 'ARMED';
      game.birdPos = anchor();
      return;
    }
    fire();
  }

  function fire() {
    var v = launchVelocity(game.birdPos.x, game.birdPos.y);
    var spec = BIRD[game.birdType] || BIRD.red;
    game.bird = P.addCircle(game.world, {
      x: game.birdPos.x, y: game.birdPos.y, r: spec.r,
      vx: v.vx, vy: v.vy,
      mat: 'bird', kind: 'bird',
      density: MAT.bird.density, hp: Infinity,
      e: MAT.bird.e, mu: MAT.bird.mu,
      birdType: game.birdType
    });
    game.shot = 'FLYING';
    game.flyTime = 0;
    game.abilityUsed = false;
    game.blackHitTimer = 0;
    SFX.play('launch');
  }

  function tapAbility() {
    if (game.state !== 'PLAYING' || game.shot !== 'FLYING' || game.abilityUsed || !game.bird) return;
    game.abilityUsed = true;
    var bird = game.bird;
    if (game.birdType === 'yellow') {
      var vx = bird.vx * 1.9, vy = bird.vy * 1.9;
      var sp = Math.sqrt(vx * vx + vy * vy);
      if (sp > 2400) { vx = vx / sp * 2400; vy = vy / sp * 2400; }
      bird.vx = vx; bird.vy = vy;
      bird.sleeping = false; bird.sleepTimer = 0;
      SFX.play('launch');
    } else if (game.birdType === 'black') {
      explode();
    }
    // red: 능력 없음
  }

  function updateCamera(dt) {
    var target = 0;
    if (game.shot === 'FLYING' && game.bird) {
      target = U.clamp(game.bird.x - 420, 0, C.WORLD_W - C.VIEW_W);
    }
    game.cam.x = U.lerp(game.cam.x, target, 1 - Math.pow(0.001, dt));
  }

  function update(dt) {
    if (game.state !== 'PLAYING') return;
    if (!game.world) return;

    // 고정 스텝 누적 (§7)
    game.acc += dt;
    var steps = 0;
    while (game.acc >= C.FIXED_DT && steps < C.MAX_STEPS) {
      P.step(game.world, C.FIXED_DT);
      drainEvents();
      game.acc -= C.FIXED_DT;
      steps++;
    }
    if (steps === C.MAX_STEPS) game.acc = 0;

    game.hitSfxCooldown -= dt;

    // 새 렌더 회전 (§12.3)
    if (game.bird) {
      game.bird.angle = Math.atan2(game.bird.vy, game.bird.vx);
    }

    // 샷 수명주기 (§6.4)
    if (game.shot === 'FLYING') {
      game.flyTime += dt;
      var bird = game.bird;

      // 폭탄새 자동 폭발: 첫 충돌 후 0.6초
      if (bird && game.birdType === 'black' && !game.abilityUsed && bird.hasHit) {
        game.blackHitTimer += dt;
        if (game.blackHitTimer > 0.6) tapAbility();
      }

      if (game.shot === 'FLYING') {
        var out = !bird || bird.x < -50 || bird.x > C.WORLD_W + 50 || bird.y > C.WORLD_H + 100;
        if (out || game.flyTime > C.SETTLE_TIMEOUT || allDynamicSleeping()) {
          enterSettling();
        }
      }
    } else if (game.shot === 'SETTLING') {
      game.settleTimer += dt;
      if (game.settleTimer > C.SETTLE_GRACE) {
        if (countPigs() === 0) {
          removeBirdBody();
          doClear();
        } else if (game.birdQueue.length > 0) {
          removeBirdBody();
          armNext();
        } else {
          removeBirdBody();
          doFail();
        }
      }
    } else if (game.shot === 'ARMED') {
      // 장전 대기 중에 지연 붕괴로 돼지가 모두 사라진 경우
      if (countPigs() === 0 && allDynamicSleeping()) {
        game.birdQueue.unshift(game.birdType);   // 손에 든 새는 남은 새로 계산
        game.birdType = null;
        doClear();
      }
    }

    updateParticles(dt);
    updateCamera(dt);

    if (game.onHud) game.onHud(game);
  }

  function pause() {
    if (game.state !== 'PLAYING') return;
    if (game.shot === 'DRAG') {
      game.shot = 'ARMED';
      game.birdPos = anchor();
    }
    game.state = 'PAUSED';
    emitState();
  }

  function resume() {
    if (game.state !== 'PAUSED') return;
    game.state = 'PLAYING';
    game.acc = 0;
    emitState();
  }

  function retry() {
    loadStage(game.stageId);
  }

  function toMenu() {
    game.world = null;
    game.bird = null;
    game.particles = [];
    game.shot = 'ARMED';
    game.birdType = null;
    game.state = 'MENU';
    game.cam.x = 0;
    emitState();
  }

  function toStages() {
    game.state = 'STAGES';
    emitState();
  }

  function startHighest() {
    loadStage(game.save.unlocked);
  }

  function nextStage() {
    if (game.stageId >= 10) return;
    loadStage(game.stageId + 1);
  }

  window.GAME = {
    create: create,
    loadStage: loadStage,
    update: update,
    startDrag: startDrag,
    moveDrag: moveDrag,
    release: release,
    tapAbility: tapAbility,
    pause: pause,
    resume: resume,
    retry: retry,
    toMenu: toMenu,
    toStages: toStages,
    startHighest: startHighest,
    nextStage: nextStage
  };
})();
