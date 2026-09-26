// game.js — 상태 머신, 입력, 루프, 점수, 저장, UI 배선.
// 스크립트가 body 끝에 있으므로 최상위에서 DOM 을 바로 잡을 수 있다.

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

const MEM = { data: null };             // localStorage 가 막힌 환경의 메모리 폴백
const AUDIO = { ctx: null, lastHit: 0 }; // AudioContext 는 playSfx 첫 호출 때 만든다

// ---------------------------------------------------------------- 초기화 / 루프

function init() {
  // A2 가드: Matter 전역이 없으면 물리 없이 루프만 돌려 drawLoadError 를 띄운다.
  if (typeof Matter === 'undefined') {
    hideOverlays();
    document.getElementById('btn-pause').hidden = true;
    requestAnimationFrame(loop);
    return;
  }

  GAME.progress = loadProgress();
  if (!GAME.progress || typeof GAME.progress !== 'object') GAME.progress = { unlocked: 1, best: {} };
  if (!GAME.progress.best || typeof GAME.progress.best !== 'object') GAME.progress.best = {};
  if (!(GAME.progress.unlocked >= 1)) GAME.progress.unlocked = 1;
  GAME.progress.unlocked = Math.min(GAME.progress.unlocked, STAGES.length);

  GAME.engine = createEngine();
  bindCollisions(GAME.engine);

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

  // 포인터: down 은 캔버스, move/up 은 window (캔버스 밖에서 놓아도 발사)
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', function () {
    // 브라우저가 포인터를 가로챈 경우: 발사하지 않고 새를 슬링으로 되돌린다
    if (!GAME.dragging) return;
    GAME.dragging = false;
    GAME.dragPoint = { x: SLING.x, y: SLING.y };
    if (GAME.bird && GAME.bird.isStatic) Body.setPosition(GAME.bird, { x: SLING.x, y: SLING.y });
  });

  document.getElementById('btn-pause').hidden = true;
  showOverlay('overlay-menu');
  syncHud();
  requestAnimationFrame(loop);
}

// 일시정지 게이트는 여기 하나뿐이다. 렌더는 상태와 무관하게 매 프레임 돈다.
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

// ---------------------------------------------------------------- 상태 전이

function goMenu() {
  if (GAME.engine) Composite.clear(GAME.engine.world, false);
  GAME.blocks = [];
  GAME.pigs = [];
  GAME.bird = null;
  GAME.particles = [];
  GAME.pigsLeft = 0;
  GAME.birdsLeft = 0;
  GAME.score = 0;
  GAME.dragging = false;
  GAME.dragPoint = { x: SLING.x, y: SLING.y };
  GAME.phase = 'AIM';
  GAME.state = 'MENU';
  buildStageGrid();
  document.getElementById('btn-pause').hidden = true;
  showOverlay('overlay-menu');
  syncHud();
}

function startStage(index) {
  const stage = STAGES[index];
  if (!stage || !GAME.engine) return;
  GAME.stageIndex = index;
  GAME.score = 0;
  GAME.birdsLeft = stage.birds;
  GAME.particles = [];
  GAME.dragging = false;
  GAME.dragPoint = { x: SLING.x, y: SLING.y };
  GAME.settleFrames = 0;
  GAME.flightFrames = 0;
  GAME.clearDelay = 0;

  const built = buildStage(GAME.engine, stage);   // 월드를 비우고 새 배치를 세운다
  GAME.blocks = built.blocks;
  GAME.pigs = built.pigs;
  GAME.pigsLeft = GAME.pigs.length;

  GAME.bird = spawnBirdAtSling(GAME.engine);
  GAME.phase = 'AIM';

  hideOverlays();
  document.getElementById('btn-pause').hidden = false;
  syncHud();
  GAME.state = 'PLAYING';
}

function restartStage() {
  startStage(GAME.stageIndex);
}

function pauseGame() {
  if (GAME.state !== 'PLAYING') return;
  if (GAME.dragging) {
    GAME.dragging = false;
    GAME.dragPoint = { x: SLING.x, y: SLING.y };
    if (GAME.bird && GAME.bird.isStatic) Body.setPosition(GAME.bird, { x: SLING.x, y: SLING.y });
  }
  GAME.state = 'PAUSED';
  showOverlay('overlay-pause');
}

function resumeGame() {
  if (GAME.state !== 'PAUSED') return;
  GAME.state = 'PLAYING';
  hideOverlays();
}

// 점수 정산·저장·오버레이
function finishStage(cleared) {
  const stage = STAGES[GAME.stageIndex];
  if (cleared) {
    // 아직 쓰지 않은 새 보너스 (날고 있는 새는 이미 쓴 것으로 센다)
    const unused = Math.max(0, GAME.birdsLeft - (GAME.phase === 'FLYING' ? 1 : 0));
    GAME.score += unused * SCORE.birdLeft;

    const stars = starsFor(stage, GAME.score);
    const prev = GAME.progress.best[stage.id];
    const prevScore = prev && typeof prev.score === 'number' ? prev.score : 0;
    const bestScore = Math.max(prevScore, GAME.score);      // 낮으면 그대로 유지
    GAME.progress.best[stage.id] = { score: bestScore, stars: starsFor(stage, bestScore) };
    GAME.progress.unlocked = Math.max(GAME.progress.unlocked, Math.min(STAGES.length, stage.id + 1));
    saveProgress(GAME.progress);
    buildStageGrid();

    document.getElementById('clear-stars').textContent =
      '★'.repeat(stars) + '☆'.repeat(3 - stars);
    document.getElementById('clear-score').textContent =
      '점수 ' + GAME.score + '  /  최고 ' + bestScore;
    document.getElementById('btn-next').disabled = GAME.stageIndex + 1 >= STAGES.length;

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
  syncHud();
}

// ---------------------------------------------------------------- 판정

// 클리어: 돼지 0 → 잠시 뒤 오버레이. 실패: 마지막 새까지 회수됐고 월드 전체가 멎었는데 돼지가 남음.
function checkOutcome() {
  if (GAME.state !== 'PLAYING') return;

  if (GAME.pigsLeft === 0) {
    GAME.clearDelay += 1;
    if (GAME.clearDelay >= 60) finishStage(true);
    return;
  }
  GAME.clearDelay = 0;

  if (GAME.phase === 'AIM' && GAME.birdsLeft <= 0 && !GAME.bird) {
    // 새는 없고 돼지는 남았다. 구조물이 다 무너질 때까지 기다린 뒤 실패 판정.
    if (worldSettled()) GAME.settleFrames += 1; else GAME.settleFrames = 0;
    GAME.flightFrames += 1;   // resolveShot 이 0 으로 돌려놓은 뒤부터 세는 대기 상한
    if (GAME.settleFrames >= SETTLE_FRAMES || GAME.flightFrames >= FLIGHT_MAX_FRAMES) finishStage(false);
  }
}

// 비행 종료 감지: 화면 밖으로 나가거나, 월드가 멎었거나, 시간 상한
function updateShotPhase() {
  if (GAME.phase !== 'FLYING' || !GAME.bird) return;
  GAME.flightFrames += 1;
  const b = GAME.bird;
  const out = b.position.x < -200 || b.position.x > W + 200 || b.position.y > H + 200;
  if (out) { resolveShot(); return; }
  if (worldSettled()) GAME.settleFrames += 1; else GAME.settleFrames = 0;
  if (GAME.settleFrames >= SETTLE_FRAMES || GAME.flightFrames >= FLIGHT_MAX_FRAMES) resolveShot();
}

// 새·블록·돼지 전부 저속인가
function worldSettled() {
  const bodies = GAME.blocks.concat(GAME.pigs);
  if (GAME.bird && !GAME.bird.isStatic) bodies.push(GAME.bird);
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b.speed > SETTLE_SPEED || Math.abs(b.angularVelocity) > 0.02) return false;
  }
  return true;
}

// 새 회수 + 다음 장전. HUD 새 수는 여기서 준다.
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

// 파괴 표시된 바디 일괄 제거 (역순 순회). 화면 밖 200px 을 넘어간 바디도 여기서 뺀다.
// 마지막에 pigsLeft 를 배열 길이로 다시 계산한다 (감산 누적이 아니라 재계산).
function sweepDestroyed() {
  for (let i = GAME.blocks.length - 1; i >= 0; i--) {
    const b = GAME.blocks[i];
    const out = b.position.y > H + 200 || b.position.x < -200 || b.position.x > W + 200;
    if (b.destroyed) {
      removeBody(GAME.engine, b);
      GAME.blocks.splice(i, 1);
      GAME.score += SCORE.block;
      spawnDebris(b.position.x, b.position.y, b.color, 12);
    } else if (out) {
      removeBody(GAME.engine, b);
      GAME.blocks.splice(i, 1);
    }
  }
  for (let i = GAME.pigs.length - 1; i >= 0; i--) {
    const p = GAME.pigs[i];
    const out = p.position.y > H + 200 || p.position.x < -200 || p.position.x > W + 200;
    if (p.destroyed) {
      removeBody(GAME.engine, p);
      GAME.pigs.splice(i, 1);
      GAME.score += SCORE.pig;
      spawnDebris(p.position.x, p.position.y, '#6cc24a', 16);
      playSfx('pig');
    } else if (out) {
      // 화면 밖으로 떨어진 돼지도 제거된 것으로 친다 (그렇지 않으면 스테이지를 깰 수 없다)
      removeBody(GAME.engine, p);
      GAME.pigs.splice(i, 1);
      GAME.score += SCORE.pig;
      playSfx('pig');
    }
  }
  GAME.pigsLeft = GAME.pigs.length;
}

// ---------------------------------------------------------------- 조준 · 발사

// 세 줄의 순서: 정적 해제 → 속도. 정적 바디는 질량이 무한이라 속도 설정이 무시된다.
function launchBird() {
  const q = pullPoint(GAME.dragPoint);
  const v = pullVelocity(GAME.dragPoint);
  Body.setPosition(GAME.bird, q);     // 당긴 지점에서 출발 (정적 상태에서도 위치 이동은 유효)
  Body.setStatic(GAME.bird, false);   // 정적 해제가 속도 설정보다 반드시 먼저
  Body.setVelocity(GAME.bird, v);
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

// 포인터 → 캔버스 논리 좌표 (CSS 축소분을 흡수)
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (W / r.width),
           y: (e.clientY - r.top) * (H / r.height) };
}

function onPointerDown(e) {
  if (GAME.state !== 'PLAYING' || GAME.phase !== 'AIM' || !GAME.bird) return;
  e.preventDefault();
  GAME.dragging = true;
  GAME.dragPoint = pullPoint(canvasPoint(e));
  Body.setPosition(GAME.bird, GAME.dragPoint);
}

function onPointerMove(e) {
  if (!GAME.dragging || GAME.state !== 'PLAYING' || GAME.phase !== 'AIM' || !GAME.bird) return;
  GAME.dragPoint = pullPoint(canvasPoint(e));
  Body.setPosition(GAME.bird, GAME.dragPoint);
}

function onPointerUp(e) {
  if (!GAME.dragging) return;
  GAME.dragging = false;
  if (GAME.state !== 'PLAYING' || GAME.phase !== 'AIM' || !GAME.bird) return;
  GAME.dragPoint = pullPoint(canvasPoint(e));
  const d = Math.hypot(GAME.dragPoint.x - SLING.x, GAME.dragPoint.y - SLING.y);
  if (d < 10) {
    // 거의 안 당김: 발사 취소, 새를 슬링으로 되돌린다
    GAME.dragPoint = { x: SLING.x, y: SLING.y };
    Body.setPosition(GAME.bird, GAME.dragPoint);
    return;
  }
  launchBird();
}

// ---------------------------------------------------------------- HUD · 오버레이 · 메뉴

function syncHud() {
  document.getElementById('hud-stage').textContent = 'STAGE ' + (GAME.stageIndex + 1);
  document.getElementById('hud-score').textContent = 'SCORE ' + GAME.score;
  document.getElementById('hud-birds').textContent = 'BIRDS ' + GAME.birdsLeft;
}

function showOverlay(id) {
  hideOverlays();
  document.getElementById(id).classList.remove('hidden');
}

function hideOverlays() {
  const els = document.querySelectorAll('.overlay');
  for (let i = 0; i < els.length; i++) els[i].classList.add('hidden');
}

// 10칸 버튼 생성. 잠긴 칸은 disabled, 각 칸에 번호와 획득 별을 표시한다.
function buildStageGrid() {
  const grid = document.getElementById('stage-grid');
  grid.innerHTML = '';
  for (let i = 0; i < STAGES.length; i++) {
    const stage = STAGES[i];
    const rec = GAME.progress.best[stage.id];
    const stars = rec && typeof rec.stars === 'number' ? rec.stars : 0;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = stage.name;
    btn.disabled = i >= GAME.progress.unlocked;
    const num = document.createElement('div');
    num.textContent = String(stage.id);
    const star = document.createElement('div');
    star.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    star.style.fontSize = '12px';
    btn.appendChild(num);
    btn.appendChild(star);
    btn.addEventListener('click', (function (index) {
      return function () { startStage(index); };
    })(i));
    grid.appendChild(btn);
  }
}

// 별 등급은 스테이지별 임계값에서 읽는다 (고정값 금지)
function starsFor(stage, score) {
  if (score >= stage.star3) return 3;
  if (score >= stage.star2) return 2;
  return 1;
}

// ---------------------------------------------------------------- 저장소

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

// ---------------------------------------------------------------- 효과음 · 파편

// kind: 'launch' | 'hit' | 'pig' | 'clear' | 'fail'. AudioContext 는 첫 호출(첫 클릭 이후)에 만든다.
function playSfx(kind) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!AUDIO.ctx) AUDIO.ctx = new AC();
    const ac = AUDIO.ctx;
    if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime;
    if (kind === 'hit') {
      if (t - AUDIO.lastHit < 0.05) return;   // 붕괴 중 다발 충돌 소리 억제
      AUDIO.lastHit = t;
    }
    //                 [시작 Hz, 끝 Hz, 파형, 길이(s), 음량]
    const spec = {
      launch: [420, 900, 'square',   0.12, 0.12],
      hit:    [220, 80,  'triangle', 0.09, 0.14],
      pig:    [640, 260, 'sawtooth', 0.22, 0.14],
      clear:  [523, 1046, 'sine',    0.55, 0.16],
      fail:   [330, 110, 'sine',     0.65, 0.16]
    }[kind];
    if (!spec) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = spec[2];
    osc.frequency.setValueAtTime(spec[0], t);
    osc.frequency.exponentialRampToValueAtTime(spec[1], t + spec[3]);
    gain.gain.setValueAtTime(spec[4], t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + spec[3]);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + spec[3] + 0.02);
  } catch (e) { /* 오디오가 없어도 게임은 계속된다 */ }
}

// 파편 n 개 생성 (블록 12, 돼지 16)
function spawnDebris(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 2 + Math.random() * 6;
    const life = 30 + Math.floor(Math.random() * 30);
    GAME.particles.push({
      x: x, y: y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2,
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      size: 4 + Math.random() * 6,
      color: color || '#c8873c',
      life: life, maxLife: life
    });
  }
}

// 파편 갱신·수거 (역순 순회). 수명이 다하거나 화면 아래로 빠지면 뺀다.
function updateParticles() {
  for (let i = GAME.particles.length - 1; i >= 0; i--) {
    const p = GAME.particles[i];
    p.vy += G_STEP * 0.8;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.life -= 1;
    if (p.life <= 0 || p.y > H + 40) GAME.particles.splice(i, 1);
  }
}

window.addEventListener('load', init);

// DONE-CHECK
// hop 1: game.js:init  (#btn-play click → startStage(GAME.progress.unlocked - 1); STAGES[0] 은 stages.js)
// hop 2: game.js:startStage  (buildStage + spawnBirdAtSling; GAME.engine 은 init 의 createEngine)
// hop 3: game.js:loop  (state==='PLAYING' 일 때만 Engine.update(GAME.engine, STEP_MS))
// hop 4: game.js:onPointerUp → game.js:launchBird  (setStatic(false) 뒤 setVelocity)
// hop 5: physics.js:bindCollisions → physics.js:damageBody → game.js:sweepDestroyed → game.js:checkOutcome → game.js:finishStage
// V 1: startStage (STAGES[index] 의 고유 배치를 buildStage 로 세움)
// V 2: buildStageGrid
// V 3: startStage (buildStage 가 Composite.clear 로 월드를 비움; #btn-next 배선은 init)
// V 4: loadProgress / saveProgress (finishStage 가 unlocked 갱신 후 저장)
// V 5: onPointerDown / onPointerMove / canvasPoint / pullPoint (고무줄은 render.js:drawSling)
// V 6: trajectoryPoints (렌더는 render.js:drawTrajectory)
// V 7: launchBird
// V 8: updateShotPhase / resolveShot
// V 9: loop
// V 10: bindCollisions / damageBody (physics.js) / sweepDestroyed
// V 11: sweepDestroyed (블록·돼지) / updateShotPhase (새)
// V 12: sweepDestroyed
// V 13: checkOutcome / finishStage
// V 14: checkOutcome / worldSettled / finishStage
// V 15: pauseGame (버튼 위치는 index.html #btn-pause + #wrap position:relative)
// V 16: loop
// V 17: restartStage / startStage
// V 18: goMenu
// V 19: sweepDestroyed / syncHud
// V 20: starsFor
// V 21: finishStage
// V 22: drawFrame / drawBackground (render.js)
// V 23: spawnDebris / updateParticles (렌더는 render.js:drawParticles)
// V 24: playSfx
// V 25: init / loop / drawLoadError (render.js)
