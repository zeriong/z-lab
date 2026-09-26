// game.js — §6 상태 머신, 샷 수명주기, 점수/저장. U, C, MAT, BIRD, P, SB, STAGES, SFX 참조.
// UI 는 함수 본문 안에서만(호출 시점) 참조한다.
(function () {
  'use strict';

  var G = null; // 단일 게임 객체

  // ---------------------------------------------------------------
  // 저장 (§13.3)
  // ---------------------------------------------------------------
  function defaultSave() {
    return { v: 1, unlocked: 1, stars: {}, best: {} };
  }

  function loadSave() {
    try {
      var raw = window.localStorage.getItem(C.SAVE_KEY);
      if (!raw) return defaultSave();
      var s = JSON.parse(raw);
      if (!s || s.v !== 1) return defaultSave();
      var out = defaultSave();
      out.unlocked = U.clamp(parseInt(s.unlocked, 10) || 1, 1, 10);
      if (s.stars && typeof s.stars === 'object') out.stars = s.stars;
      if (s.best && typeof s.best === 'object') out.best = s.best;
      return out;
    } catch (e) {
      return defaultSave();
    }
  }

  function persistSave() {
    try {
      window.localStorage.setItem(C.SAVE_KEY, JSON.stringify(G.save));
    } catch (e) {
      // 저장 실패는 무시
    }
  }

  // ---------------------------------------------------------------
  // UI 브리지 (ui.js 는 뒤에 로드되므로 호출 시점에만 참조)
  // ---------------------------------------------------------------
  function uiScreen(name) {
    if (window.UI && UI.setScreen) UI.setScreen(name);
  }

  function uiHud() {
    if (window.UI && UI.updateHud) UI.updateHud(G);
  }

  // ---------------------------------------------------------------
  // 생성
  // ---------------------------------------------------------------
  function create(canvas) {
    G = {
      canvas: canvas,
      state: 'MENU',
      stageId: 1,
      stage: null,
      world: null,
      cam: { x: 0 },
      score: 0,
      maxScore: 0,
      shot: 'ARMED',
      armed: null,      // 장전된 새 {key, x, y, r, color} (월드에 없음)
      bird: null,       // 비행 중인 새 바디
      birds: [],        // 아직 발사하지 않은 새 키 배열 (index 0 = 장전 대상)
      flyTime: 0,
      settleTimer: 0,
      abilityUsed: false,
      blackTimer: 0,
      particles: [],
      acc: 0,
      aimAngle: -35,    // 키보드 조준각(도)
      aimPower: 0.8,    // 키보드 파워
      lastStars: 0,
      save: loadSave()
    };
    return G;
  }

  // ---------------------------------------------------------------
  // 스테이지 로드
  // ---------------------------------------------------------------
  function loadStage(id) {
    id = U.clamp(id | 0, 1, STAGES.length);
    var stage = STAGES[id - 1];
    var world = P.createWorld();

    // 지면 (정적 박스: 중심 (960,680), 1920×120 → y 620~740)
    P.addBox(world, {
      x: 960, y: 680, hw: 960, hh: 60,
      kind: 'ground', mat: 'ground', isStatic: true,
      density: 0, hp: Infinity, e: MAT.ground.e, mu: MAT.ground.mu
    });

    stage.build(world);

    G.stageId = id;
    G.stage = stage;
    G.world = world;
    G.birds = stage.birds.slice();
    G.score = 0;
    G.particles = [];
    G.acc = 0;
    G.cam.x = 0;
    G.flyTime = 0;
    G.settleTimer = 0;
    G.abilityUsed = false;
    G.blackTimer = 0;
    G.bird = null;
    G.lastStars = 0;

    // §11.6 별 기준용 최대 점수
    var pigs = 0, blockScore = 0;
    for (var i = 0; i < world.bodies.length; i++) {
      var b = world.bodies[i];
      if (b.kind === 'pig') pigs++;
      else if (b.kind === 'block') blockScore += (MAT[b.mat] ? MAT[b.mat].score : 0);
    }
    G.maxScore = pigs * C.SCORE_PIG + blockScore + G.birds.length * C.SCORE_BIRD_LEFT;

    arm();
    G.state = 'PLAYING';
    uiScreen('none');
    uiHud();
  }

  // 다음 새 장전 (월드 밖, 앵커 위치)
  function arm() {
    G.shot = 'ARMED';
    G.bird = null;
    if (G.birds.length === 0) { G.armed = null; return; }
    var key = G.birds[0];
    var bd = BIRD[key] || BIRD.red;
    G.armed = { key: key, x: C.SLING_X, y: C.SLING_Y, r: bd.r, color: bd.color };
  }

  // ---------------------------------------------------------------
  // 파티클 (§12.4) — 물리 스텝 밖이므로 Math.random 사용
  // ---------------------------------------------------------------
  function spawnParticles(x, y, n, color) {
    for (var i = 0; i < n; i++) {
      var ang = Math.random() * Math.PI * 2;
      var sp = 120 + Math.random() * 200;
      G.particles.push({
        x: x, y: y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 0.7, maxLife: 0.7,
        color: color,
        size: 3 + Math.random() * 5
      });
    }
  }

  function updateParticles(dt) {
    var ps = G.particles;
    for (var i = ps.length - 1; i >= 0; i--) {
      var p = ps[i];
      p.vy += C.GRAVITY * 0.5 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) ps.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------
  // 물리 이벤트 소비 (점수·파티클·효과음)
  // ---------------------------------------------------------------
  function drainEvents() {
    var ev = G.world.events;
    if (ev.length === 0) return;
    var hitPlayed = false;
    for (var i = 0; i < ev.length; i++) {
      var e = ev[i];
      if (e.type === 'hit') {
        if (!hitPlayed) { SFX.play('hit'); hitPlayed = true; }
      } else if (e.type === 'break') {
        var b = e.body;
        if (b.kind === 'pig') {
          G.score += C.SCORE_PIG;
          spawnParticles(b.x, b.y, 8, '#7fc855');
        } else if (b.kind === 'block') {
          var m = MAT[b.mat];
          G.score += m ? m.score : 0;
          spawnParticles(b.x, b.y, 10, m ? m.color : '#ffffff');
        }
        SFX.play('break');
      }
    }
    G.world.events = [];
  }

  // ---------------------------------------------------------------
  // 발사 (§9.2)
  // ---------------------------------------------------------------
  function launchVel(x, y) {
    var vx = (C.SLING_X - x) * C.LAUNCH_POWER;
    var vy = (C.SLING_Y - y) * C.LAUNCH_POWER;
    var sp = Math.sqrt(vx * vx + vy * vy);
    if (sp > C.MAX_LAUNCH_SPEED) {
      vx = vx / sp * C.MAX_LAUNCH_SPEED;
      vy = vy / sp * C.MAX_LAUNCH_SPEED;
    }
    return { vx: vx, vy: vy };
  }

  function fire() {
    var a = G.armed;
    if (!a) return;
    var bd = BIRD[a.key] || BIRD.red;
    var m = MAT.bird;
    var body = P.addCircle(G.world, {
      x: a.x, y: a.y, r: bd.r,
      kind: 'bird', mat: 'bird', bird: a.key, isStatic: false,
      density: m.density, hp: m.hp, e: m.e, mu: m.mu
    });
    var v = launchVel(a.x, a.y);
    body.vx = v.vx;
    body.vy = v.vy;
    body.angle = Math.atan2(v.vy, v.vx);

    G.birds.shift();
    G.armed = null;
    G.bird = body;
    G.shot = 'FLYING';
    G.flyTime = 0;
    G.abilityUsed = false;
    G.blackTimer = 0;
    SFX.play('launch');
    uiHud();
  }

  function startDrag(px, py) {
    if (G.state !== 'PLAYING' || G.shot !== 'ARMED' || !G.armed) return;
    if (U.dist(px, py, C.SLING_X, C.SLING_Y) > C.SLING_GRAB_R) return;
    G.shot = 'DRAG';
    moveDrag(px, py);
  }

  function moveDrag(px, py) {
    if (G.state !== 'PLAYING' || G.shot !== 'DRAG' || !G.armed) return;
    var dx = px - C.SLING_X;
    var dy = py - C.SLING_Y;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > C.SLING_MAX_PULL) {
      dx = dx / len * C.SLING_MAX_PULL;
      dy = dy / len * C.SLING_MAX_PULL;
    }
    G.armed.x = C.SLING_X + dx;
    G.armed.y = C.SLING_Y + dy;
  }

  function cancelDrag() {
    if (G.armed) {
      G.armed.x = C.SLING_X;
      G.armed.y = C.SLING_Y;
    }
    G.shot = 'ARMED';
  }

  function release() {
    if (G.state !== 'PLAYING' || G.shot !== 'DRAG' || !G.armed) return;
    var pull = U.dist(G.armed.x, G.armed.y, C.SLING_X, C.SLING_Y);
    if (pull < 12) { cancelDrag(); return; }
    fire();
  }

  // ---------------------------------------------------------------
  // 특수 능력 (§10.2)
  // ---------------------------------------------------------------
  function tapAbility() {
    if (G.state !== 'PLAYING' || G.shot !== 'FLYING' || G.abilityUsed || !G.bird) return;
    var key = G.bird.bird;
    if (key === 'yellow') {
      var b = G.bird;
      var vx = b.vx * 1.9, vy = b.vy * 1.9;
      var sp = Math.sqrt(vx * vx + vy * vy);
      if (sp > 2400) { vx = vx / sp * 2400; vy = vy / sp * 2400; }
      b.vx = vx; b.vy = vy;
      b.sleeping = false; b.sleepTimer = 0;
      G.abilityUsed = true;
      SFX.play('launch');
    } else if (key === 'black') {
      explode();
    } else {
      G.abilityUsed = true;
    }
  }

  function explode() {
    var bird = G.bird;
    if (!bird) return;
    var world = G.world;
    var cx = bird.x, cy = bird.y;
    var list = P.queryRadius(world, cx, cy, C.EXPLODE_R);
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (b === bird || b.isStatic) continue;
      var dx = b.x - cx, dy = b.y - cy;
      var d = Math.sqrt(dx * dx + dy * dy);
      var f = 1 - d / C.EXPLODE_R;
      if (f < 0) continue;
      var nx, ny;
      if (d === 0) { nx = 0; ny = -1; } else { nx = dx / d; ny = dy / d; }
      b.sleeping = false;
      b.sleepTimer = 0;
      b.vx += nx * C.EXPLODE_IMPULSE * f * b.invMass;
      b.vy += ny * C.EXPLODE_IMPULSE * f * b.invMass;
      if (b.hp !== Infinity) {
        b.hp -= C.EXPLODE_DMG * f;
        if (b.hp <= 0 && !b.dead) {
          b.dead = true;
          world.events.push({ type: 'break', body: b });
        }
      }
    }
    spawnParticles(cx, cy, 20, '#f2a33c');
    SFX.play('break');

    // 새 제거 + dead 바디 즉시 정리
    bird.dead = true;
    var alive = [];
    for (var k = 0; k < world.bodies.length; k++) {
      if (!world.bodies[k].dead) alive.push(world.bodies[k]);
    }
    world.bodies = alive;
    drainEvents();

    G.bird = null;
    G.abilityUsed = true;
    enterSettling();
  }

  // ---------------------------------------------------------------
  // 샷 수명주기 (§6.4)
  // ---------------------------------------------------------------
  function enterSettling() {
    G.shot = 'SETTLING';
    G.settleTimer = 0;
  }

  function removeBird() {
    var bird = G.bird;
    if (!bird) return;
    var bodies = G.world.bodies;
    var alive = [];
    for (var i = 0; i < bodies.length; i++) {
      if (bodies[i] !== bird) alive.push(bodies[i]);
    }
    G.world.bodies = alive;
    G.bird = null;
  }

  function countPigs() {
    var n = 0;
    var bodies = G.world.bodies;
    for (var i = 0; i < bodies.length; i++) {
      if (bodies[i].kind === 'pig' && !bodies[i].dead) n++;
    }
    return n;
  }

  function allAsleep() {
    var bodies = G.world.bodies;
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (b.isStatic || b.dead) continue;
      if (!b.sleeping) return false;
    }
    return true;
  }

  function birdOutOfWorld(b) {
    return b.x < -50 || b.x > C.WORLD_W + 50 || b.y > C.WORLD_H + 100;
  }

  function updateFlying(dt) {
    var bird = G.bird;
    G.flyTime += dt;

    if (bird) {
      // §12.3 렌더 회전
      if (!bird.sleeping && (bird.vx !== 0 || bird.vy !== 0)) {
        bird.angle = Math.atan2(bird.vy, bird.vx);
      }
      // 폭탄새: 첫 충돌 후 0.6초 자동 폭발
      if (bird.bird === 'black' && !G.abilityUsed && bird.touched) {
        G.blackTimer += dt;
        if (G.blackTimer >= 0.6) { explode(); return; }
      }
      if (birdOutOfWorld(bird)) {
        removeBird();
        enterSettling();
        return;
      }
    }

    var birdDone = !bird || bird.sleeping;
    if ((birdDone && allAsleep()) || G.flyTime > C.SETTLE_TIMEOUT) {
      enterSettling();
    }
  }

  function updateSettling(dt) {
    G.settleTimer += dt;
    if (G.settleTimer < C.SETTLE_GRACE) return;
    removeBird();
    if (countPigs() === 0) {
      clearStage();
    } else if (G.birds.length > 0) {
      arm();
      G.flyTime = 0;
    } else {
      failStage();
    }
  }

  // ---------------------------------------------------------------
  // 결과
  // ---------------------------------------------------------------
  function computeStars(score, maxScore) {
    var stars = 1;
    if (score >= maxScore * 0.5) stars = 2;
    if (score >= maxScore * 0.75) stars = 3;
    return stars;
  }

  function clearStage() {
    G.score += G.birds.length * C.SCORE_BIRD_LEFT;
    var stars = computeStars(G.score, G.maxScore);
    G.lastStars = stars;

    var s = G.save;
    var id = G.stageId;
    s.unlocked = Math.min(10, Math.max(s.unlocked, id + 1));
    s.stars[id] = Math.max(s.stars[id] || 0, stars);
    s.best[id] = Math.max(s.best[id] || 0, G.score);
    persistSave();

    G.state = 'CLEAR';
    G.shot = 'ARMED';
    SFX.play('win');
    uiHud();
    if (window.UI && UI.showClear) UI.showClear(G);
  }

  function failStage() {
    G.state = 'FAIL';
    G.shot = 'ARMED';
    SFX.play('lose');
    uiHud();
    if (window.UI && UI.showFail) UI.showFail(G);
  }

  // ---------------------------------------------------------------
  // 갱신 (§6.3, §7)
  // ---------------------------------------------------------------
  function update(dt) {
    if (!G || G.state !== 'PLAYING') return;
    if (!G.world) return;

    // 고정 스텝 누적
    G.acc += dt;
    var steps = 0;
    while (G.acc >= C.FIXED_DT && steps < C.MAX_STEPS) {
      P.step(G.world, C.FIXED_DT);
      G.acc -= C.FIXED_DT;
      steps++;
    }
    if (steps === C.MAX_STEPS) G.acc = 0;
    drainEvents();

    // 샷 수명주기
    if (G.shot === 'FLYING') updateFlying(dt);
    else if (G.shot === 'SETTLING') updateSettling(dt);

    updateParticles(dt);

    // 카메라 (§8)
    var target = 0;
    if (G.shot === 'FLYING' && G.bird) {
      target = U.clamp(G.bird.x - 420, 0, C.WORLD_W - C.VIEW_W);
    }
    G.cam.x = U.lerp(G.cam.x, target, 1 - Math.pow(0.001, dt));

    uiHud();
  }

  // ---------------------------------------------------------------
  // 상태 전이 (§6.2)
  // ---------------------------------------------------------------
  function pause() {
    if (!G || G.state !== 'PLAYING') return;
    if (G.shot === 'DRAG') cancelDrag();
    G.state = 'PAUSED';
    uiScreen('pause');
    uiHud();
  }

  function resume() {
    if (!G || G.state !== 'PAUSED') return;
    G.state = 'PLAYING';
    G.acc = 0;
    uiScreen('none');
    uiHud();
  }

  function retry() {
    if (!G) return;
    loadStage(G.stageId);
  }

  function toMenu() {
    if (!G) return;
    G.state = 'MENU';
    G.world = null;
    G.bird = null;
    G.armed = null;
    G.particles = [];
    G.shot = 'ARMED';
    G.cam.x = 0;
    uiScreen('main');
    uiHud();
  }

  function toStages() {
    if (!G) return;
    G.state = 'STAGES';
    G.world = null;
    G.bird = null;
    G.armed = null;
    G.particles = [];
    G.shot = 'ARMED';
    G.cam.x = 0;
    uiScreen('stages');
    uiHud();
  }

  function startFromMenu() {
    loadStage(G.save.unlocked);
  }

  function nextStage() {
    if (!G || G.stageId >= STAGES.length) return;
    loadStage(G.stageId + 1);
  }

  function togglePause() {
    if (!G) return;
    if (G.state === 'PLAYING') pause();
    else if (G.state === 'PAUSED') resume();
  }

  function getSave() {
    return G ? G.save : defaultSave();
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
    startFromMenu: startFromMenu,
    nextStage: nextStage,
    togglePause: togglePause,
    getSave: getSave
  };
})();
