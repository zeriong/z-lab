/* game.js — §6 상태 머신 + 샷 수명주기 + 점수/저장. 참조 전역: U, C, MAT, BIRD, P, SB, STAGES, SFX
 *
 * 화면 상태 game.state : MENU | STAGES | PLAYING | PAUSED | CLEAR | FAIL
 * 샷 상태   game.shot  : ARMED | DRAG | FLYING | SETTLING
 *
 * UI 와의 결합은 콜백으로만 한다 (game.js 는 UI 전역을 참조하지 않는다):
 *   game.onStateChange(game) — 상태 전이 직후
 *   game.onHudChange(game)   — game.hud 갱신 직후
 */
var GAME = (function () {
  'use strict';

  var game = null;

  var DRAG_CANCEL_DIST = 12;     /* §9.2 당김거리 미만이면 취소 */
  var BLACK_AUTO_DELAY = 0.6;    /* §10.2 첫 충돌 후 자동 폭발까지 */
  var YELLOW_BOOST = 1.9;        /* §10.2 속도 배수 */
  var YELLOW_MAX_SPEED = 2400;   /* §10.2 속도 상한 */
  var OUT_MARGIN = 200;          /* 블록/돼지 월드 이탈 판정 여유 */
  var HIT_SFX_COOLDOWN = 0.08;
  var PARTICLE_LIFE = 0.7;

  /* ---------------------------------------------------------------- 진행 저장 (§13.3) */

  function defaultProgress() {
    return { v: 1, unlocked: 1, stars: {}, best: {} };
  }

  function loadProgress() {
    var def = defaultProgress();
    try {
      var raw = window.localStorage.getItem(C.SAVE_KEY);
      if (!raw) return def;
      var p = JSON.parse(raw);
      if (!p || p.v !== 1) return def;
      return {
        v: 1,
        unlocked: U.clamp(parseInt(p.unlocked, 10) || 1, 1, STAGES.length),
        stars: (p.stars && typeof p.stars === 'object') ? p.stars : {},
        best: (p.best && typeof p.best === 'object') ? p.best : {}
      };
    } catch (e) {
      return def;
    }
  }

  function saveProgress(p) {
    try {
      window.localStorage.setItem(C.SAVE_KEY, JSON.stringify(p));
    } catch (e) {
      /* 저장 실패는 무시 */
    }
  }

  /* ---------------------------------------------------------------- 콜백 */

  function emitState() {
    if (game.onStateChange) game.onStateChange(game);
  }

  function emitHud() {
    var colors = [];
    if (game.birdType && (game.shot === 'ARMED' || game.shot === 'DRAG')) {
      colors.push(BIRD[game.birdType].color);
    }
    for (var i = 0; i < game.birdQueue.length; i++) {
      colors.push(BIRD[game.birdQueue[i]].color);
    }
    game.hud = {
      stage: '스테이지 ' + game.stageId,
      score: '점수 ' + U.fmt(game.score),
      birds: colors
    };
    if (game.onHudChange) game.onHudChange(game);
  }

  /* ---------------------------------------------------------------- 생성 */

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

      shot: 'ARMED',
      birdQueue: [],
      birdType: null,
      bird: null,
      birdPos: { x: C.SLING_X, y: C.SLING_Y },
      flyTime: 0,
      settleTimer: 0,
      abilityUsed: false,
      blackTouchTime: -1,

      acc: 0,
      particles: [],
      aimAngle: -35,     /* §9.3 키보드 조준각(도) */
      aimPower: 0.8,     /* §9.3 키보드 파워 */
      hitCooldown: 0,

      progress: loadProgress(),
      result: null,
      hud: { stage: '스테이지 1', score: '점수 0', birds: [] },

      onStateChange: null,
      onHudChange: null
    };
    return game;
  }

  /* ---------------------------------------------------------------- 스테이지 로드 */

  function spawnDesc(world, d) {
    var m = MAT[d.mat];
    var o = {
      x: d.x, y: d.y,
      density: m.density, e: m.e, mu: m.mu, hp: m.hp,
      kind: d.kind, mat: d.mat
    };
    if (d.shape === 'circle') {
      o.r = d.r;
      return P.addCircle(world, o);
    }
    o.hw = d.hw;
    o.hh = d.hh;
    return P.addBox(world, o);
  }

  function loadStage(id) {
    id = U.clamp(parseInt(id, 10) || 1, 1, STAGES.length);
    var stage = STAGES[id - 1];
    var world = P.createWorld();

    /* 지면: 정적 박스, 중심 (960,680), 1920×120 → y 620~740 */
    P.addBox(world, {
      x: 960, y: 680, hw: 960, hh: 60,
      isStatic: true, e: MAT.ground.e, mu: MAT.ground.mu, hp: Infinity,
      kind: 'ground', mat: 'ground'
    });

    world.spawn = [];
    stage.build(world);

    var maxScore = 0;
    for (var i = 0; i < world.spawn.length; i++) {
      var d = world.spawn[i];
      spawnDesc(world, d);
      if (d.kind === 'pig') maxScore += C.SCORE_PIG;
      else if (d.kind === 'block') maxScore += MAT[d.mat].score;
    }
    world.spawn = null;
    maxScore += stage.birds.length * C.SCORE_BIRD_LEFT;   /* §11.6 */

    game.stageId = id;
    game.stage = stage;
    game.world = world;
    game.score = 0;
    game.maxScore = maxScore;
    game.birdQueue = stage.birds.slice();
    game.bird = null;
    game.particles = [];
    game.cam.x = 0;
    game.acc = 0;
    game.result = null;
    game.hitCooldown = 0;

    armNext();
    game.state = 'PLAYING';
    emitState();
    emitHud();
  }

  /* 다음 새 장전: 새총 앵커에 고정(물리 밖) */
  function armNext() {
    game.birdType = game.birdQueue.shift() || null;
    game.bird = null;
    game.birdPos.x = C.SLING_X;
    game.birdPos.y = C.SLING_Y;
    game.shot = 'ARMED';
    game.flyTime = 0;
    game.settleTimer = 0;
    game.abilityUsed = false;
    game.blackTouchTime = -1;
  }

  /* ---------------------------------------------------------------- 조회 */

  function countPigs() {
    var n = 0;
    var bodies = game.world.bodies;
    for (var i = 0; i < bodies.length; i++) {
      if (bodies[i].kind === 'pig' && !bodies[i].dead) n++;
    }
    return n;
  }

  function allAsleep(world) {
    var bodies = world.bodies;
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (b.isStatic || b.dead) continue;
      if (!b.sleeping) return false;
    }
    return true;
  }

  /* ---------------------------------------------------------------- 파티클 (§12.4) */

  function spawnParticles(x, y, count, color) {
    for (var i = 0; i < count; i++) {
      var ang = Math.random() * Math.PI * 2;
      var sp = 120 + Math.random() * 200;
      game.particles.push({
        x: x, y: y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: PARTICLE_LIFE,
        maxLife: PARTICLE_LIFE,
        color: color,
        size: 3 + Math.random() * 4
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

  /* ---------------------------------------------------------------- 물리 이벤트 소비 */

  function consumeEvents() {
    var world = game.world;
    var changed = false;

    if (world.destroyed.length > 0) {
      for (var i = 0; i < world.destroyed.length; i++) {
        var d = world.destroyed[i];
        if (d.kind === 'pig') {
          game.score += C.SCORE_PIG;
          spawnParticles(d.x, d.y, 8, '#7fc855');
          changed = true;
        } else if (d.kind === 'block') {
          game.score += MAT[d.mat].score;
          spawnParticles(d.x, d.y, 10, MAT[d.mat].color);
          changed = true;
        }
      }
      world.destroyed.length = 0;
      SFX.play('break');
    }

    if (world.hits > 0) {
      world.hits = 0;
      if (game.hitCooldown <= 0) {
        SFX.play('hit');
        game.hitCooldown = HIT_SFX_COOLDOWN;
      }
    }

    if (changed) emitHud();
  }

  /* 월드 밖으로 떨어진 블록/돼지는 제거(돼지는 처치로 간주) */
  function cullOutOfBounds() {
    var bodies = game.world.bodies;
    var changed = false;
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (b.isStatic || b.dead || b.kind === 'bird') continue;
      if (b.y > C.WORLD_H + OUT_MARGIN || b.x < -OUT_MARGIN || b.x > C.WORLD_W + OUT_MARGIN) {
        b.dead = true;
        if (b.kind === 'pig') {
          game.score += C.SCORE_PIG;
          changed = true;
        } else if (b.kind === 'block') {
          game.score += MAT[b.mat].score;
          changed = true;
        }
      }
    }
    if (changed) emitHud();
  }

  /* ---------------------------------------------------------------- 샷 수명주기 (§6.4) */

  function enterSettling() {
    game.shot = 'SETTLING';
    game.settleTimer = 0;
  }

  function computeStars(score, maxScore) {
    if (maxScore > 0 && score >= maxScore * 0.75) return 3;
    if (maxScore > 0 && score >= maxScore * 0.50) return 2;
    return 1;
  }

  function doClear() {
    var bonus = game.birdQueue.length * C.SCORE_BIRD_LEFT;
    game.score += bonus;
    var stars = computeStars(game.score, game.maxScore);

    var p = game.progress;
    var id = game.stageId;
    p.unlocked = Math.min(STAGES.length, Math.max(p.unlocked, id + 1));
    p.stars[id] = Math.max(p.stars[id] || 0, stars);
    p.best[id] = Math.max(p.best[id] || 0, game.score);
    saveProgress(p);

    game.result = {
      score: game.score,
      bonus: bonus,
      stars: stars,
      scoreText: U.fmt(game.score),
      bonusText: U.fmt(bonus)
    };
    game.state = 'CLEAR';
    SFX.play('win');
    emitHud();
    emitState();
  }

  function doFail() {
    game.result = null;
    game.state = 'FAIL';
    SFX.play('lose');
    emitState();
  }

  function judge() {
    if (countPigs() === 0) {
      doClear();
      return;
    }
    if (game.birdQueue.length > 0) {
      if (game.bird) game.bird.dead = true;   /* 다음 P.step 에서 배열에서 제거 */
      game.bird = null;
      armNext();
      emitHud();
      return;
    }
    doFail();
  }

  function fire() {
    var vx = (C.SLING_X - game.birdPos.x) * C.LAUNCH_POWER;
    var vy = (C.SLING_Y - game.birdPos.y) * C.LAUNCH_POWER;
    var sp = Math.sqrt(vx * vx + vy * vy);
    if (sp > C.MAX_LAUNCH_SPEED) {
      var k = C.MAX_LAUNCH_SPEED / sp;
      vx *= k;
      vy *= k;
    }

    var bt = BIRD[game.birdType] || BIRD.red;
    var m = MAT.bird;
    var b = P.addCircle(game.world, {
      x: game.birdPos.x, y: game.birdPos.y, r: bt.r,
      density: m.density, e: m.e, mu: m.mu, hp: Infinity,
      kind: 'bird', mat: 'bird'
    });
    b.vx = vx;
    b.vy = vy;
    b.angle = Math.atan2(vy, vx);
    b.birdType = game.birdType;

    game.bird = b;
    game.shot = 'FLYING';
    game.flyTime = 0;
    game.abilityUsed = false;
    game.blackTouchTime = -1;

    SFX.play('launch');
    emitHud();
  }

  /* §10.2 폭발 */
  function explode() {
    var b = game.bird;
    if (!b || b.dead) return;
    var world = game.world;
    var list = P.queryRadius(world, b.x, b.y, C.EXPLODE_R);
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o === b || o.isStatic || o.dead) continue;
      var d = U.dist(b.x, b.y, o.x, o.y);
      var f = 1 - d / C.EXPLODE_R;
      if (f < 0) continue;
      var nx, ny;
      if (d > 0) { nx = (o.x - b.x) / d; ny = (o.y - b.y) / d; }
      else { nx = 0; ny = -1; }
      o.sleeping = false;
      o.sleepTimer = 0;
      o.vx += nx * C.EXPLODE_IMPULSE * f * o.invMass;
      o.vy += ny * C.EXPLODE_IMPULSE * f * o.invMass;
      if (o.hp !== Infinity) o.hp -= C.EXPLODE_DMG * f;   /* hp<=0 판정은 다음 P.step */
    }
    spawnParticles(b.x, b.y, 20, '#f2a33c');
    SFX.play('break');

    b.dead = true;
    game.bird = null;
    game.abilityUsed = true;
    enterSettling();
  }

  function updateShot(dt) {
    var world = game.world;

    if (game.shot === 'FLYING') {
      var b = game.bird;
      game.flyTime += dt;

      if (!b || b.dead) {
        game.bird = null;
        enterSettling();
        return;
      }

      /* 렌더 회전 (§12.3) */
      if (!b.sleeping && (b.vx !== 0 || b.vy !== 0)) b.angle = Math.atan2(b.vy, b.vx);

      /* 폭탄새: 첫 충돌 후 0.6초 지나면 자동 폭발 */
      if (game.birdType === 'black' && !game.abilityUsed && b.touched) {
        if (game.blackTouchTime < 0) {
          game.blackTouchTime = game.flyTime;
        } else if (game.flyTime - game.blackTouchTime >= BLACK_AUTO_DELAY) {
          explode();
          return;
        }
      }

      /* 월드 밖 이탈 */
      if (b.x < -50 || b.x > C.WORLD_W + 50 || b.y > C.WORLD_H + 100) {
        b.dead = true;
        game.bird = null;
        enterSettling();
        return;
      }

      /* 시간 초과 또는 월드 정지 */
      if (game.flyTime > C.SETTLE_TIMEOUT || allAsleep(world)) {
        enterSettling();
        return;
      }
      return;
    }

    if (game.shot === 'SETTLING') {
      game.settleTimer += dt;
      if (game.settleTimer >= C.SETTLE_GRACE) judge();
    }
  }

  /* ---------------------------------------------------------------- 카메라 (§8) */

  function updateCamera(dt) {
    var target = 0;
    if (game.shot === 'FLYING' && game.bird) {
      target = U.clamp(game.bird.x - 420, 0, C.WORLD_W - C.VIEW_W);
    }
    game.cam.x = U.lerp(game.cam.x, target, 1 - Math.pow(0.001, dt));
  }

  /* ---------------------------------------------------------------- 프레임 갱신 (§6.3, §7) */

  function update(dt) {
    if (game.state !== 'PLAYING') return;   /* PAUSED 규칙: 물리·입력 정지, 렌더만 계속 */
    var world = game.world;
    if (!world) return;

    game.acc += dt;
    var steps = 0;
    while (game.acc >= C.FIXED_DT && steps < C.MAX_STEPS) {
      P.step(world, C.FIXED_DT);
      consumeEvents();
      game.acc -= C.FIXED_DT;
      steps++;
    }
    if (steps === C.MAX_STEPS) game.acc = 0;

    game.hitCooldown = Math.max(0, game.hitCooldown - dt);

    cullOutOfBounds();
    updateShot(dt);
    updateParticles(dt);
    updateCamera(dt);
  }

  /* ---------------------------------------------------------------- 슬링샷 입력 (§9) */

  function startDrag(px, py) {
    if (game.state !== 'PLAYING' || game.shot !== 'ARMED') return false;
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
      var k = C.SLING_MAX_PULL / len;
      dx *= k;
      dy *= k;
    }
    game.birdPos.x = C.SLING_X + dx;
    game.birdPos.y = C.SLING_Y + dy;
  }

  function release() {
    if (game.state !== 'PLAYING' || game.shot !== 'DRAG') return;
    var pull = U.dist(game.birdPos.x, game.birdPos.y, C.SLING_X, C.SLING_Y);
    if (pull < DRAG_CANCEL_DIST) {
      game.shot = 'ARMED';
      game.birdPos.x = C.SLING_X;
      game.birdPos.y = C.SLING_Y;
      return;
    }
    fire();
  }

  /* §10.2 비행 중 특수능력 (1회) */
  function tapAbility() {
    if (game.state !== 'PLAYING' || game.shot !== 'FLYING') return;
    if (game.abilityUsed) return;
    var b = game.bird;
    if (!b || b.dead) return;
    game.abilityUsed = true;

    if (game.birdType === 'yellow') {
      var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (sp > 0) {
        var ns = Math.min(sp * YELLOW_BOOST, YELLOW_MAX_SPEED);
        b.vx *= ns / sp;
        b.vy *= ns / sp;
      }
      b.sleeping = false;
      b.sleepTimer = 0;
    } else if (game.birdType === 'black') {
      explode();
    }
    /* red: 능력 없음 */
  }

  /* ---------------------------------------------------------------- 상태 전이 (§6.2) */

  function pause() {
    if (game.state !== 'PLAYING') return;
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
    if (!game.stage) return;
    loadStage(game.stageId);
  }

  function toMenu() {
    game.state = 'MENU';
    game.stage = null;
    game.world = null;
    game.bird = null;
    game.birdType = null;
    game.birdQueue = [];
    game.particles = [];
    game.shot = 'ARMED';
    game.cam.x = 0;
    game.result = null;
    emitState();
  }

  function toStages() {
    game.state = 'STAGES';
    emitState();
  }

  /* 메인 → 게임 시작: 해금된 최고 스테이지 로드 */
  function startGame() {
    loadStage(game.progress.unlocked);
  }

  function nextStage() {
    if (game.stageId >= STAGES.length) {
      toMenu();
      return;
    }
    loadStage(game.stageId + 1);
  }

  return {
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
    startGame: startGame,
    nextStage: nextStage
  };
})();
