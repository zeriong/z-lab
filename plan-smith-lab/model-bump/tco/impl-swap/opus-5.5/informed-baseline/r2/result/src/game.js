/*
 * game.js — 게임 상태 머신(§6), 샷 수명주기(§6.4), 카메라(§8), 점수·별(§11.6), 진행 저장(§13.3)
 * 노출: window.GAME
 * 참조: U, C, MAT, BIRD, P, SB, STAGES, SFX (전부 이 파일보다 먼저 로드됨)
 *
 * UI 전역은 참조하지 않는다. 화면 전환과 HUD 갱신은 ui.js 가 UI.bind(game) 에서
 * game.onState(state, game) / game.onHud(game) 훅을 설치해 받아 간다.
 *
 * 상태: 'MENU' | 'STAGES' | 'PLAYING' | 'PAUSED' | 'CLEAR' | 'FAIL'
 * 샷:   'ARMED' | 'DRAG' | 'FLYING' | 'SETTLING'
 */
(function () {
  'use strict';

  // ---- 플랜 본문에 명시된 보조 수치(§4.2 표 밖이라 C 에 넣지 않음) ----
  var DRAG_CANCEL_DIST = 12;        // §9.2 당김 < 12px 이면 발사 취소
  var BLACK_FUSE_TIME = 0.6;        // §10.2 첫 충돌 후 자동 폭발까지
  var YELLOW_BOOST = 1.9;           // §10.2
  var YELLOW_MAX_SPEED = 2400;      // §10.2
  var CAM_LEAD = 420;               // §8 cam.x = bird.x - 420
  var OUT_MARGIN_X = 50;            // §6.4 x < -50, x > WORLD_W + 50
  var OUT_MARGIN_BOTTOM = 100;      // §6.4 y > WORLD_H + 100
  var PARTICLE_LIFE = 0.7;          // §12.4
  var PARTICLE_SPEED_MIN = 120;     // §12.4
  var PARTICLE_SPEED_MAX = 320;     // §12.4
  var PARTICLES_BLOCK = 10;         // §12.4
  var PARTICLES_PIG = 8;            // §10.3 / §12.4
  var PARTICLES_EXPLODE = 20;       // §12.4
  var PIG_PARTICLE_COLOR = '#7fc855';
  var EXPLODE_PARTICLE_COLOR = '#f2a33c';
  var AIM_DEFAULT_ANGLE = -35;      // §9.3
  var AIM_DEFAULT_POWER = 0.8;      // §9.3
  var SFX_HIT_GAP = 0.08;           // 효과음 과다 재생 억제
  var SFX_BREAK_GAP = 0.05;

  var G = null;
  var visibilityBound = false;

  // ---------------------------------------------------------------
  // 효과음 (모든 호출을 try/catch 로 감싼다, §16)
  // ---------------------------------------------------------------
  function playSfx(g, name) {
    if (g && (name === 'hit' || name === 'break')) {
      var key = name === 'hit' ? 'lastHitSfx' : 'lastBreakSfx';
      var gap = name === 'hit' ? SFX_HIT_GAP : SFX_BREAK_GAP;
      if (g.time - g[key] < gap) return;
      g[key] = g.time;
    }
    try {
      SFX.play(name);
    } catch (e) {
      /* 무음 */
    }
  }

  // ---------------------------------------------------------------
  // 진행 저장 (§13.3)
  // ---------------------------------------------------------------
  function defaultSave() {
    return { v: 1, unlocked: 1, stars: {}, best: {} };
  }

  function copyNumbers(src, dst, lo, hi) {
    if (!src || typeof src !== 'object') return;
    for (var k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
      var v = Number(src[k]);
      if (isFinite(v)) dst[k] = U.clamp(Math.floor(v), lo, hi);
    }
  }

  function readSave() {
    var s = defaultSave();
    try {
      var raw = window.localStorage.getItem(C.SAVE_KEY);
      if (!raw) return s;
      var o = JSON.parse(raw);
      if (!o || typeof o !== 'object') return s;
      var u = Math.floor(Number(o.unlocked));
      if (u >= 1) s.unlocked = Math.min(u, STAGES.length);
      copyNumbers(o.stars, s.stars, 0, 3);
      copyNumbers(o.best, s.best, 0, Infinity);
    } catch (e) {
      s = defaultSave();
    }
    return s;
  }

  function writeSave(s) {
    try {
      window.localStorage.setItem(C.SAVE_KEY, JSON.stringify(s));
    } catch (e) {
      /* 저장 불가 환경(사생활 모드 등): 무시 */
    }
  }

  // ---------------------------------------------------------------
  // 공통 도우미
  // ---------------------------------------------------------------
  function setState(g, next) {
    g.state = next;
    g.acc = 0;
    if (typeof g.onState === 'function') g.onState(next, g);
  }

  function findStage(id) {
    for (var i = 0; i < STAGES.length; i++) {
      if (STAGES[i].id === id) return STAGES[i];
    }
    return null;
  }

  function matOpts(key, kind) {
    var m = MAT[key];
    return { density: m.density, e: m.e, mu: m.mu, hp: m.hp, kind: kind, mat: key };
  }

  function isOutOfWorld(b) {
    return b.x < -OUT_MARGIN_X || b.x > C.WORLD_W + OUT_MARGIN_X || b.y > C.WORLD_H + OUT_MARGIN_BOTTOM;
  }

  function removeBody(world, body) {
    if (!world || !body) return;
    body.dead = true;
    var i = world.bodies.indexOf(body);
    if (i >= 0) world.bodies.splice(i, 1);
  }

  function countPigs(g) {
    if (!g.world) return 0;
    var n = 0;
    var list = g.world.bodies;
    for (var i = 0; i < list.length; i++) {
      if (list[i].kind === 'pig' && !list[i].dead) n++;
    }
    return n;
  }

  // hp 가 0 이하인데 아직 파괴 처리(점수·파티클)가 안 된 바디가 있는가
  // (폭발 피해 / 월드 이탈은 다음 P.step 의 파괴 큐에서 수거되므로, 판정을 한 프레임 미룬다)
  function hasPendingBreaks(g) {
    var list = g.world.bodies;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (!b.dead && b.hp <= 0) return true;
    }
    return false;
  }

  // 새가 지면 아래로 파고든 채 발사되지 않도록(스폰 즉시 지면 접촉 -> 폭탄새 오폭 방지)
  function keepBirdAboveGround(bird) {
    var maxY = C.GROUND_Y - bird.r;
    if (bird.y > maxY) bird.y = maxY;
  }

  function spawnParticles(g, x, y, count, color, spreadX, spreadY) {
    for (var i = 0; i < count; i++) {
      var ang = Math.random() * Math.PI * 2;
      var sp = PARTICLE_SPEED_MIN + Math.random() * (PARTICLE_SPEED_MAX - PARTICLE_SPEED_MIN);
      g.particles.push({
        x: x + (Math.random() * 2 - 1) * (spreadX || 0),
        y: y + (Math.random() * 2 - 1) * (spreadY || 0),
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: PARTICLE_LIFE,
        maxLife: PARTICLE_LIFE,
        color: color,
        size: 3 + Math.random() * 4
      });
    }
  }

  // ---------------------------------------------------------------
  // GAME.create
  // ---------------------------------------------------------------
  function onVisibilityChange() {
    if (document.hidden && G && G.state === 'PLAYING') pause();   // PLAYING -> PAUSED (탭 비활성)
  }

  function create(canvas) {
    G = {
      canvas: canvas,
      state: 'MENU',
      stageId: 0,
      stageName: '',
      world: null,
      cam: { x: 0 },
      acc: 0,
      time: 0,
      shot: 'ARMED',
      bird: null,
      birdQueue: [],
      birdsTotal: 0,
      flyTime: 0,
      settleTimer: 0,
      score: 0,
      maxScore: 0,
      particles: [],
      aimAngle: AIM_DEFAULT_ANGLE,
      aimPower: AIM_DEFAULT_POWER,
      save: readSave(),
      result: null,
      lastHitSfx: -1,
      lastBreakSfx: -1,
      onState: null,     // ui.js 가 설치
      onHud: null        // ui.js 가 설치
    };
    if (!visibilityBound) {
      document.addEventListener('visibilitychange', onVisibilityChange);
      visibilityBound = true;
    }
    return G;
  }

  // ---------------------------------------------------------------
  // GAME.loadStage (1~10)
  // ---------------------------------------------------------------
  function loadStage(id) {
    var g = G;
    if (!g) return false;
    var st = findStage(Number(id));
    if (!st) return false;

    var world = P.createWorld();

    // 지면: 정적 박스, 중심 (960, 680), 1920 x 120 -> y 620~740
    P.addBox(world, 960, 680, 960, 60, {
      isStatic: true,
      kind: 'ground',
      mat: 'ground',
      e: MAT.ground.e,
      mu: MAT.ground.mu,
      hp: Infinity
    });

    var list = st.build(world) || [];
    var pigs = 0;
    var blockScore = 0;
    for (var i = 0; i < list.length; i++) {
      var d = list[i];
      if (d.type === 'pig') {
        P.addCircle(world, d.x, d.y, d.r, matOpts('pig', 'pig'));
        pigs++;
      } else {
        P.addBox(world, d.x, d.y, d.hw, d.hh, matOpts(d.mat, 'block'));
        blockScore += MAT[d.mat].score;
      }
    }

    g.world = world;
    g.stageId = st.id;
    g.stageName = st.name;
    g.birdQueue = st.birds.slice();
    g.birdsTotal = st.birds.length;
    g.score = 0;
    // §11.6 maxScore = 돼지수 x SCORE_PIG + 블록 파괴점수 합 + 새 수 x SCORE_BIRD_LEFT
    g.maxScore = pigs * C.SCORE_PIG + blockScore + st.birds.length * C.SCORE_BIRD_LEFT;
    g.particles = [];
    g.acc = 0;
    g.cam.x = 0;
    g.result = null;

    armNextBird(g);
    setState(g, 'PLAYING');
    return true;
  }

  // 다음 새 장전 -> ARMED (새는 월드에 없음)
  function armNextBird(g) {
    var type = g.birdQueue.shift();
    var spec = BIRD[type] || BIRD.red;
    g.bird = {
      type: BIRD[type] ? type : 'red',
      color: spec.color,
      r: spec.r,
      ability: spec.ability,
      x: C.SLING_X,
      y: C.SLING_Y,
      angle: 0,
      body: null,
      abilityUsed: false,
      fuse: -1,          // 폭탄새 자동 폭발 타이머(-1 = 미점화)
      gone: false
    };
    g.shot = 'ARMED';
    g.flyTime = 0;
    g.settleTimer = 0;
  }

  // ---------------------------------------------------------------
  // 슬링샷 입력 (§9.2)
  // ---------------------------------------------------------------
  function startDrag(px, py) {
    var g = G;
    if (!g || g.state !== 'PLAYING' || g.shot !== 'ARMED' || !g.bird) return false;
    if (U.dist(px, py, C.SLING_X, C.SLING_Y) > C.SLING_GRAB_R) return false;
    g.shot = 'DRAG';
    moveDrag(px, py);
    return true;
  }

  // 새 위치 = 앵커 + clampLen(포인터 - 앵커, SLING_MAX_PULL)
  function moveDrag(px, py) {
    var g = G;
    if (!g || g.state !== 'PLAYING' || g.shot !== 'DRAG' || !g.bird) return;
    var dx = px - C.SLING_X;
    var dy = py - C.SLING_Y;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > C.SLING_MAX_PULL) {
      var k = C.SLING_MAX_PULL / len;
      dx *= k;
      dy *= k;
    }
    g.bird.x = C.SLING_X + dx;
    g.bird.y = C.SLING_Y + dy;
    keepBirdAboveGround(g.bird);
  }

  function cancelDrag() {
    var g = G;
    if (!g || g.shot !== 'DRAG' || !g.bird) return;
    g.shot = 'ARMED';
    g.bird.x = C.SLING_X;
    g.bird.y = C.SLING_Y;
  }

  function release() {
    var g = G;
    if (!g || g.state !== 'PLAYING' || g.shot !== 'DRAG' || !g.bird) return;
    var pull = U.dist(g.bird.x, g.bird.y, C.SLING_X, C.SLING_Y);
    if (pull < DRAG_CANCEL_DIST) {
      cancelDrag();
      return;
    }
    launch(g);
  }

  // 키보드 발사 등: (bx, by) 가 주어지면 새를 그 위치로 옮긴 뒤 발사
  function fire(bx, by) {
    var g = G;
    if (!g || g.state !== 'PLAYING' || !g.bird) return false;
    if (g.shot !== 'ARMED' && g.shot !== 'DRAG') return false;
    if (typeof bx === 'number' && typeof by === 'number') {
      g.bird.x = bx;
      g.bird.y = by;
      keepBirdAboveGround(g.bird);
    }
    if (U.dist(g.bird.x, g.bird.y, C.SLING_X, C.SLING_Y) < DRAG_CANCEL_DIST) {
      g.shot = 'ARMED';
      g.bird.x = C.SLING_X;
      g.bird.y = C.SLING_Y;
      return false;
    }
    launch(g);
    return true;
  }

  // 발사: v = (앵커 - 새) x LAUNCH_POWER, 크기 MAX_LAUNCH_SPEED 로 클램프 -> FLYING
  function launch(g) {
    var bird = g.bird;
    var vx = (C.SLING_X - bird.x) * C.LAUNCH_POWER;
    var vy = (C.SLING_Y - bird.y) * C.LAUNCH_POWER;
    var sp = Math.sqrt(vx * vx + vy * vy);
    if (sp > C.MAX_LAUNCH_SPEED) {
      var k = C.MAX_LAUNCH_SPEED / sp;
      vx *= k;
      vy *= k;
    }
    var body = P.addCircle(g.world, bird.x, bird.y, bird.r, matOpts('bird', 'bird'));
    body.vx = vx;
    body.vy = vy;
    bird.body = body;
    bird.angle = Math.atan2(vy, vx);
    bird.fuse = -1;
    g.shot = 'FLYING';
    g.flyTime = 0;
    g.settleTimer = 0;
    playSfx(g, 'launch');
  }

  // ---------------------------------------------------------------
  // 특수능력 (§10.2)
  // ---------------------------------------------------------------
  function tapAbility() {
    var g = G;
    if (!g || g.state !== 'PLAYING' || g.shot !== 'FLYING') return;
    var bird = g.bird;
    if (!bird || bird.abilityUsed || !bird.body || bird.body.dead) return;

    if (bird.ability === 'boost') {
      bird.abilityUsed = true;
      var b = bird.body;
      var vx = b.vx * YELLOW_BOOST;
      var vy = b.vy * YELLOW_BOOST;
      var sp = Math.sqrt(vx * vx + vy * vy);
      if (sp > YELLOW_MAX_SPEED) {
        var k = YELLOW_MAX_SPEED / sp;
        vx *= k;
        vy *= k;
      }
      b.vx = vx;
      b.vy = vy;
      b.sleeping = false;
      b.sleepTimer = 0;
      playSfx(g, 'launch');
    } else if (bird.ability === 'explode') {
      explode(g);
    } else {
      bird.abilityUsed = true;   // 빨간 새: 능력 없음
    }
  }

  // 폭발: 반경 내 바디에 방사 임펄스 + 피해, 새 제거 후 SETTLING
  function explode(g) {
    var bird = g.bird;
    if (!bird || !bird.body || bird.abilityUsed) return;
    var body = bird.body;
    bird.abilityUsed = true;

    var cx = body.x;
    var cy = body.y;
    var hits = P.queryRadius(g.world, cx, cy, C.EXPLODE_R);
    for (var i = 0; i < hits.length; i++) {
      var b = hits[i];
      if (b === body || b.isStatic || b.dead) continue;
      var dx = b.x - cx;
      var dy = b.y - cy;
      var d = Math.sqrt(dx * dx + dy * dy);
      var f = 1 - d / C.EXPLODE_R;
      if (f < 0) continue;
      var nx = 0;
      var ny = -1;
      if (d > 0) {
        nx = dx / d;
        ny = dy / d;
      }
      b.vx += nx * C.EXPLODE_IMPULSE * f * b.invMass;
      b.vy += ny * C.EXPLODE_IMPULSE * f * b.invMass;
      b.hp -= C.EXPLODE_DMG * f;     // hp <= 0 이 된 바디는 다음 P.step 의 파괴 큐에서 처리된다
      b.sleeping = false;
      b.sleepTimer = 0;
    }

    removeBody(g.world, body);
    bird.body = null;
    bird.gone = true;
    bird.x = cx;
    bird.y = cy;
    spawnParticles(g, cx, cy, PARTICLES_EXPLODE, EXPLODE_PARTICLE_COLOR, 6, 6);
    playSfx(g, 'break');
    enterSettling(g);
  }

  // ---------------------------------------------------------------
  // 물리 이벤트 처리: 파괴 점수·파티클·효과음
  // ---------------------------------------------------------------
  function onBodyBroken(g, b) {
    if (b.kind === 'pig') {
      g.score += C.SCORE_PIG;
      spawnParticles(g, b.x, b.y, PARTICLES_PIG, PIG_PARTICLE_COLOR, b.r * 0.5, b.r * 0.5);
    } else if (b.kind === 'block') {
      var m = MAT[b.mat];
      g.score += m ? m.score : 0;
      spawnParticles(g, b.x, b.y, PARTICLES_BLOCK, m ? m.color : '#ffffff', b.hw, b.hh);
    } else {
      return;
    }
    playSfx(g, 'break');
  }

  function drainEvents(g) {
    var ev = g.world.events;
    if (!ev || ev.length === 0) return;
    for (var i = 0; i < ev.length; i++) {
      var e = ev[i];
      if (e.type === 'break') onBodyBroken(g, e.body);
      else if (e.type === 'hit') playSfx(g, 'hit');
    }
    ev.length = 0;
  }

  // 월드 밖으로 떨어진 블록/돼지는 파괴로 처리(다음 스텝에서 파괴 큐가 수거)
  function cullOutOfWorld(g) {
    var list = g.world.bodies;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (b.isStatic || b.dead || b.kind === 'bird' || b.hp === Infinity) continue;
      if (b.hp > 0 && isOutOfWorld(b)) {
        b.hp = 0;
        b.sleeping = false;
      }
    }
  }

  // ---------------------------------------------------------------
  // 샷 수명주기 (§6.4)
  // ---------------------------------------------------------------
  function enterSettling(g) {
    g.shot = 'SETTLING';
    g.settleTimer = 0;
  }

  function shouldSettle(g) {
    if (g.flyTime > C.SETTLE_TIMEOUT) return true;
    var bird = g.bird;
    var body = bird ? bird.body : null;
    if (body && !body.dead && isOutOfWorld(body)) return true;
    // 폭탄새 도화선이 타는 중이면 폭발을 기다린다
    if (bird && bird.ability === 'explode' && bird.fuse >= 0 && !bird.abilityUsed) return false;
    // 모든 비정적 바디(새 포함)가 슬립이면 정지
    var list = g.world.bodies;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (!b.isStatic && !b.dead && !b.sleeping) return false;
    }
    return true;
  }

  function updateShot(g, dt) {
    var bird = g.bird;
    if (g.shot === 'FLYING') {
      g.flyTime += dt;
      var body = bird ? bird.body : null;
      if (body && !body.dead) {
        bird.x = body.x;
        bird.y = body.y;
        if (body.vx * body.vx + body.vy * body.vy > 1) {
          bird.angle = Math.atan2(body.vy, body.vx);   // §12.3 렌더 전용 회전
        }
        // 폭탄새: 첫 충돌 후 BLACK_FUSE_TIME 초 뒤 자동 폭발
        if (bird.ability === 'explode' && !bird.abilityUsed) {
          if (bird.fuse < 0 && body.touched) bird.fuse = 0;
          if (bird.fuse >= 0) {
            bird.fuse += dt;
            if (bird.fuse >= BLACK_FUSE_TIME) {
              explode(g);          // 내부에서 SETTLING 진입
              return;
            }
          }
        }
      }
      if (shouldSettle(g)) enterSettling(g);
    } else if (g.shot === 'SETTLING') {
      g.settleTimer += dt;
      if (g.settleTimer >= C.SETTLE_GRACE && !hasPendingBreaks(g)) judge(g);
    }
  }

  // SETTLE_GRACE 후 판정
  function judge(g) {
    if (countPigs(g) === 0) {
      clearStage(g);                                   // PLAYING -> CLEAR
      return;
    }
    if (g.birdQueue.length > 0) {
      if (g.bird && g.bird.body) removeBody(g.world, g.bird.body);
      armNextBird(g);                                  // 다음 새 장전 -> ARMED
      return;
    }
    failStage(g);                                      // PLAYING -> FAIL
  }

  function clearStage(g) {
    var birdsLeft = g.birdQueue.length;
    var bonus = birdsLeft * C.SCORE_BIRD_LEFT;
    g.score += bonus;

    // §11.6 별: 클리어 = 1, 50% 이상 = 2, 75% 이상 = 3
    var stars = 1;
    if (g.score >= g.maxScore * 0.75) stars = 3;
    else if (g.score >= g.maxScore * 0.50) stars = 2;

    // §13.3 저장: unlocked = max(unlocked, id + 1) (상한 10), stars/best 최대값 갱신
    var s = g.save;
    var id = g.stageId;
    s.unlocked = Math.min(STAGES.length, Math.max(s.unlocked, id + 1));
    s.stars[id] = Math.max(s.stars[id] || 0, stars);
    s.best[id] = Math.max(s.best[id] || 0, g.score);
    writeSave(s);

    g.result = {
      stageId: id,
      score: g.score,
      bonus: bonus,
      birdsLeft: birdsLeft,
      stars: stars,
      maxScore: g.maxScore,
      best: s.best[id],
      isLast: id >= STAGES.length
    };
    playSfx(g, 'win');
    setState(g, 'CLEAR');
  }

  function failStage(g) {
    g.result = {
      stageId: g.stageId,
      score: g.score,
      bonus: 0,
      birdsLeft: 0,
      stars: 0,
      maxScore: g.maxScore,
      best: g.save.best[g.stageId] || 0,
      isLast: g.stageId >= STAGES.length
    };
    playSfx(g, 'lose');
    setState(g, 'FAIL');
  }

  // ---------------------------------------------------------------
  // 파티클 / 카메라
  // ---------------------------------------------------------------
  function updateParticles(g, dt) {
    var ps = g.particles;
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

  function updateCamera(g, dt) {
    var target = 0;
    var body = g.bird ? g.bird.body : null;
    if (g.shot === 'FLYING' && body && !body.dead) {
      target = U.clamp(body.x - CAM_LEAD, 0, C.WORLD_W - C.VIEW_W);
    }
    g.cam.x = U.lerp(g.cam.x, target, 1 - Math.pow(0.001, dt));   // 프레임률 독립 보간
  }

  // ---------------------------------------------------------------
  // GAME.update — PLAYING 이 아니면 즉시 반환(렌더는 main 이 계속 호출)
  // ---------------------------------------------------------------
  function update(dt) {
    if (!G || G.state !== 'PLAYING') return;
    var g = G;
    if (!(dt > 0)) dt = 0;
    g.time += dt;

    // 고정 스텝 누적 (§7)
    g.acc += dt;
    var steps = 0;
    while (g.acc >= C.FIXED_DT && steps < C.MAX_STEPS) {
      P.step(g.world, C.FIXED_DT);
      drainEvents(g);
      g.acc -= C.FIXED_DT;
      steps++;
    }
    if (steps === C.MAX_STEPS) g.acc = 0;

    cullOutOfWorld(g);
    updateShot(g, dt);          // 여기서 CLEAR / FAIL 로 전이할 수 있다
    updateParticles(g, dt);
    updateCamera(g, dt);
    if (typeof g.onHud === 'function') g.onHud(g);
  }

  // ---------------------------------------------------------------
  // 상태 전이 (§6.2)
  // ---------------------------------------------------------------
  function pause() {
    var g = G;
    if (!g || g.state !== 'PLAYING') return;
    if (g.shot === 'DRAG') cancelDrag();   // 일시정지 중 pointerup 을 놓쳐도 드래그가 남지 않게
    setState(g, 'PAUSED');
  }

  function resume() {
    var g = G;
    if (!g || g.state !== 'PAUSED') return;
    setState(g, 'PLAYING');
  }

  // PAUSED / CLEAR / FAIL -> PLAYING (현재 스테이지 재로드)
  function retry() {
    var g = G;
    if (!g || !g.stageId) return;
    if (g.state === 'PAUSED' || g.state === 'CLEAR' || g.state === 'FAIL' || g.state === 'PLAYING') {
      loadStage(g.stageId);
    }
  }

  // STAGES / PAUSED / CLEAR / FAIL -> MENU (스테이지 파기)
  function toMenu() {
    var g = G;
    if (!g) return;
    g.world = null;
    g.bird = null;
    g.birdQueue = [];
    g.particles = [];
    g.shot = 'ARMED';
    g.cam.x = 0;
    g.result = null;
    setState(g, 'MENU');
  }

  // MENU -> STAGES
  function openStages() {
    var g = G;
    if (!g || g.state !== 'MENU') return;
    setState(g, 'STAGES');
  }

  // MENU -> PLAYING: 해금된 최고 스테이지
  function startGame() {
    var g = G;
    if (!g) return;
    if (!loadStage(g.save.unlocked)) loadStage(1);
  }

  // CLEAR -> PLAYING: 다음 스테이지
  function nextStage() {
    var g = G;
    if (!g || g.state !== 'CLEAR') return;
    if (g.stageId < STAGES.length) loadStage(g.stageId + 1);
  }

  // ---------------------------------------------------------------
  // UI 조회용
  // ---------------------------------------------------------------
  function remainingBirds() {
    var g = G;
    var types = [];
    if (!g) return types;
    if (g.bird && (g.shot === 'ARMED' || g.shot === 'DRAG')) types.push(g.bird.type);
    for (var i = 0; i < g.birdQueue.length; i++) types.push(g.birdQueue[i]);
    var out = [];
    for (var j = 0; j < types.length; j++) {
      var spec = BIRD[types[j]] || BIRD.red;
      out.push({ type: types[j], color: spec.color });
    }
    return out;
  }

  function getSave() {
    return G ? G.save : defaultSave();
  }

  function getStages() {
    var s = getSave();
    var out = [];
    for (var i = 0; i < STAGES.length; i++) {
      var st = STAGES[i];
      out.push({
        id: st.id,
        name: st.name,
        birds: st.birds.length,
        unlocked: st.id <= s.unlocked,
        stars: s.stars[st.id] || 0,
        best: s.best[st.id] || 0
      });
    }
    return out;
  }

  window.GAME = {
    create: create,
    loadStage: loadStage,
    update: update,
    startDrag: startDrag,
    moveDrag: moveDrag,
    release: release,
    cancelDrag: cancelDrag,
    fire: fire,
    tapAbility: tapAbility,
    pause: pause,
    resume: resume,
    retry: retry,
    toMenu: toMenu,
    openStages: openStages,
    startGame: startGame,
    nextStage: nextStage,
    remainingBirds: remainingBirds,
    getStages: getStages,
    getSave: getSave
  };
})();
