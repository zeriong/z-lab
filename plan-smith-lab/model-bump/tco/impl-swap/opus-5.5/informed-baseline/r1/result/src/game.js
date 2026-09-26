/*
 * game.js — 게임 상태 머신 · 샷 수명주기 · 점수/저장 (§6, §7, §10, §11.6, §13.3)
 * 노출: window.GAME = { create, loadStage, update, startDrag, moveDrag, release,
 *                       tapAbility, pause, resume, retry, toMenu }
 * 참조 전역: U, C, MAT, BIRD, P, SB(스테이지 build 내부), STAGES, SFX
 *
 * 상태(game.state): 'MENU' | 'STAGES' | 'PLAYING' | 'PAUSED' | 'CLEAR' | 'FAIL'
 * 샷(game.shot):    'ARMED' | 'DRAG' | 'FLYING' | 'SETTLING'
 *
 * UI(ui.js)는 이 파일보다 뒤에 로드되므로 직접 호출하지 않는다.
 * UI.bind 가 game.hooks.state / game.hooks.hud 에 콜백을 꽂고, 여기서는 그 콜백만 부른다.
 */
(function () {
  'use strict';

  // ---- 플랜에 명시된 국소 수치 (C 는 §4.2 표만 담는다) ----
  var DRAG_CANCEL_DIST = 12;       // §9.2 당김거리 < 12px 이면 발사 취소
  var BLACK_FUSE_TIME = 0.6;       // §10.2 첫 충돌 후 자동 폭발까지(초)
  var YELLOW_BOOST = 1.9;          // §10.2 현재 속도 배수
  var YELLOW_MAX_SPEED = 2400;     // §10.2 가속 후 속도 상한
  var DESTROY_WAKE_R = 120;        // §5.6 파괴 시 깨움 반경
  var CAM_LEAD = 420;              // §8 카메라 목표 = bird.x - 420
  var CAM_SMOOTH_BASE = 0.001;     // §8 lerp 계수 = 1 - 0.001^dt
  var PARTICLE_LIFE = 0.7;         // §12.4
  var PARTICLE_SPEED_MIN = 120;    // §12.4
  var PARTICLE_SPEED_MAX = 320;    // §12.4
  var BIRD_OUT_X = 50;             // §6.4 x < -50 또는 x > WORLD_W + 50
  var BIRD_OUT_Y = 100;            // §6.4 y > WORLD_H + 100
  var AIM_ANGLE_DEFAULT = -35;     // §9.3 조준각 기본값(도)
  var AIM_POWER_DEFAULT = 0.8;     // §9.3 파워 기본값

  // ---- 구현 보완용 국소 수치 ----
  var BODY_OUT_MARGIN = 200;       // 새 이외 바디가 월드 밖으로 이만큼 벗어나면 파괴 처리
  var HIT_SFX_GAP = 0.08;          // 'hit' 효과음 최소 간격(초)
  var BREAK_SFX_GAP = 0.05;        // 'break' 효과음 최소 간격(초)
  var ANGLE_MIN_SPEED2 = 400;      // 속도 20px/s 미만이면 새 렌더 회전각을 갱신하지 않음

  var G = null;   // GAME.create 가 만든 현재 게임 객체

  // ------------------------------------------------------------------
  // 공통 보조
  // ------------------------------------------------------------------

  function sfx(name) {
    try {
      SFX.play(name);
    } catch (e) {
      /* 무음 */
    }
  }

  function setState(s) {
    G.state = s;
    if (G.hooks.state) G.hooks.state(s);
  }

  function notifyHud() {
    if (G && G.hooks.hud) G.hooks.hud(G);
  }

  function findStage(id) {
    for (var i = 0; i < STAGES.length; i++) {
      if (STAGES[i].id === id) return STAGES[i];
    }
    return null;
  }

  // ------------------------------------------------------------------
  // 진행 저장 (§13.3)
  // ------------------------------------------------------------------

  function defaultProgress() {
    return { v: 1, unlocked: 1, stars: {}, best: {} };
  }

  function loadProgress() {
    var p = defaultProgress();
    try {
      var raw = window.localStorage.getItem(C.SAVE_KEY);
      if (!raw) return p;
      var d = JSON.parse(raw);
      if (!d || typeof d !== 'object' || d.v !== 1) return p;

      var u = parseInt(d.unlocked, 10);
      p.unlocked = U.clamp(isFinite(u) ? u : 1, 1, STAGES.length);

      var key, id, val;
      if (d.stars && typeof d.stars === 'object') {
        for (key in d.stars) {
          if (!Object.prototype.hasOwnProperty.call(d.stars, key)) continue;
          id = parseInt(key, 10);
          val = Number(d.stars[key]);
          if (id >= 1 && id <= STAGES.length && isFinite(val)) p.stars[id] = U.clamp(Math.round(val), 0, 3);
        }
      }
      if (d.best && typeof d.best === 'object') {
        for (key in d.best) {
          if (!Object.prototype.hasOwnProperty.call(d.best, key)) continue;
          id = parseInt(key, 10);
          val = Number(d.best[key]);
          if (id >= 1 && id <= STAGES.length && isFinite(val) && val >= 0) p.best[id] = Math.round(val);
        }
      }
    } catch (e) {
      return defaultProgress();
    }
    return p;
  }

  function saveProgress(p) {
    try {
      window.localStorage.setItem(C.SAVE_KEY, JSON.stringify(p));
    } catch (e) {
      /* 저장 실패는 무시 */
    }
  }

  // ------------------------------------------------------------------
  // 월드 조회 / 조작
  // ------------------------------------------------------------------

  function countPigs() {
    var bodies = G.world ? G.world.bodies : [];
    var n = 0;
    for (var i = 0; i < bodies.length; i++) {
      if (bodies[i].kind === 'pig' && !bodies[i].dead) n++;
    }
    return n;
  }

  // 월드의 모든 비정적 바디가 sleeping 인가 (새 바디도 포함)
  function worldAtRest() {
    var bodies = G.world ? G.world.bodies : [];
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (!b.isStatic && !b.dead && !b.sleeping) return false;
    }
    return true;
  }

  function removeDead() {
    var bodies = G.world ? G.world.bodies : null;
    if (!bodies) return;
    var w = 0;
    for (var i = 0; i < bodies.length; i++) {
      if (!bodies[i].dead) bodies[w++] = bodies[i];
    }
    bodies.length = w;
  }

  function wakeAround(x, y, r) {
    var list = P.queryRadius(G.world, x, y, r);
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (b.isStatic) continue;
      b.sleeping = false;
      b.sleepTimer = 0;
    }
  }

  // ------------------------------------------------------------------
  // 파티클 (§12.4) — Math.random 은 물리 스텝 밖(여기)에서만 쓴다
  // ------------------------------------------------------------------

  function burst(x, y, count, color) {
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = PARTICLE_SPEED_MIN + Math.random() * (PARTICLE_SPEED_MAX - PARTICLE_SPEED_MIN);
      G.particles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: PARTICLE_LIFE,
        maxLife: PARTICLE_LIFE,
        color: color,
        size: 3 + Math.random() * 3
      });
    }
  }

  function updateParticles(dt) {
    var ps = G.particles;
    var w = 0;
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      p.vy += C.GRAVITY * 0.5 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life > 0) ps[w++] = p;
    }
    ps.length = w;
  }

  // ------------------------------------------------------------------
  // 파괴 처리
  // ------------------------------------------------------------------

  // 점수 · 파티클 · 효과음 (바디당 1회)
  function onDestroyed(b) {
    if (b._scored) return;
    b._scored = true;
    if (b.kind === 'pig') {
      G.score += C.SCORE_PIG;
      burst(b.x, b.y, 8, '#7fc855');
    } else if (b.kind === 'block') {
      var m = MAT[b.mat];
      G.score += m ? m.score : 0;
      burst(b.x, b.y, 10, m ? m.color : '#999999');
    } else {
      return;
    }
    if (G.breakCd <= 0) {
      sfx('break');
      G.breakCd = BREAK_SFX_GAP;
    }
  }

  // 물리 스텝 밖에서 바디를 파괴(폭발 피해, 월드 이탈)
  function killBody(b) {
    if (!G.world || b._removed) return;
    b._removed = true;
    b.dead = true;
    wakeAround(b.x, b.y, DESTROY_WAKE_R);
    removeDead();
    onDestroyed(b);
  }

  // P.step 1회 직후 처리
  function afterStep(world) {
    var i;

    // 물리 피해로 파괴된 바디 (P.step 7단계에서 이미 배열에서 빠짐)
    if (world.broken.length) {
      var list = world.broken.slice();
      world.broken.length = 0;
      for (i = 0; i < list.length; i++) onDestroyed(list[i]);
    }

    if (world.impacts > 0 && G.hitCd <= 0) {
      sfx('hit');
      G.hitCd = HIT_SFX_GAP;
    }

    // 월드 밖으로 떨어진 블록·돼지는 파괴 처리 (돼지가 영원히 낙하해 클리어 불가가 되는 것 방지)
    var out = null;
    for (i = 0; i < world.bodies.length; i++) {
      var b = world.bodies[i];
      if (b.isStatic || b.dead || b.kind === 'bird') continue;
      if (b.y > C.WORLD_H + BODY_OUT_MARGIN || b.x < -BODY_OUT_MARGIN || b.x > C.WORLD_W + BODY_OUT_MARGIN) {
        if (!out) out = [];
        out.push(b);
      }
    }
    if (out) {
      for (i = 0; i < out.length; i++) killBody(out[i]);
    }
  }

  // ------------------------------------------------------------------
  // 새 장전 / 발사
  // ------------------------------------------------------------------

  function armBird() {
    var info = G.birds[G.firedCount];
    G.armedBird = {
      type: info.type,
      color: info.color,
      r: info.r,
      x: C.SLING_X,
      y: C.SLING_Y
    };
    G.shot = 'ARMED';
    G.flyTime = 0;
    G.settleTimer = 0;
    G.abilityUsed = false;
    G.fuse = 0;
    G.launchVx = 0;
    G.launchVy = 0;
  }

  // §9.2 발사 속도: (앵커 - 새위치) x LAUNCH_POWER, 크기를 MAX_LAUNCH_SPEED 로 클램프
  function computeLaunch(bx, by) {
    var vx = (C.SLING_X - bx) * C.LAUNCH_POWER;
    var vy = (C.SLING_Y - by) * C.LAUNCH_POWER;
    var sp = Math.sqrt(vx * vx + vy * vy);
    if (sp > C.MAX_LAUNCH_SPEED) {
      vx *= C.MAX_LAUNCH_SPEED / sp;
      vy *= C.MAX_LAUNCH_SPEED / sp;
    }
    return { vx: vx, vy: vy };
  }

  function fire() {
    var ab = G.armedBird;
    var v = computeLaunch(ab.x, ab.y);
    var bt = BIRD[ab.type] || BIRD.red;
    var m = MAT.bird;

    var body = P.addCircle(G.world, {
      x: ab.x,
      y: ab.y,
      r: bt.r,
      density: m.density,
      e: m.e,
      mu: m.mu,
      hp: m.hp,
      kind: 'bird',
      mat: 'bird',
      isStatic: false,
      vx: v.vx,
      vy: v.vy
    });
    body.birdType = ab.type;
    body.color = bt.color;
    body.angle = Math.atan2(v.vy, v.vx);

    G.birdBody = body;
    G.armedBird = null;
    G.firedCount++;
    G.shot = 'FLYING';
    G.flyTime = 0;
    G.abilityUsed = false;
    G.fuse = 0;
    sfx('launch');
    notifyHud();
  }

  function removeBirdBody() {
    if (G.birdBody) {
      G.birdBody.dead = true;
      removeDead();
      G.birdBody = null;
    }
  }

  // §10.2 폭탄새 폭발
  function explode(bird) {
    G.abilityUsed = true;
    var bx = bird.x;
    var by = bird.y;
    var list = P.queryRadius(G.world, bx, by, C.EXPLODE_R);
    var toKill = [];

    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (b === bird || b.dead) continue;
      var dx = b.x - bx;
      var dy = b.y - by;
      var d = Math.sqrt(dx * dx + dy * dy);
      var f = 1 - d / C.EXPLODE_R;
      if (f < 0) continue;
      var nx = d > 0 ? dx / d : 0;
      var ny = d > 0 ? dy / d : -1;
      if (!b.isStatic) {
        b.sleeping = false;
        b.sleepTimer = 0;
        b.vx += nx * C.EXPLODE_IMPULSE * f * b.invMass;
        b.vy += ny * C.EXPLODE_IMPULSE * f * b.invMass;
      }
      if (b.hp !== Infinity) {
        b.hp -= C.EXPLODE_DMG * f;
        if (b.hp <= 0) toKill.push(b);
      }
    }

    bird.dead = true;
    G.birdBody = null;
    removeDead();
    for (var k = 0; k < toKill.length; k++) killBody(toKill[k]);

    burst(bx, by, 20, '#f2a33c');
    sfx('break');
    enterSettling();
  }

  // ------------------------------------------------------------------
  // 샷 수명주기 (§6.4)
  // ------------------------------------------------------------------

  function enterSettling() {
    G.shot = 'SETTLING';
    G.settleTimer = 0;
  }

  function stageClear() {
    var left = Math.max(0, G.birds.length - G.firedCount);
    G.score += left * C.SCORE_BIRD_LEFT;

    // §11.6 별: 1 = 클리어, 2 = 50% 이상, 3 = 75% 이상
    var stars = 1;
    if (G.score >= G.maxScore * 0.75) stars = 3;
    else if (G.score >= G.maxScore * 0.5) stars = 2;
    G.lastStars = stars;

    var p = G.progress;
    var id = G.stageId;
    p.unlocked = Math.min(STAGES.length, Math.max(p.unlocked, id + 1));
    p.stars[id] = Math.max(p.stars[id] || 0, stars);
    p.best[id] = Math.max(p.best[id] || 0, G.score);
    saveProgress(p);

    sfx('win');
    setState('CLEAR');
  }

  function stageFail() {
    sfx('lose');
    setState('FAIL');
  }

  // SETTLE_GRACE 후 판정
  function judge() {
    if (countPigs() === 0) {
      stageClear();
      return;
    }
    removeBirdBody();
    if (G.armedBird) {                 // ARMED 상태에서 들어온 정리였다면 그대로 복귀
      G.shot = 'ARMED';
      return;
    }
    if (G.firedCount < G.birds.length) {
      armBird();
      notifyHud();
    } else {
      stageFail();
    }
  }

  function updateShot(dt) {
    var shot = G.shot;

    if (shot === 'FLYING') {
      G.flyTime += dt;
      var bird = G.birdBody;
      if (bird && !bird.dead) {
        if (bird.vx * bird.vx + bird.vy * bird.vy > ANGLE_MIN_SPEED2) {
          bird.angle = Math.atan2(bird.vy, bird.vx);
        }
        var info = BIRD[bird.birdType] || BIRD.red;
        if (info.ability === 'bomb' && !G.abilityUsed && bird.touched) {
          G.fuse += dt;
          if (G.fuse >= BLACK_FUSE_TIME) {
            explode(bird);
            return;
          }
        }
        if (bird.x < -BIRD_OUT_X || bird.x > C.WORLD_W + BIRD_OUT_X || bird.y > C.WORLD_H + BIRD_OUT_Y) {
          enterSettling();
          return;
        }
      }
      if (G.flyTime > C.SETTLE_TIMEOUT || worldAtRest()) {
        enterSettling();
      }
    } else if (shot === 'SETTLING') {
      G.settleTimer += dt;
      if (G.settleTimer >= C.SETTLE_GRACE) judge();
    } else if (shot === 'ARMED') {
      // 발사 사이에 뒤늦은 붕괴로 돼지가 모두 사라진 경우에도 클리어로 이어지게 한다
      if (countPigs() === 0 && worldAtRest()) enterSettling();
    }
  }

  function updateCamera(dt) {
    var target = 0;
    var bird = G.birdBody;
    if (G.shot === 'FLYING' && bird && !bird.dead) {
      target = U.clamp(bird.x - CAM_LEAD, 0, C.WORLD_W - C.VIEW_W);
    }
    G.cam.x = U.lerp(G.cam.x, target, 1 - Math.pow(CAM_SMOOTH_BASE, dt));
  }

  // ------------------------------------------------------------------
  // 공개 API (§6.3)
  // ------------------------------------------------------------------

  function create(canvas) {
    var info = [];
    for (var i = 0; i < STAGES.length; i++) {
      info.push({ id: STAGES[i].id, name: STAGES[i].name, birds: STAGES[i].birds.length });
    }
    G = {
      canvas: canvas,
      state: 'MENU',
      stageId: 0,
      stageName: '',
      stageInfo: info,          // UI 가 STAGES 를 직접 보지 않도록 제공하는 요약
      progress: loadProgress(),
      world: null,
      cam: { x: 0 },
      acc: 0,
      shot: 'ARMED',
      birds: [],                // [{ type, color, r }] 발사 순서
      firedCount: 0,            // 발사한 새 수
      armedBird: null,          // 새총 위의 새 { type, color, r, x, y } (월드에 없음)
      birdBody: null,           // 발사된 새 바디 (FLYING/SETTLING)
      flyTime: 0,
      settleTimer: 0,
      abilityUsed: false,
      fuse: 0,
      aimAngle: AIM_ANGLE_DEFAULT,
      aimPower: AIM_POWER_DEFAULT,
      launchVx: 0,
      launchVy: 0,
      score: 0,
      maxScore: 0,
      lastStars: 0,
      particles: [],
      hooks: { state: null, hud: null },
      hitCd: 0,
      breakCd: 0
    };
    return G;
  }

  function loadStage(id) {
    if (!G) return;
    var stage = findStage(id);
    if (!stage) return;

    var world = P.createWorld();
    var gm = MAT.ground;
    // 지면: 정적 박스, 중심 (960, 680), 1920 x 120 -> y 620~740
    P.addBox(world, {
      x: C.WORLD_W / 2,
      y: C.GROUND_Y + 60,
      hw: C.WORLD_W / 2,
      hh: 60,
      isStatic: true,
      e: gm.e,
      mu: gm.mu,
      hp: gm.hp,
      kind: 'ground',
      mat: 'ground'
    });

    world.spawn = [];
    stage.build(world);

    var pigs = 0;
    var blockScore = 0;
    for (var i = 0; i < world.spawn.length; i++) {
      var spec = world.spawn[i];
      var body = (spec.shape === 'circle') ? P.addCircle(world, spec) : P.addBox(world, spec);
      if (body.kind === 'pig') pigs++;
      else if (body.kind === 'block') blockScore += MAT[body.mat] ? MAT[body.mat].score : 0;
    }
    world.spawn = [];

    G.world = world;
    G.stageId = stage.id;
    G.stageName = stage.name;
    G.birds = [];
    for (var j = 0; j < stage.birds.length; j++) {
      var t = stage.birds[j];
      var bt = BIRD[t] || BIRD.red;
      G.birds.push({ type: t, color: bt.color, r: bt.r });
    }
    G.firedCount = 0;
    G.birdBody = null;
    G.particles = [];
    G.score = 0;
    G.lastStars = 0;
    G.acc = 0;
    G.cam.x = 0;
    G.hitCd = 0;
    G.breakCd = 0;
    G.aimAngle = AIM_ANGLE_DEFAULT;
    G.aimPower = AIM_POWER_DEFAULT;

    // §11.6 maxScore = 돼지 x SCORE_PIG + 블록 파괴점수 합 + 새 수 x SCORE_BIRD_LEFT
    G.maxScore = pigs * C.SCORE_PIG + blockScore + G.birds.length * C.SCORE_BIRD_LEFT;

    armBird();
    setState('PLAYING');
    notifyHud();
  }

  function update(dt) {
    if (!G || G.state !== 'PLAYING') return;     // PAUSED 등에서는 즉시 반환 (렌더는 main 에서 계속)
    var world = G.world;
    if (!world) return;

    // 고정 스텝 누적 (§7)
    G.acc += dt;
    var steps = 0;
    while (G.acc >= C.FIXED_DT && steps < C.MAX_STEPS) {
      P.step(world, C.FIXED_DT);
      afterStep(world);
      G.acc -= C.FIXED_DT;
      steps++;
    }
    if (steps === C.MAX_STEPS) G.acc = 0;

    G.hitCd -= dt;
    G.breakCd -= dt;

    updateShot(dt);                   // 샷 수명주기 (CLEAR/FAIL 전이 가능)
    if (G.state === 'PLAYING') {
      updateParticles(dt);
      updateCamera(dt);
    }
    notifyHud();
  }

  // §9.2 pointerdown: ARMED 이고 앵커에서 SLING_GRAB_R 이내면 DRAG
  function startDrag(px, py) {
    if (!G || G.state !== 'PLAYING' || G.shot !== 'ARMED' || !G.armedBird) return false;
    if (U.dist(px, py, C.SLING_X, C.SLING_Y) > C.SLING_GRAB_R) return false;
    G.shot = 'DRAG';
    moveDrag(px, py);
    return true;
  }

  // §9.2 pointermove: 새 위치 = 앵커 + clampLen(포인터 - 앵커, SLING_MAX_PULL)
  function moveDrag(px, py) {
    if (!G || G.state !== 'PLAYING' || G.shot !== 'DRAG' || !G.armedBird) return;
    var ab = G.armedBird;
    var dx = px - C.SLING_X;
    var dy = py - C.SLING_Y;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > C.SLING_MAX_PULL) {
      dx *= C.SLING_MAX_PULL / len;
      dy *= C.SLING_MAX_PULL / len;
    }
    var x = C.SLING_X + dx;
    var y = C.SLING_Y + dy;
    // 새가 지면과 겹친 채 생성되지 않도록 (겹치면 발사 즉시 '첫 충돌'로 잡혀 폭탄새 타이머가 돈다)
    var maxY = C.GROUND_Y - ab.r - 2;
    if (y > maxY) y = maxY;
    ab.x = x;
    ab.y = y;
    var v = computeLaunch(x, y);
    G.launchVx = v.vx;
    G.launchVy = v.vy;
  }

  // §9.2 pointerup: 당김거리 < 12px 이면 취소, 아니면 발사
  function release() {
    if (!G || G.state !== 'PLAYING' || G.shot !== 'DRAG' || !G.armedBird) return;
    var ab = G.armedBird;
    if (U.dist(ab.x, ab.y, C.SLING_X, C.SLING_Y) < DRAG_CANCEL_DIST) {
      ab.x = C.SLING_X;
      ab.y = C.SLING_Y;
      G.shot = 'ARMED';
      G.launchVx = 0;
      G.launchVy = 0;
      return;
    }
    fire();
  }

  // §10.2 비행 중 탭 1회
  function tapAbility() {
    if (!G || G.state !== 'PLAYING' || G.shot !== 'FLYING' || G.abilityUsed) return;
    var bird = G.birdBody;
    if (!bird || bird.dead) return;
    var info = BIRD[bird.birdType] || BIRD.red;

    if (info.ability === 'boost') {
      G.abilityUsed = true;
      var vx = bird.vx * YELLOW_BOOST;
      var vy = bird.vy * YELLOW_BOOST;
      var sp = Math.sqrt(vx * vx + vy * vy);
      if (sp > YELLOW_MAX_SPEED) {
        vx *= YELLOW_MAX_SPEED / sp;
        vy *= YELLOW_MAX_SPEED / sp;
      }
      bird.vx = vx;
      bird.vy = vy;
      bird.sleeping = false;
      bird.sleepTimer = 0;
      sfx('launch');
    } else if (info.ability === 'bomb') {
      explode(bird);
    } else {
      G.abilityUsed = true;   // 빨간 새: 능력 없음 (탭만 소비)
    }
  }

  function pause() {
    if (!G || G.state !== 'PLAYING') return;
    if (G.shot === 'DRAG' && G.armedBird) {     // 당기던 새는 앵커로 되돌린다
      G.armedBird.x = C.SLING_X;
      G.armedBird.y = C.SLING_Y;
      G.shot = 'ARMED';
      G.launchVx = 0;
      G.launchVy = 0;
    }
    setState('PAUSED');
  }

  function resume() {
    if (!G || G.state !== 'PAUSED') return;
    setState('PLAYING');
  }

  function retry() {
    if (!G || !G.stageId) return;
    loadStage(G.stageId);
  }

  function toMenu() {
    if (!G) return;
    // 스테이지 파기
    G.world = null;
    G.birdBody = null;
    G.armedBird = null;
    G.birds = [];
    G.firedCount = 0;
    G.particles = [];
    G.shot = 'ARMED';
    G.cam.x = 0;
    G.acc = 0;
    G.stageId = 0;
    G.stageName = '';
    setState('MENU');
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
    toMenu: toMenu
  };
})();
