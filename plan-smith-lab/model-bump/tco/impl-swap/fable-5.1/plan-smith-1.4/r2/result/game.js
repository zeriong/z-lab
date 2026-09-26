// game.js — 상태 머신, 입력, 루프, 점수, 저장, UI 배선
// stages.js의 상수와 physics.js의 Matter 별칭(Engine, Composite, Bodies, Body, Events)을 그대로 쓴다.
// 여기서 같은 이름을 다시 const로 선언하지 않는다.

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

// ---------------------------------------------------------------------------
// 저장소 — 예외가 게임을 죽이지 않게
// ---------------------------------------------------------------------------

const MEM = { data: null };

function loadProgress() {
  try {
    const raw = localStorage.getItem('ab.progress.v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          unlocked: Math.max(1, Math.min(STAGES.length, Number(parsed.unlocked) || 1)),
          best: (parsed.best && typeof parsed.best === 'object') ? parsed.best : {}
        };
      }
    }
  } catch (e) { /* file:// 등에서 접근 차단 — 메모리로 대체 */ }
  return MEM.data || { unlocked: 1, best: {} };
}

function saveProgress(progress) {
  MEM.data = progress;
  try { localStorage.setItem('ab.progress.v1', JSON.stringify(progress)); } catch (e) {}
}

// ---------------------------------------------------------------------------
// 효과음 — AudioContext는 첫 호출 때 만든다 (로드 시점에 만들면 자동재생 정책에 걸린다)
// ---------------------------------------------------------------------------

const AUDIO = { ctx: null };

function playSfx(kind) {
  try {
    if (!AUDIO.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      AUDIO.ctx = new AC();
    }
    const ac = AUDIO.ctx;
    if (ac.state === 'suspended') ac.resume();

    // [시작 주파수, 길이(초), 파형, 주파수 변화량]
    const table = {
      launch: [520, 0.12, 'triangle', -220],
      hit:    [170, 0.08, 'square',   -70],
      pig:    [330, 0.25, 'sawtooth',  260],
      clear:  [660, 0.55, 'sine',      440],
      fail:   [260, 0.65, 'sine',     -160]
    };
    const spec = table[kind];
    if (!spec) return;

    const t0 = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = spec[2];
    osc.frequency.setValueAtTime(spec[0], t0);
    osc.frequency.linearRampToValueAtTime(Math.max(40, spec[0] + spec[3]), t0 + spec[1]);
    gain.gain.setValueAtTime(0.16, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + spec[1]);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + spec[1] + 0.02);
  } catch (e) { /* 오디오 불가 환경 — 무시 */ }
}

// ---------------------------------------------------------------------------
// 파편
// ---------------------------------------------------------------------------

function spawnDebris(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    if (GAME.particles.length >= 400) break;
    const a = Math.random() * Math.PI * 2;
    const sp = 2 + Math.random() * 5;
    GAME.particles.push({
      x: x, y: y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 2.5,
      size: 4 + Math.random() * 6,
      color: color,
      life: 30 + Math.random() * 20
    });
  }
}

function updateParticles() {
  for (let i = GAME.particles.length - 1; i >= 0; i--) {
    const p = GAME.particles[i];
    p.vy += G_STEP;
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;
    if (p.life <= 0 || p.y > H + 50) GAME.particles.splice(i, 1);
  }
}

// ---------------------------------------------------------------------------
// 조준·발사·궤적 — 발사와 미리보기의 단일 출처
// ---------------------------------------------------------------------------

function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (W / r.width),
           y: (e.clientY - r.top) * (H / r.height) };
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

// 발사 순서: 정적 해제(setStatic false)가 속도 설정(setVelocity) 바로 앞에 와야 한다.
// 정적 바디는 질량이 무한이라 속도 설정이 무시된다. 위치 설정은 정적 상태에서도 유효하므로 먼저 둔다.
function launchBird() {
  const q = pullPoint(GAME.dragPoint);
  const v = pullVelocity(GAME.dragPoint);
  Body.setPosition(GAME.bird, q);     // 당긴 지점에서 출발
  Body.setStatic(GAME.bird, false);   // 정적 해제 — 이 줄이 setVelocity 바로 앞이어야 한다
  Body.setVelocity(GAME.bird, v);
  GAME.phase = 'FLYING';
  GAME.flightFrames = 0;
  GAME.settleFrames = 0;
  playSfx('launch');
}

function onPointerDown(e) {
  if (GAME.state !== 'PLAYING' || GAME.phase !== 'AIM' || !GAME.bird) return;
  const p = canvasPoint(e);
  GAME.dragging = true;
  GAME.dragPoint = p;
  Body.setPosition(GAME.bird, pullPoint(p));
  if (e.cancelable) e.preventDefault();
}

function onPointerMove(e) {
  if (!GAME.dragging) return;
  if (GAME.state !== 'PLAYING' || GAME.phase !== 'AIM' || !GAME.bird) { GAME.dragging = false; return; }
  GAME.dragPoint = canvasPoint(e);
  Body.setPosition(GAME.bird, pullPoint(GAME.dragPoint));
  if (e.cancelable) e.preventDefault();
}

function onPointerUp(e) {
  if (!GAME.dragging) return;
  GAME.dragging = false;
  if (GAME.state !== 'PLAYING' || GAME.phase !== 'AIM' || !GAME.bird) return;
  if (e && e.clientX !== undefined) GAME.dragPoint = canvasPoint(e);
  const q = pullPoint(GAME.dragPoint);
  // 거의 당기지 않은 탭은 발사하지 않고 제자리로
  if (Math.hypot(q.x - SLING.x, q.y - SLING.y) < 10) {
    Body.setPosition(GAME.bird, { x: SLING.x, y: SLING.y });
    GAME.dragPoint = { x: SLING.x, y: SLING.y };
    return;
  }
  launchBird();
}

// ---------------------------------------------------------------------------
// 파괴·비행 종료·판정
// ---------------------------------------------------------------------------

// 파괴 표시된 바디(및 화면 밖 200px을 넘어간 바디)를 일괄 제거한다. 역순 순회.
function sweepDestroyed() {
  for (let i = GAME.blocks.length - 1; i >= 0; i--) {
    const b = GAME.blocks[i];
    const out = b.position.x < -200 || b.position.x > W + 200 || b.position.y > H + 200;
    if (!b.destroyed && !out) continue;
    removeBody(GAME.engine, b);
    GAME.blocks.splice(i, 1);
    GAME.score += SCORE.block;
    spawnDebris(b.position.x, b.position.y, b.color || '#c8873c', 10);
  }
  for (let i = GAME.pigs.length - 1; i >= 0; i--) {
    const p = GAME.pigs[i];
    const out = p.position.x < -200 || p.position.x > W + 200 || p.position.y > H + 200;
    if (!p.destroyed && !out) continue;
    removeBody(GAME.engine, p);
    GAME.pigs.splice(i, 1);
    GAME.score += SCORE.pig;
    spawnDebris(p.position.x, p.position.y, '#6ccf5a', 16);
    playSfx('pig');
  }
  GAME.pigsLeft = GAME.pigs.length;   // 감산 누적이 아니라 재계산
}

// 새·블록·돼지 전부 저속인가
function worldSettled() {
  const all = [];
  if (GAME.bird && !GAME.bird.isStatic) all.push(GAME.bird);
  for (let i = 0; i < GAME.blocks.length; i++) all.push(GAME.blocks[i]);
  for (let i = 0; i < GAME.pigs.length; i++) all.push(GAME.pigs[i]);
  for (let i = 0; i < all.length; i++) {
    const b = all[i];
    if (b.speed > SETTLE_SPEED || b.angularSpeed > 0.02) return false;
  }
  return true;
}

// 새 회수 + 다음 장전
function resolveShot() {
  if (GAME.bird) {
    spawnDebris(GAME.bird.position.x, GAME.bird.position.y, '#d9382a', 6);
    removeBody(GAME.engine, GAME.bird);
  }
  GAME.bird = null;
  GAME.birdsLeft = Math.max(0, GAME.birdsLeft - 1);
  GAME.phase = 'AIM';
  GAME.settleFrames = 0;
  GAME.flightFrames = 0;
  GAME.dragging = false;
  GAME.dragPoint = { x: SLING.x, y: SLING.y };
  if (GAME.birdsLeft > 0) GAME.bird = spawnBirdAtSling(GAME.engine);
}

// 비행 종료 감지: 새가 멈추거나 화면 밖으로 나가거나 시간이 다 되면 회수
function updateShotPhase() {
  if (GAME.phase !== 'FLYING' || !GAME.bird) return;
  GAME.flightFrames++;
  const b = GAME.bird;
  const out = b.position.x < -200 || b.position.x > W + 200 || b.position.y > H + 200;
  if (out) { resolveShot(); return; }
  if (b.speed < SETTLE_SPEED && b.angularSpeed < 0.05) GAME.settleFrames++;
  else GAME.settleFrames = 0;
  if (GAME.settleFrames >= SETTLE_FRAMES || GAME.flightFrames >= FLIGHT_MAX_FRAMES) resolveShot();
}

// 클리어/실패 판정
function checkOutcome() {
  if (GAME.state !== 'PLAYING') return;

  // 클리어: 돼지가 전부 사라지면 잠시 뒤 오버레이
  if (GAME.pigsLeft === 0) {
    GAME.clearDelay++;
    if (GAME.clearDelay >= 60) finishStage(true);
    return;
  }

  // 실패: 마지막 새가 회수됐고, 월드 전체가 멎었는데 돼지가 남아 있음
  if (GAME.birdsLeft <= 0 && GAME.bird === null) {
    GAME.flightFrames++;
    if (worldSettled()) GAME.settleFrames++;
    else GAME.settleFrames = 0;
    if (GAME.settleFrames >= SETTLE_FRAMES || GAME.flightFrames >= FLIGHT_MAX_FRAMES) finishStage(false);
  }
}

// 1~3
function starsFor(stage, score) {
  if (score >= stage.star3) return 3;
  if (score >= stage.star2) return 2;
  return 1;
}

// 점수 정산·저장·오버레이
function finishStage(cleared) {
  const stage = STAGES[GAME.stageIndex];
  GAME.dragging = false;

  if (cleared) {
    // 잔여 새 보너스 (비행 중인 새는 사용한 것으로 본다)
    const unused = GAME.phase === 'FLYING' ? Math.max(0, GAME.birdsLeft - 1) : GAME.birdsLeft;
    GAME.score += unused * SCORE.birdLeft;
    syncHud();

    const stars = starsFor(stage, GAME.score);
    const prev = GAME.progress.best[stage.id] || { score: 0, stars: 0 };
    const bestScore = Math.max(Number(prev.score) || 0, GAME.score);
    const bestStars = Math.max(Number(prev.stars) || 0, stars);
    GAME.progress.best[stage.id] = { score: bestScore, stars: bestStars };
    GAME.progress.unlocked = Math.max(GAME.progress.unlocked, Math.min(STAGES.length, stage.id + 1));
    saveProgress(GAME.progress);

    document.getElementById('clear-stars').textContent =
      '★'.repeat(stars) + '☆'.repeat(3 - stars);
    document.getElementById('clear-score').textContent =
      '점수 ' + GAME.score + '  /  최고 ' + bestScore;
    document.getElementById('btn-next').style.display =
      (GAME.stageIndex + 1 < STAGES.length) ? '' : 'none';

    GAME.state = 'CLEAR';
    showOverlay('overlay-clear');
    playSfx('clear');
  } else {
    document.getElementById('fail-msg').textContent =
      '돼지 ' + GAME.pigsLeft + '마리가 남았습니다';
    GAME.state = 'FAIL';
    showOverlay('overlay-fail');
    playSfx('fail');
  }
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

function syncHud() {
  document.getElementById('hud-stage').textContent = 'STAGE ' + (GAME.stageIndex + 1);
  document.getElementById('hud-score').textContent = 'SCORE ' + GAME.score;
  document.getElementById('hud-birds').textContent = 'BIRDS ' + GAME.birdsLeft;
}

function hideOverlays() {
  const list = document.querySelectorAll('.overlay');
  for (let i = 0; i < list.length; i++) list[i].classList.add('hidden');
}

function showOverlay(id) {
  hideOverlays();
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

// 10칸 버튼 생성 (번호 + 획득한 별)
function buildStageGrid() {
  const grid = document.getElementById('stage-grid');
  grid.innerHTML = '';
  for (let i = 0; i < STAGES.length; i++) {
    const s = STAGES[i];
    const best = GAME.progress.best[s.id];
    const stars = best ? Math.max(0, Math.min(3, Number(best.stars) || 0)) : 0;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = String(s.id);
    const small = document.createElement('div');
    small.style.fontSize = '12px';
    small.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    btn.appendChild(small);
    btn.disabled = s.id > GAME.progress.unlocked;
    btn.title = s.name;
    btn.addEventListener('click', (function (index) {
      return function () { startStage(index); };
    })(i));
    grid.appendChild(btn);
  }
}

// ---------------------------------------------------------------------------
// 상태 전이
// ---------------------------------------------------------------------------

// 월드 비우고 state='MENU'
function goMenu() {
  if (GAME.engine) Composite.clear(GAME.engine.world, false);
  GAME.bird = null;
  GAME.blocks = [];
  GAME.pigs = [];
  GAME.particles = [];
  GAME.dragging = false;
  GAME.phase = 'AIM';
  GAME.pigsLeft = 0;
  GAME.birdsLeft = 0;
  GAME.state = 'MENU';
  document.getElementById('btn-pause').style.display = 'none';
  document.getElementById('hud').style.display = 'none';
  buildStageGrid();
  showOverlay('overlay-menu');
}

// 스테이지 로드 + state='PLAYING'
function startStage(index) {
  if (!GAME.engine) return;
  index = Math.max(0, Math.min(STAGES.length - 1, index | 0));
  const stage = STAGES[index];
  hideOverlays();

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

  document.getElementById('btn-pause').style.display = '';
  document.getElementById('hud').style.display = '';
  syncHud();
  GAME.state = 'PLAYING';
}

function restartStage() {
  startStage(GAME.stageIndex);
}

function pauseGame() {
  if (GAME.state !== 'PLAYING') return;
  GAME.dragging = false;
  GAME.state = 'PAUSED';
  showOverlay('overlay-pause');
}

function resumeGame() {
  if (GAME.state !== 'PAUSED') return;
  hideOverlays();
  GAME.state = 'PLAYING';
}

// ---------------------------------------------------------------------------
// 메인 루프 — 일시정지 게이트가 여기 하나뿐이다
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 초기화 — load 이벤트에서 1회
// ---------------------------------------------------------------------------

function init() {
  if (typeof Matter === 'undefined') {
    // physics.js가 평가되지 못한 상태. 루프는 매 프레임 안내 문구만 그린다.
    hideOverlays();
    document.getElementById('btn-pause').style.display = 'none';
    document.getElementById('hud').style.display = 'none';
    requestAnimationFrame(loop);
    return;
  }

  GAME.engine = createEngine();       // 게임당 한 번
  bindCollisions(GAME.engine);        // 게임당 한 번
  GAME.progress = loadProgress();

  // 버튼 배선
  document.getElementById('btn-play').addEventListener('click', function () {
    startStage(GAME.progress.unlocked - 1);
  });
  document.getElementById('btn-pause').addEventListener('click', pauseGame);
  document.getElementById('btn-resume').addEventListener('click', resumeGame);
  document.getElementById('btn-restart').addEventListener('click', restartStage);
  document.getElementById('btn-menu').addEventListener('click', goMenu);
  document.getElementById('btn-next').addEventListener('click', function () {
    const next = GAME.stageIndex + 1;
    if (next < STAGES.length) startStage(next);
    else goMenu();
  });
  document.getElementById('btn-clear-retry').addEventListener('click', restartStage);
  document.getElementById('btn-clear-menu').addEventListener('click', goMenu);
  document.getElementById('btn-fail-retry').addEventListener('click', restartStage);
  document.getElementById('btn-fail-menu').addEventListener('click', goMenu);

  // 포인터: pointerdown만 캔버스에, move/up은 window에 (캔버스 밖에서 손을 떼도 발사)
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  goMenu();
  requestAnimationFrame(loop);
}

window.addEventListener('load', init);

// DONE-CHECK
// (a) §8 load-bearing path
// hop 1: game.js:init (btn-play click) -> game.js:startStage
// hop 2: game.js:startStage -> physics.js:buildStage + physics.js:spawnBirdAtSling
// hop 3: game.js:loop (Engine.update while state === 'PLAYING')
// hop 4: game.js:onPointerUp -> game.js:launchBird
// hop 5: physics.js:bindCollisions -> game.js:sweepDestroyed -> game.js:checkOutcome -> game.js:finishStage
// (b) §1.2 동사 문장
// V 1: buildStage (stages.js STAGES[6] 데이터)
// V 2: buildStageGrid
// V 3: startStage (buildStage가 Composite.clear로 월드를 비움)
// V 4: saveProgress / loadProgress
// V 5: onPointerDown / onPointerMove (canvasPoint, pullPoint) + drawSling
// V 6: trajectoryPoints + drawTrajectory
// V 7: launchBird
// V 8: resolveShot
// V 9: loop
// V 10: bindCollisions / damageBody
// V 11: sweepDestroyed (화면 밖 200px 정리)
// V 12: sweepDestroyed (pigsLeft 재계산)
// V 13: checkOutcome -> finishStage(true)
// V 14: checkOutcome / worldSettled -> finishStage(false)
// V 15: init (btn-pause 배선) / pauseGame
// V 16: loop (PLAYING 게이트)
// V 17: restartStage
// V 18: goMenu
// V 19: syncHud
// V 20: starsFor
// V 21: finishStage (Math.max 비교)
// V 22: drawFrame
// V 23: spawnDebris / updateParticles
// V 24: playSfx
// V 25: drawLoadError (init / loop의 typeof Matter 가드)
