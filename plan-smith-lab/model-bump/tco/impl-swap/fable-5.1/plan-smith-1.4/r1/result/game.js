// game.js — 상태 머신, 입력, 루프, 점수, 저장, UI 배선
// stages.js의 상수, physics.js의 Matter 별칭/함수, render.js의 draw* 를 그대로 쓴다.
// 스크립트가 body 끝에 있으므로 canvas/ctx는 최상위에서 바로 잡을 수 있다.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const GAME = {
  state: 'MENU',          // 'MENU' | 'PLAYING' | 'PAUSED' | 'CLEAR' | 'FAIL'
  phase: 'AIM',           // 'AIM' | 'FLYING'
  stageIndex: 0,
  score: 0,
  birdsLeft: 0,
  pigsLeft: 0,
  engine: null,
  bird: null,             // Matter.Body | null
  blocks: [],
  pigs: [],
  particles: [],
  dragging: false,
  dragPoint: { x: SLING.x, y: SLING.y },
  settleFrames: 0,
  flightFrames: 0,
  clearDelay: 0,
  progress: { unlocked: 1, best: {} }
};

// 저장 폴백(메모리) + 오디오 컨텍스트 홀더
const MEM = { data: null };
const SFX = { ctx: null, lastHit: 0 };

/* ------------------------------------------------------------------ */
/* 초기화 / 루프                                                        */
/* ------------------------------------------------------------------ */

function init() {
  // A2 가드: Matter가 없으면 엔진을 만들지 않고 루프만 돌려 안내 문구를 그린다
  if (typeof Matter === 'undefined') {
    requestAnimationFrame(loop);
    return;
  }

  GAME.engine = createEngine();
  bindCollisions(GAME.engine);

  GAME.progress = loadProgress();
  if (!GAME.progress || typeof GAME.progress.unlocked !== 'number' || !GAME.progress.best) {
    GAME.progress = { unlocked: 1, best: {} };
  }
  buildStageGrid();

  // 버튼 배선
  document.getElementById('btn-play').addEventListener('click', function () {
    startStage(Math.min(GAME.progress.unlocked, STAGES.length) - 1);
  });
  document.getElementById('btn-pause').addEventListener('click', pauseGame);
  document.getElementById('btn-resume').addEventListener('click', resumeGame);
  document.getElementById('btn-restart').addEventListener('click', restartStage);
  document.getElementById('btn-menu').addEventListener('click', goMenu);
  document.getElementById('btn-next').addEventListener('click', function () {
    if (GAME.stageIndex + 1 < STAGES.length) startStage(GAME.stageIndex + 1);
    else goMenu();
  });
  document.getElementById('btn-clear-retry').addEventListener('click', restartStage);
  document.getElementById('btn-clear-menu').addEventListener('click', goMenu);
  document.getElementById('btn-fail-retry').addEventListener('click', restartStage);
  document.getElementById('btn-fail-menu').addEventListener('click', goMenu);

  // 포인터: down은 캔버스, move/up은 window (캔버스 밖에서 놓아도 발사)
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  showOverlay('overlay-menu');
  syncHud();
  requestAnimationFrame(loop);
}

function loop() {
  if (GAME.state === 'PLAYING') {
    Engine.update(GAME.engine, STEP_MS);
    sweepDestroyed();
    updateParticles();
    updateShotPhase();
    checkOutcome();
    syncHud();
  }
  if (typeof Matter === 'undefined') drawLoadError(ctx);
  else drawFrame(ctx, GAME);
  requestAnimationFrame(loop);
}

/* ------------------------------------------------------------------ */
/* 상태 전이                                                            */
/* ------------------------------------------------------------------ */

// 월드 비우고 메인 메뉴로
function goMenu() {
  if (GAME.engine) Composite.clear(GAME.engine.world, false);
  GAME.bird = null;
  GAME.blocks = [];
  GAME.pigs = [];
  GAME.particles = [];
  GAME.pigsLeft = 0;
  GAME.birdsLeft = 0;
  GAME.score = 0;
  GAME.dragging = false;
  GAME.phase = 'AIM';
  GAME.state = 'MENU';
  buildStageGrid();
  syncHud();
  showOverlay('overlay-menu');
}

// 스테이지 로드 + PLAYING
function startStage(index) {
  const stage = STAGES[index];
  if (!stage || !GAME.engine) return;

  GAME.stageIndex = index;
  GAME.score = 0;
  GAME.particles = [];
  GAME.dragging = false;
  GAME.dragPoint = { x: SLING.x, y: SLING.y };
  GAME.settleFrames = 0;
  GAME.flightFrames = 0;
  GAME.clearDelay = 0;

  const built = buildStage(GAME.engine, stage);   // 월드를 비우고 새로 세운다
  GAME.blocks = built.blocks;
  GAME.pigs = built.pigs;
  GAME.pigsLeft = GAME.pigs.length;
  GAME.birdsLeft = stage.birds;

  GAME.bird = spawnBirdAtSling(GAME.engine);
  GAME.phase = 'AIM';

  hideOverlays();
  syncHud();
  GAME.state = 'PLAYING';
}

function restartStage() {
  startStage(GAME.stageIndex);
}

function pauseGame() {
  if (GAME.state !== 'PLAYING') return;
  if (GAME.dragging && GAME.bird && GAME.phase === 'AIM') {
    Body.setPosition(GAME.bird, { x: SLING.x, y: SLING.y });
  }
  GAME.dragging = false;
  GAME.state = 'PAUSED';
  showOverlay('overlay-pause');
}

function resumeGame() {
  if (GAME.state !== 'PAUSED') return;
  hideOverlays();
  GAME.state = 'PLAYING';
}

// 점수 정산 · 저장 · 오버레이
function finishStage(cleared) {
  if (GAME.state !== 'PLAYING') return;
  const stage = STAGES[GAME.stageIndex];

  if (cleared) {
    // 날아가는 중인 새는 이미 쓴 새이므로 보너스에서 뺀다
    const unused = GAME.phase === 'FLYING' ? Math.max(0, GAME.birdsLeft - 1) : GAME.birdsLeft;
    GAME.score += unused * SCORE.birdLeft;
    syncHud();

    const stars = starsFor(stage, GAME.score);
    const prev = GAME.progress.best[stage.id];
    const prevScore = prev ? prev.score : 0;
    const bestScore = Math.max(prevScore, GAME.score);     // 더 높을 때만 갱신
    GAME.progress.best[stage.id] = { score: bestScore, stars: starsFor(stage, bestScore) };
    GAME.progress.unlocked = Math.max(GAME.progress.unlocked, Math.min(STAGES.length, GAME.stageIndex + 2));
    saveProgress(GAME.progress);
    buildStageGrid();

    document.getElementById('clear-stars').textContent =
      '★'.repeat(stars) + '☆'.repeat(3 - stars);
    document.getElementById('clear-score').textContent =
      '점수 ' + GAME.score + '  /  최고 ' + bestScore;
    document.getElementById('btn-next').textContent =
      GAME.stageIndex + 1 < STAGES.length ? '다음 스테이지' : '메인으로 (마지막 스테이지)';

    GAME.state = 'CLEAR';
    showOverlay('overlay-clear');
    playSfx('clear');
  } else {
    document.getElementById('fail-msg').textContent =
      '남은 돼지 ' + GAME.pigsLeft + '마리';
    GAME.state = 'FAIL';
    showOverlay('overlay-fail');
    playSfx('fail');
  }
}

/* ------------------------------------------------------------------ */
/* 판정                                                                */
/* ------------------------------------------------------------------ */

// 클리어 / 실패 판정
function checkOutcome() {
  if (GAME.state !== 'PLAYING') return;

  // 클리어: 돼지 0 → 잠시 뒤 오버레이
  if (GAME.pigsLeft === 0) {
    GAME.clearDelay++;
    if (GAME.clearDelay >= 60) finishStage(true);
    return;
  }

  // 실패: 새가 다 떨어졌고(슬링 비어 있음) 월드 전체가 멎었는데 돼지가 남아 있음
  if (GAME.bird === null && GAME.birdsLeft <= 0 && GAME.phase === 'AIM') {
    GAME.flightFrames++;
    if (worldSettled()) GAME.settleFrames++; else GAME.settleFrames = 0;
    if (GAME.settleFrames >= SETTLE_FRAMES || GAME.flightFrames >= FLIGHT_MAX_FRAMES) {
      finishStage(false);
    }
  }
}

// 비행 종료 감지 (새가 멈추거나 화면 밖으로 나가거나 시간 초과)
function updateShotPhase() {
  if (GAME.phase !== 'FLYING' || !GAME.bird) return;
  GAME.flightFrames++;

  const p = GAME.bird.position;
  const off = p.x < -200 || p.x > W + 200 || p.y > H + 200;
  if (off) { resolveShot(); return; }

  if (worldSettled()) GAME.settleFrames++; else GAME.settleFrames = 0;
  if (GAME.settleFrames >= SETTLE_FRAMES || GAME.flightFrames >= FLIGHT_MAX_FRAMES) {
    resolveShot();
  }
}

// 새·블록·돼지 전부 저속인가
function worldSettled() {
  const ANG = 0.02;
  if (GAME.bird && !GAME.bird.isStatic) {
    if (GAME.bird.speed > SETTLE_SPEED || Math.abs(GAME.bird.angularVelocity) > ANG) return false;
  }
  for (let i = 0; i < GAME.blocks.length; i++) {
    const b = GAME.blocks[i];
    if (b.speed > SETTLE_SPEED || Math.abs(b.angularVelocity) > ANG) return false;
  }
  for (let i = 0; i < GAME.pigs.length; i++) {
    const b = GAME.pigs[i];
    if (b.speed > SETTLE_SPEED || Math.abs(b.angularVelocity) > ANG) return false;
  }
  return true;
}

// 새 회수 + 다음 장전
function resolveShot() {
  if (GAME.bird) {
    removeBody(GAME.engine, GAME.bird);
    GAME.bird = null;
  }
  GAME.birdsLeft = Math.max(0, GAME.birdsLeft - 1);
  GAME.phase = 'AIM';
  GAME.settleFrames = 0;
  GAME.flightFrames = 0;
  GAME.dragging = false;
  GAME.dragPoint = { x: SLING.x, y: SLING.y };
  if (GAME.birdsLeft > 0) GAME.bird = spawnBirdAtSling(GAME.engine);
  syncHud();
}

// 파괴 표시된 바디 + 화면 밖 200px을 넘은 바디를 일괄 제거 (역순 순회)
function sweepDestroyed() {
  for (let i = GAME.blocks.length - 1; i >= 0; i--) {
    const b = GAME.blocks[i];
    const off = b.position.x < -200 || b.position.x > W + 200 || b.position.y > H + 200;
    if (!b.destroyed && !off) continue;
    removeBody(GAME.engine, b);
    GAME.blocks.splice(i, 1);
    if (b.destroyed) {
      GAME.score += SCORE.block;
      spawnDebris(b.position.x, b.position.y, b.color, 10 + Math.floor(Math.random() * 3));
    }
  }
  for (let i = GAME.pigs.length - 1; i >= 0; i--) {
    const p = GAME.pigs[i];
    const off = p.position.x < -200 || p.position.x > W + 200 || p.position.y > H + 200;
    if (!p.destroyed && !off) continue;
    removeBody(GAME.engine, p);
    GAME.pigs.splice(i, 1);
    GAME.score += SCORE.pig;
    spawnDebris(p.position.x, p.position.y, '#6cc04a', 16);
    playSfx('pig');
  }
  GAME.pigsLeft = GAME.pigs.length;   // 감산 누적이 아니라 재계산
}

/* ------------------------------------------------------------------ */
/* 조준 · 발사 · 궤적                                                  */
/* ------------------------------------------------------------------ */

function launchBird() {
  if (!GAME.bird) return;
  const q = pullPoint(GAME.dragPoint);
  const v = pullVelocity(GAME.dragPoint);
  Body.setStatic(GAME.bird, false);   // (1) 정적 바디는 질량이 무한이라 속도 설정이 무시된다
  Body.setPosition(GAME.bird, q);     // (2) 당긴 지점에서 출발
  Body.setVelocity(GAME.bird, v);     // (3)
  GAME.phase = 'FLYING';
  GAME.flightFrames = 0;
  GAME.settleFrames = 0;
  playSfx('launch');
}

function pullPoint(p) {
  let dx = p.x - SLING.x, dy = p.y - SLING.y;
  const d = Math.hypot(dx, dy);
  if (d > SLING.maxPull) { dx = dx * SLING.maxPull / d; dy = dy * SLING.maxPull / d; }
  return { x: SLING.x + dx, y: SLING.y + dy };
}

function pullVelocity(p) {
  const q = pullPoint(p);
  return { x: (SLING.x - q.x) * LAUNCH_K, y: (SLING.y - q.y) * LAUNCH_K };
}

function trajectoryPoints(p) {
  const v = pullVelocity(p);
  const pts = [];
  let x = SLING.x, y = SLING.y, vx = v.x, vy = v.y;
  for (let i = 0; i < 112; i++) {
    vy += G_STEP; x += vx; y += vy;
    if (i % 4 === 3) pts.push({ x: x, y: y });
    if (y > GROUND_Y) break;
  }
  return pts;
}

function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (W / r.width),
           y: (e.clientY - r.top) * (H / r.height) };
}

function onPointerDown(e) {
  if (GAME.state !== 'PLAYING' || GAME.phase !== 'AIM' || !GAME.bird) return;
  GAME.dragging = true;
  GAME.dragPoint = canvasPoint(e);
  Body.setPosition(GAME.bird, pullPoint(GAME.dragPoint));
  if (e.preventDefault) e.preventDefault();
}

function onPointerMove(e) {
  if (!GAME.dragging || GAME.state !== 'PLAYING' || GAME.phase !== 'AIM' || !GAME.bird) return;
  GAME.dragPoint = canvasPoint(e);
  Body.setPosition(GAME.bird, pullPoint(GAME.dragPoint));
}

function onPointerUp(e) {
  if (!GAME.dragging) return;
  GAME.dragging = false;
  if (GAME.state !== 'PLAYING' || GAME.phase !== 'AIM' || !GAME.bird) return;
  if (e && typeof e.clientX === 'number') GAME.dragPoint = canvasPoint(e);

  // 거의 당기지 않았으면 발사하지 않고 제자리로 (오터치로 새를 낭비하지 않게)
  const q = pullPoint(GAME.dragPoint);
  if (Math.hypot(q.x - SLING.x, q.y - SLING.y) < 10) {
    Body.setPosition(GAME.bird, { x: SLING.x, y: SLING.y });
    return;
  }
  launchBird();
}

/* ------------------------------------------------------------------ */
/* HUD · 오버레이 · 스테이지 그리드 · 별                                */
/* ------------------------------------------------------------------ */

function syncHud() {
  document.getElementById('hud-stage').textContent = 'STAGE ' + (GAME.stageIndex + 1);
  document.getElementById('hud-score').textContent = String(GAME.score);
  document.getElementById('hud-birds').textContent = 'BIRDS ' + GAME.birdsLeft;
}

function showOverlay(id) {
  hideOverlays();
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function hideOverlays() {
  const els = document.querySelectorAll('.overlay');
  for (let i = 0; i < els.length; i++) els[i].classList.add('hidden');
}

// 10칸 버튼 생성: 번호 + 획득한 별, 잠긴 칸은 disabled
function buildStageGrid() {
  const grid = document.getElementById('stage-grid');
  grid.innerHTML = '';
  for (let i = 0; i < STAGES.length; i++) {
    const stage = STAGES[i];
    const best = GAME.progress.best[stage.id];
    const stars = best ? starsFor(stage, best.score) : 0;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.style.whiteSpace = 'pre';
    btn.textContent = String(stage.id) + '\n' + '★'.repeat(stars) + '☆'.repeat(3 - stars);
    btn.title = stage.name;
    btn.disabled = i >= GAME.progress.unlocked;
    btn.addEventListener('click', (function (idx) {
      return function () { startStage(idx); };
    })(i));
    grid.appendChild(btn);
  }
}

// 임계값은 스테이지에서 읽는다 (고정값 금지)
function starsFor(stage, score) {
  if (score >= stage.star3) return 3;
  if (score >= stage.star2) return 2;
  return 1;
}

/* ------------------------------------------------------------------ */
/* 저장소                                                              */
/* ------------------------------------------------------------------ */

function loadProgress() {
  try {
    const raw = localStorage.getItem('ab.progress.v1');
    if (raw) return JSON.parse(raw);
  } catch (e) { /* file:// 등에서 접근 차단 — 메모리로 대체 */ }
  return MEM.data || { unlocked: 1, best: {} };
}

function saveProgress(progress) {
  MEM.data = progress;
  try { localStorage.setItem('ab.progress.v1', JSON.stringify(progress)); } catch (e) {}
}

/* ------------------------------------------------------------------ */
/* 효과음 · 파편                                                        */
/* ------------------------------------------------------------------ */

// kind: 'launch' | 'hit' | 'pig' | 'clear' | 'fail'
// AudioContext는 첫 호출 때 만든다 (로드 시점에 만들면 자동재생 정책에 걸린다)
function playSfx(kind) {
  try {
    const now = Date.now();
    if (kind === 'hit') {
      if (now - SFX.lastHit < 60) return;   // 충돌음 과다 방지
      SFX.lastHit = now;
    }
    if (!SFX.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      SFX.ctx = new AC();
    }
    const ac = SFX.ctx;
    if (ac.state === 'suspended') ac.resume();

    const spec = {
      launch: { f: 520, d: 0.12, type: 'square',   to: 1040 },
      hit:    { f: 180, d: 0.08, type: 'triangle', to: 120 },
      pig:    { f: 320, d: 0.25, type: 'sawtooth', to: 140 },
      clear:  { f: 660, d: 0.50, type: 'sine',     to: 990 },
      fail:   { f: 160, d: 0.60, type: 'sawtooth', to: 70 }
    }[kind];
    if (!spec) return;

    const t0 = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.f, t0);
    osc.frequency.exponentialRampToValueAtTime(spec.to, t0 + spec.d);
    gain.gain.setValueAtTime(0.15, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + spec.d);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + spec.d + 0.02);
  } catch (e) {}
}

// 파편 생성
function spawnDebris(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 2 + Math.random() * 5;
    GAME.particles.push({
      x: x, y: y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 2,
      life: 30 + Math.floor(Math.random() * 20),
      color: color || '#c8873c',
      size: 4 + Math.random() * 5
    });
  }
}

// 파편 갱신·수거 (역순 순회)
function updateParticles() {
  for (let i = GAME.particles.length - 1; i >= 0; i--) {
    const p = GAME.particles[i];
    p.vy += G_STEP;
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0 || p.y > H + 20) GAME.particles.splice(i, 1);
  }
}

window.addEventListener('load', init);

// DONE-CHECK
// hop 1: game.js:init  (#btn-play click -> startStage(GAME.progress.unlocked - 1))
// hop 2: game.js:startStage  (-> physics.js:buildStage + physics.js:spawnBirdAtSling)
// hop 3: game.js:loop  (Engine.update while GAME.state === 'PLAYING')
// hop 4: game.js:onPointerUp -> game.js:launchBird  (setStatic -> setPosition -> setVelocity)
// hop 5: physics.js:bindCollisions -> physics.js:damageBody -> game.js:sweepDestroyed -> game.js:checkOutcome -> game.js:finishStage
// V 1: startStage (STAGES[index] -> buildStage)
// V 2: buildStageGrid
// V 3: startStage (buildStage가 Composite.clear로 월드를 비움)
// V 4: finishStage / saveProgress / loadProgress
// V 5: onPointerDown / onPointerMove / canvasPoint / pullPoint / drawSling
// V 6: trajectoryPoints / drawTrajectory
// V 7: launchBird
// V 8: resolveShot
// V 9: loop
// V 10: bindCollisions / damageBody / sweepDestroyed
// V 11: sweepDestroyed (화면 밖 200px 정리) / updateShotPhase (새)
// V 12: sweepDestroyed
// V 13: checkOutcome / finishStage
// V 14: checkOutcome / worldSettled
// V 15: pauseGame (index.html #btn-pause, #wrap position:relative)
// V 16: loop
// V 17: restartStage / startStage
// V 18: goMenu
// V 19: sweepDestroyed / syncHud
// V 20: starsFor
// V 21: finishStage (Math.max 비교 후 saveProgress)
// V 22: drawFrame / drawBackground
// V 23: spawnDebris / updateParticles
// V 24: playSfx
// V 25: loop / drawLoadError / init (typeof Matter 가드)
