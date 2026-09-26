/*
 * src/game.js — 게임 상태 머신 (§6), 샷 수명주기 (§6.4), 점수·별 (§11.6), 진행 저장 (§13.3)
 * 노출: GAME = { create, loadStage, update, startDrag, moveDrag, release, fire, tapAbility,
 *                pause, resume, retry, toMenu, toStages }
 * 참조 전역: U, C, MAT, BIRD, P, SB, STAGES, SFX (함수 본문 안에서만)
 *
 * UI 전역은 참조하지 않는다. 화면 반영은 UI.bind 가 등록하는 훅으로 한다:
 *   game.hooks.onState(game, newState, prevState)  — 상태 전이마다
 *   game.hooks.onHud(game)                         — HUD 데이터(game.hud) 갱신마다
 */
(function () {
  'use strict';

  var CANCEL_PULL = 12;       // §9.2 당김거리 12px 미만이면 발사 취소
  var CAM_LEAD = 420;         // §8 카메라 목표 = bird.x - 420
  var OOB_MARGIN_X = 200;     // 월드 밖으로 밀려난 블록/돼지 정리 기준
  var OOB_MARGIN_Y = 100;
  var HIT_SFX_GAP = 0.12;     // 효과음 연타 방지 간격(초)
  var BREAK_SFX_GAP = 0.06;

  var game = null;

  /* ------------------------------------------------------------------ */
  /* 효과음 (모든 호출 try/catch)                                        */
  /* ------------------------------------------------------------------ */

  function sfx(name) {
    try {
      SFX.play(name);
    } catch (e) {
      /* 무음 처리 */
    }
  }

  function sfxThrottled(name, gap) {
    var t = game.sfxTimers;
    if ((t[name] || 0) > 0) return;
    t[name] = gap;
    sfx(name);
  }

  function tickSfxTimers(dt) {
    var t = game.sfxTimers;
    for (var k in t) {
      if (Object.prototype.hasOwnProperty.call(t, k)) t[k] -= dt;
    }
  }

  /* ------------------------------------------------------------------ */
  /* 진행 저장 (§13.3)                                                   */
  /* ------------------------------------------------------------------ */

  function defaultSave() {
    return { v: 1, unlocked: 1, stars: {}, best: {} };
  }

  function sanitizeMap(src, lo, hi) {
    var out = {};
    if (!src || typeof src !== 'object') return out;
    for (var k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
      var v = Number(src[k]);
      if (isFinite(v)) out[k] = U.clamp(v, lo, hi);
    }
    return out;
  }

  function loadSave() {
    try {
      var raw = window.localStorage.getItem(C.SAVE_KEY);
      if (!raw) return defaultSave();
      var s = JSON.parse(raw);
      if (!s || s.v !== 1) return defaultSave();
      return {
        v: 1,
        unlocked: U.clamp(Math.floor(Number(s.unlocked)) || 1, 1, STAGES.length),
        stars: sanitizeMap(s.stars, 0, 3),
        best: sanitizeMap(s.best, 0, Number.MAX_SAFE_INTEGER)
      };
    } catch (e) {
      return defaultSave();
    }
  }

  function writeSave() {
    try {
      window.localStorage.setItem(C.SAVE_KEY, JSON.stringify(game.save));
    } catch (e) {
      /* 저장 실패는 무시 */
    }
  }

  /* ------------------------------------------------------------------ */
  /* 상태 전이                                                           */
  /* ------------------------------------------------------------------ */

  function setState(s) {
    var prev = game.state;
    game.state = s;
    if (game.hooks && typeof game.hooks.onState === 'function') {
      game.hooks.onState(game, s, prev);
    }
  }

  function create(canvas) {
    game = {
      canvas: canvas,
      state: 'MENU',                 // MENU | STAGES | PLAYING | PAUSED | CLEAR | FAIL
      world: P.createWorld(),
      stageId: 0,
      stageName: '',
      stageCount: STAGES.length,
      cam: { x: 0 },
      acc: 0,
      score: 0,
      maxScore: 0,
      shot: 'ARMED',                 // ARMED | DRAG | FLYING | SETTLING
      bird: null,                    // 장전 새(월드 밖 객체) 또는 발사된 새 바디
      birdQueue: [],                 // 아직 장전되지 않은 새 [{type, color, r}]
      flyTime: 0,
      settleTimer: 0,
      abilityUsed: false,
      fuse: 0,
      particles: [],
      aimAngle: -35,                 // §9.3 키보드 조준각(도)
      aimPower: 0.8,                 // §9.3 키보드 파워(0.15~1.0)
      sfxTimers: {},
      save: loadSave(),
      result: null,
      hud: { stage: '스테이지 1', score: '점수 0', birds: [], birdsKey: '' },
      hooks: { onState: null, onHud: null }
    };
    return game;
  }

  /* ------------------------------------------------------------------ */
  /* 스테이지 로드                                                        */
  /* ------------------------------------------------------------------ */

  function spawnDef(world, d) {
    var m = MAT[d.mat] || MAT.wood;
    var opts = {
      isStatic: false,
      density: m.density,
      hp: m.hp,
      e: m.e,
      mu: m.mu,
      kind: d.kind,
      mat: d.mat
    };
    if (d.shape === 'circle') return P.addCircle(world, d.x, d.y, d.r, opts);
    return P.addBox(world, d.x, d.y, d.hw, d.hh, opts);
  }

  function makeBirdSpec(type) {
    var s = BIRD[type] ? type : 'red';
    return { type: s, color: BIRD[s].color, r: BIRD[s].r };
  }

  function loadStage(id) {
    if (!game) return;
    var n = STAGES.length;
    id = U.clamp(Math.floor(Number(id)) || 1, 1, n);
    var stage = STAGES[id - 1];

    var world = P.createWorld();
    // 지면: 정적 박스, 중심 (960, 680), 1920×120 → y 620~740
    P.addBox(world, C.WORLD_W / 2, C.GROUND_Y + 60, C.WORLD_W / 2, 60, {
      isStatic: true,
      hp: Infinity,
      e: MAT.ground.e,
      mu: MAT.ground.mu,
      kind: 'ground',
      mat: 'ground'
    });

    SB.begin();
    stage.build(world);
    var defs = SB.end();

    var pigs = 0;
    var blockScore = 0;
    for (var i = 0; i < defs.length; i++) {
      var d = defs[i];
      spawnDef(world, d);
      if (d.kind === 'pig') {
        pigs++;
      } else {
        blockScore += (MAT[d.mat] ? MAT[d.mat].score : 0);
      }
    }

    game.world = world;
    game.stageId = id;
    game.stageName = stage.name;
    game.birdQueue = [];
    for (var j = 0; j < stage.birds.length; j++) game.birdQueue.push(makeBirdSpec(stage.birds[j]));

    // §11.6 maxScore = 돼지수×SCORE_PIG + 블록 파괴점수 합 + 새 수×SCORE_BIRD_LEFT
    game.maxScore = pigs * C.SCORE_PIG + blockScore + stage.birds.length * C.SCORE_BIRD_LEFT;
    game.score = 0;
    game.particles = [];
    game.acc = 0;
    game.cam.x = 0;
    game.result = null;
    game.sfxTimers = {};

    armNextBird();
    refreshHud();
    setState('PLAYING');
  }

  /* ------------------------------------------------------------------ */
  /* 새 장전 / 조회                                                      */
  /* ------------------------------------------------------------------ */

  function armNextBird() {
    var spec = game.birdQueue.shift();
    game.flyTime = 0;
    game.settleTimer = 0;
    game.abilityUsed = false;
    game.fuse = 0;
    game.shot = 'ARMED';
    if (!spec) {
      game.bird = null;
      return false;
    }
    // ARMED: 앵커에 고정, 물리 비활성(월드에 없음)
    game.bird = {
      shape: 'circle',
      kind: 'bird',
      mat: 'bird',
      birdType: spec.type,
      color: spec.color,
      r: spec.r,
      x: C.SLING_X,
      y: C.SLING_Y,
      vx: 0,
      vy: 0,
      angle: 0,
      launched: false,
      dead: false,
      sleeping: false
    };
    return true;
  }

  function birdsLeft() {
    return game.birdQueue.length + ((game.bird && !game.bird.launched) ? 1 : 0);
  }

  function countPigs() {
    var bodies = game.world.bodies;
    var c = 0;
    for (var i = 0; i < bodies.length; i++) {
      if (bodies[i].kind === 'pig' && !bodies[i].dead) c++;
    }
    return c;
  }

  // 모든 비정적 바디가 잠들었는가 (제거 예약 바디 제외)
  function worldAsleep() {
    var bodies = game.world.bodies;
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (b.isStatic || b.dead) continue;
      if (!b.sleeping) return false;
    }
    return true;
  }

  function birdInWorld() {
    var b = game.bird;
    return !!(b && b.launched && !b.dead && game.world.bodies.indexOf(b) >= 0);
  }

  /* ------------------------------------------------------------------ */
  /* 슬링샷 입력 (§9.2)                                                   */
  /* ------------------------------------------------------------------ */

  function canAim() {
    return !!(game && game.state === 'PLAYING' && game.bird && !game.bird.launched);
  }

  function startDrag(px, py) {
    if (!canAim() || game.shot !== 'ARMED') return false;
    if (U.dist(px, py, C.SLING_X, C.SLING_Y) > C.SLING_GRAB_R) return false;
    game.shot = 'DRAG';
    return true;
  }

  function moveDrag(px, py) {
    if (!canAim() || game.shot !== 'DRAG') return;
    var dx = px - C.SLING_X;
    var dy = py - C.SLING_Y;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > C.SLING_MAX_PULL) {
      var k = C.SLING_MAX_PULL / len;
      dx *= k;
      dy *= k;
    }
    game.bird.x = C.SLING_X + dx;
    game.bird.y = C.SLING_Y + dy;
  }

  function cancelDrag() {
    if (!game || game.shot !== 'DRAG') return;
    if (game.bird && !game.bird.launched) {
      game.bird.x = C.SLING_X;
      game.bird.y = C.SLING_Y;
    }
    game.shot = 'ARMED';
  }

  function release() {
    if (!canAim() || game.shot !== 'DRAG') return false;
    var pull = U.dist(game.bird.x, game.bird.y, C.SLING_X, C.SLING_Y);
    if (pull < CANCEL_PULL) {
      cancelDrag();
      return false;
    }
    return fire();
  }

  // 발사 속도: (앵커 - 새) × LAUNCH_POWER, 크기 MAX_LAUNCH_SPEED 로 클램프
  function launchVelocity(bx, by) {
    var vx = (C.SLING_X - bx) * C.LAUNCH_POWER;
    var vy = (C.SLING_Y - by) * C.LAUNCH_POWER;
    var sp = Math.sqrt(vx * vx + vy * vy);
    if (sp > C.MAX_LAUNCH_SPEED) {
      var k = C.MAX_LAUNCH_SPEED / sp;
      vx *= k;
      vy *= k;
    }
    return { x: vx, y: vy };
  }

  // DRAG 상태의 현재 새 위치에서 발사 (FLYING 진입)
  function fire() {
    if (!canAim() || game.shot !== 'DRAG') return false;
    var held = game.bird;
    var v = launchVelocity(held.x, held.y);
    var body = P.addCircle(game.world, held.x, held.y, held.r, {
      isStatic: false,
      density: MAT.bird.density,
      hp: Infinity,
      e: MAT.bird.e,
      mu: MAT.bird.mu,
      kind: 'bird',
      mat: 'bird'
    });
    body.birdType = held.birdType;
    body.color = held.color;
    body.launched = true;
    body.vx = v.x;
    body.vy = v.y;
    body.angle = Math.atan2(v.y, v.x);

    game.bird = body;
    game.shot = 'FLYING';
    game.flyTime = 0;
    game.abilityUsed = false;
    game.fuse = 0;
    sfx('launch');
    refreshHud();
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* 특수능력 (§10.2)                                                    */
  /* ------------------------------------------------------------------ */

  function tapAbility() {
    if (!game || game.state !== 'PLAYING' || game.shot !== 'FLYING' || game.abilityUsed) return;
    var bird = game.bird;
    if (!bird || bird.dead || !bird.launched) return;
    var spec = BIRD[bird.birdType];
    game.abilityUsed = true;
    if (!spec) return;

    if (spec.ability === 'boost') {
      var vx = bird.vx * spec.boost;
      var vy = bird.vy * spec.boost;
      var sp = Math.sqrt(vx * vx + vy * vy);
      if (sp > spec.maxSpeed) {
        var k = spec.maxSpeed / sp;
        vx *= k;
        vy *= k;
      }
      bird.vx = vx;
      bird.vy = vy;
      bird.sleeping = false;
      bird.sleepTimer = 0;
    } else if (spec.ability === 'bomb') {
      explode();
    }
  }

  function explode() {
    var world = game.world;
    var bird = game.bird;
    if (!bird || bird.dead) return;
    var bx = bird.x;
    var by = bird.y;

    var hits = P.queryRadius(world, bx, by, C.EXPLODE_R);
    for (var i = 0; i < hits.length; i++) {
      var b = hits[i];
      if (b === bird || b.isStatic || b.dead) continue;
      var dx = b.x - bx;
      var dy = b.y - by;
      var d = Math.sqrt(dx * dx + dy * dy);
      var f = 1 - d / C.EXPLODE_R;
      if (f < 0) continue;
      var nx = d > 0 ? dx / d : 0;
      var ny = d > 0 ? dy / d : -1;
      b.vx += nx * C.EXPLODE_IMPULSE * f * b.invMass;
      b.vy += ny * C.EXPLODE_IMPULSE * f * b.invMass;
      b.sleeping = false;
      b.sleepTimer = 0;
      if (b.hp !== Infinity) {
        b.hp -= C.EXPLODE_DMG * f;
        if (b.hp <= 0) {
          b.dead = true;
          world.broken.push(b);
        }
      }
    }

    // 새 바디 제거 (다음 스텝 7단계에서 배열에서 빠진다)
    bird.dead = true;
    game.bird = null;
    spawnParticles(bx, by, '#f2a33c', 20);
    processBroken();
    sfx('break');
    enterSettling();
  }

  /* ------------------------------------------------------------------ */
  /* 파괴 처리 · 파티클 (§10.3, §12.4)                                    */
  /* ------------------------------------------------------------------ */

  function spawnParticles(x, y, color, count) {
    for (var i = 0; i < count; i++) {
      var ang = Math.random() * Math.PI * 2;
      var sp = 120 + Math.random() * 200;
      game.particles.push({
        x: x,
        y: y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 0.7,
        maxLife: 0.7,
        color: color,
        size: 3 + Math.random() * 3
      });
    }
  }

  // world.broken 소비: 점수 + 파티클 + 효과음
  function processBroken() {
    var list = game.world.broken;
    if (!list || list.length === 0) return false;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (b.kind === 'pig') {
        game.score += C.SCORE_PIG;
        spawnParticles(b.x, b.y, '#7fc855', 8);
      } else if (b.kind === 'block') {
        var m = MAT[b.mat];
        game.score += m ? m.score : 0;
        spawnParticles(b.x, b.y, m ? m.color : '#ffffff', 10);
      }
    }
    list.length = 0;
    sfxThrottled('break', BREAK_SFX_GAP);
    return true;
  }

  function updateParticles(dt) {
    var list = game.particles;
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      p.vy += C.GRAVITY * 0.5 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life > 0) out.push(p);
    }
    game.particles = out;
  }

  // 물리 서브스텝 직후 처리
  function afterStep() {
    var world = game.world;
    var bodies = world.bodies;
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (b.isStatic || b.dead || b.kind === 'bird') continue;
      if (b.y > C.WORLD_H + OOB_MARGIN_Y || b.x < -OOB_MARGIN_X || b.x > C.WORLD_W + OOB_MARGIN_X) {
        b.dead = true;
        world.broken.push(b);
      }
    }
    var broke = processBroken();
    if (!broke && world.impacts > 0) sfxThrottled('hit', HIT_SFX_GAP);
  }

  /* ------------------------------------------------------------------ */
  /* 샷 수명주기 (§6.4)                                                  */
  /* ------------------------------------------------------------------ */

  function enterSettling() {
    game.shot = 'SETTLING';
    game.settleTimer = 0;
  }

  function shouldSettle() {
    if (game.flyTime > C.SETTLE_TIMEOUT) return true;
    var inWorld = birdInWorld();
    var b = game.bird;
    if (inWorld && (b.x < -50 || b.x > C.WORLD_W + 50 || b.y > C.WORLD_H + 100)) return true;
    if (!worldAsleep()) return false;
    return !inWorld || b.sleeping;
  }

  function retireBird() {
    var b = game.bird;
    if (b && b.launched && !b.dead) b.dead = true;
    game.bird = null;
  }

  function judge() {
    // 돼지 0 → CLEAR
    if (countPigs() === 0) {
      stageClear();
      return;
    }
    // (발사 전 새가 남아 있는 경우: 장전 상태로 복귀)
    if (game.bird && !game.bird.launched) {
      game.shot = 'ARMED';
      return;
    }
    // 새 남음 → 새 바디 제거 후 다음 새 장전
    if (game.birdQueue.length > 0) {
      retireBird();
      armNextBird();
      refreshHud();
      return;
    }
    // 새 소진 & 돼지 잔존: §6.2 "월드 정지" 확인 후 FAIL (최대 SETTLE_TIMEOUT 까지만 대기)
    if (worldAsleep() || game.settleTimer >= C.SETTLE_TIMEOUT) {
      stageFail();
    }
  }

  function updateShot(dt) {
    var bird = game.bird;
    switch (game.shot) {
      case 'ARMED':
      case 'DRAG':
        // 잔해에 마지막 돼지가 죽은 경우
        if (countPigs() === 0) {
          cancelDrag();
          enterSettling();
        }
        break;

      case 'FLYING':
        game.flyTime += dt;
        if (bird && !bird.dead) {
          if (bird.vx * bird.vx + bird.vy * bird.vy > 400) {
            bird.angle = Math.atan2(bird.vy, bird.vx);   // §12.3 렌더 전용 회전
          }
          var spec = BIRD[bird.birdType];
          if (spec && spec.ability === 'bomb' && !game.abilityUsed && bird.touched) {
            // 첫 충돌 후 fuse(0.6초) 경과 시 자동 폭발
            game.fuse += dt;
            if (game.fuse >= spec.fuse) {
              game.abilityUsed = true;
              explode();
              break;
            }
          }
        }
        if (shouldSettle()) enterSettling();
        break;

      case 'SETTLING':
        game.settleTimer += dt;
        if (game.settleTimer >= C.SETTLE_GRACE) judge();
        break;
    }
  }

  /* ------------------------------------------------------------------ */
  /* 클리어 / 실패                                                       */
  /* ------------------------------------------------------------------ */

  function starsFor(score, maxScore) {
    if (score >= maxScore * 0.75) return 3;
    if (score >= maxScore * 0.50) return 2;
    return 1;
  }

  function stageClear() {
    var left = birdsLeft();
    game.score += left * C.SCORE_BIRD_LEFT;
    var stars = starsFor(game.score, game.maxScore);
    var id = game.stageId;
    var s = game.save;
    s.unlocked = Math.min(game.stageCount, Math.max(s.unlocked, id + 1));
    s.stars[id] = Math.max(s.stars[id] || 0, stars);
    s.best[id] = Math.max(s.best[id] || 0, game.score);
    writeSave();

    game.result = {
      cleared: true,
      stageId: id,
      stars: stars,
      score: game.score,
      scoreText: '점수 ' + U.fmt(game.score),
      birdsLeft: left,
      isLast: id >= game.stageCount
    };
    refreshHud();
    sfx('win');
    setState('CLEAR');
  }

  function stageFail() {
    game.result = {
      cleared: false,
      stageId: game.stageId,
      stars: 0,
      score: game.score,
      scoreText: '점수 ' + U.fmt(game.score),
      birdsLeft: 0,
      isLast: game.stageId >= game.stageCount
    };
    sfx('lose');
    setState('FAIL');
  }

  /* ------------------------------------------------------------------ */
  /* 카메라 · HUD                                                        */
  /* ------------------------------------------------------------------ */

  function updateCamera(dt) {
    var target = 0;
    if (game.shot === 'FLYING' && game.bird && !game.bird.dead) {
      target = U.clamp(game.bird.x - CAM_LEAD, 0, C.WORLD_W - C.VIEW_W);
    }
    game.cam.x = U.lerp(game.cam.x, target, 1 - Math.pow(0.001, dt));
  }

  function refreshHud() {
    var h = game.hud;
    h.stage = '스테이지 ' + game.stageId;
    h.score = '점수 ' + U.fmt(game.score);
    var colors = [];
    if (game.bird && !game.bird.launched) colors.push(game.bird.color);
    for (var i = 0; i < game.birdQueue.length; i++) colors.push(game.birdQueue[i].color);
    h.birds = colors;
    h.birdsKey = colors.join('|');
    if (game.hooks && typeof game.hooks.onHud === 'function') game.hooks.onHud(game);
  }

  /* ------------------------------------------------------------------ */
  /* 프레임 업데이트 (§7)                                                */
  /* ------------------------------------------------------------------ */

  function update(dt) {
    if (!game || game.state !== 'PLAYING') return;

    // 고정 스텝 누적 → P.step 반복
    game.acc += dt;
    var steps = 0;
    while (game.acc >= C.FIXED_DT && steps < C.MAX_STEPS) {
      P.step(game.world, C.FIXED_DT);
      afterStep();
      game.acc -= C.FIXED_DT;
      steps++;
    }
    if (steps === C.MAX_STEPS) game.acc = 0;

    tickSfxTimers(dt);
    updateShot(dt);        // 샷 수명주기 (CLEAR/FAIL 전이 포함)
    updateParticles(dt);
    updateCamera(dt);
    refreshHud();          // HUD 갱신
  }

  /* ------------------------------------------------------------------ */
  /* 상태 전이 API (§6.2)                                                */
  /* ------------------------------------------------------------------ */

  // PLAYING → PAUSED (#btn-pause, visibilitychange, Esc)
  function pause() {
    if (!game || game.state !== 'PLAYING') return;
    cancelDrag();
    setState('PAUSED');
  }

  // PAUSED → PLAYING (#btn-resume, Esc)
  function resume() {
    if (!game || game.state !== 'PAUSED') return;
    setState('PLAYING');
  }

  // PAUSED / CLEAR / FAIL → PLAYING (현재 스테이지 재로드)
  function retry() {
    if (!game || game.stageId < 1) return;
    var s = game.state;
    if (s !== 'PAUSED' && s !== 'CLEAR' && s !== 'FAIL' && s !== 'PLAYING') return;
    loadStage(game.stageId);
  }

  // → MENU (스테이지 파기)
  function toMenu() {
    if (!game) return;
    game.world = P.createWorld();
    game.bird = null;
    game.birdQueue = [];
    game.particles = [];
    game.shot = 'ARMED';
    game.acc = 0;
    game.cam.x = 0;
    game.result = null;
    setState('MENU');
  }

  // MENU → STAGES
  function toStages() {
    if (!game || game.state !== 'MENU') return;
    setState('STAGES');
  }

  window.GAME = {
    create: create,
    loadStage: loadStage,
    update: update,
    startDrag: startDrag,
    moveDrag: moveDrag,
    release: release,
    fire: fire,
    tapAbility: tapAbility,
    pause: pause,
    resume: resume,
    retry: retry,
    toMenu: toMenu,
    toStages: toStages
  };
})();
