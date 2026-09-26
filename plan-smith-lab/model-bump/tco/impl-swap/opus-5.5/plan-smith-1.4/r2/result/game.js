// game.js — 상태 머신, 입력, 루프, 점수, 저장, UI 배선.
// stages.js(상수) · physics.js(Matter 별칭·월드) · render.js(그리기)의 전역을 그대로 쓴다.
// 스크립트가 body 끝에 있으므로 DOM 요소를 최상위에서 바로 잡을 수 있다.

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

const MEM = { data: null };                 // localStorage가 막힌 환경의 메모리 폴백 (§5.10)
const AUDIO = { ctx: null, lastHit: 0 };    // AudioContext는 playSfx 첫 호출 때 만든다

/* ================= 초기화 · 루프 ================= */

function init() {
  if (typeof Matter === 'undefined') {
    // CDN 로드 실패: 리스너를 걸지 않는다(걸면 첫 클릭에서 예외). 원인 문구만 계속 그린다.
    hideOverlays();
    document.getElementById('hud').style.visibility = 'hidden';
    document.getElementById('btn-pause').style.visibility = 'hidden';
    drawLoadError(ctx);
    requestAnimationFrame(loop);
    return;
  }

  GAME.engine = createEngine();          // 게임당 1회
  bindCollisions(GAME.engine);           // 게임당 1회

  const saved = loadProgress();
  const unlocked = Math.floor(Number(saved && saved.unlocked)) || 1;
  GAME.progress = {
    unlocked: Math.min(STAGES.length, Math.max(1, unlocked)),
    best: (saved && saved.best && typeof saved.best === 'object') ? saved.best : {}
  };

  // 버튼 배선
  const on = function (id, fn) { document.getElementById(id).addEventListener('click', fn); };
  on('btn-play', function () { startStage(GAME.progress.unlocked - 1); });
  on('btn-pause', pauseGame);
  on('btn-resume', resumeGame);
  on('btn-restart', restartStage);
  on('btn-menu', goMenu);
  on('btn-next', function () {
    if (GAME.stageIndex + 1 < STAGES.length) startStage(GAME.stageIndex + 1);
  });
  on('btn-clear-retry', restartStage);
  on('btn-clear-menu', goMenu);
  on('btn-fail-retry', restartStage);
  on('btn-fail-menu', goMenu);

  // 입력: pointerdown만 캔버스, move/up은 window (캔버스 밖에서 손을 떼도 발사)
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', function () {
    if (!GAME.dragging) return;
    GAME.dragging = false;
    GAME.dragPoint = { x: SLING.x, y: SLING.y };
    if (GAME.bird && GAME.bird.isStatic) Body.setPosition(GAME.bird, { x: SLING.x, y: SLING.y });
  });

  goMenu();
  requestAnimationFrame(loop);
}

window.addEventListener('load', init);

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

/* ================= 상태 전이 ================= */

function goMenu() {
  if (GAME.engine) Composite.clear(GAME.engine.world, false);
  GAME.blocks = [];
  GAME.pigs = [];
  GAME.bird = null;
  GAME.particles = [];
  GAME.dragging = false;
  GAME.dragPoint = { x: SLING.x, y: SLING.y };
  GAME.phase = 'AIM';
  GAME.score = 0;
  GAME.birdsLeft = 0;
  GAME.pigsLeft = 0;
  GAME.settleFrames = 0;
  GAME.flightFrames = 0;
  GAME.clearDelay = 0;
  GAME.state = 'MENU';
  document.getElementById('hud').style.visibility = 'hidden';
  document.getElementById('btn-pause').style.visibility = 'hidden';
  buildStageGrid();
  showOverlay('overlay-menu');
}

function startStage(index) {
  const stage = STAGES[index];
  if (!stage || !GAME.engine) return;
  GAME.stageIndex = index;
  const built = buildStage(GAME.engine, stage);   // 월드 비우기 포함 — 이전 스테이지 잔해가 남지 않는다
  GAME.blocks = built.blocks;
  GAME.pigs = built.pigs;
  GAME.particles = [];
  GAME.score = 0;
  GAME.birdsLeft = stage.birds;
  GAME.pigsLeft = GAME.pigs.length;
  GAME.dragging = false;
  GAME.dragPoint = { x: SLING.x, y: SLING.y };
  GAME.settleFrames = 0;
  GAME.flightFrames = 0;
  GAME.clearDelay = 0;
  GAME.bird = spawnBirdAtSling(GAME.engine);
  GAME.phase = 'AIM';
  hideOverlays();
  document.getElementById('hud').style.visibility = 'visible';
  document.getElementById('btn-pause').style.visibility = 'visible';
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
  hideOverlays();
  GAME.state = 'PLAYING';
}

// 점수 정산 · 저장 · 오버레이
function finishStage(cleared) {
  const stage = STAGES[GAME.stageIndex];
  const fmt = function (n) { return Number(n || 0).toLocaleString('en-US'); };
  GAME.dragging = false;

  if (!cleared) {
    GAME.state = 'FAIL';
    document.getElementById('fail-msg').textContent =
      '돼지 ' + GAME.pigsLeft + '마리가 남았습니다 · 점수 ' + fmt(GAME.score);
    showOverlay('overlay-fail');
    playSfx('fail');
    return;
  }

  // 아직 쏘지 않은 새만 보너스 (비행 중인 새는 birdsLeft에 아직 포함돼 있으므로 뺀다)
  const unused = Math.max(0, GAME.birdsLeft - (GAME.phase === 'FLYING' ? 1 : 0));
  const bonus = unused * SCORE.birdLeft;
  GAME.score += bonus;

  const stars = starsFor(stage, GAME.score);
  const prev = GAME.progress.best[stage.id] || { score: 0, stars: 0 };
  const prevScore = Number(prev.score) || 0;
  const prevStars = Number(prev.stars) || 0;
  const best = Object.assign({}, GAME.progress.best);
  best[stage.id] = {
    score: Math.max(prevScore, GAME.score),   // 낮은 점수로 다시 깨도 최고점·별은 줄지 않는다
    stars: Math.max(prevStars, stars)
  };
  const progress = {
    unlocked: Math.max(GAME.progress.unlocked, Math.min(STAGES.length, GAME.stageIndex + 2)),
    best: best
  };
  GAME.progress = progress;
  saveProgress(progress);

  GAME.state = 'CLEAR';
  syncHud();

  const last = GAME.stageIndex + 1 >= STAGES.length;
  document.querySelector('#overlay-clear h2').textContent = last ? 'ALL STAGES CLEAR' : 'STAGE CLEAR';
  const starsEl = document.getElementById('clear-stars');
  starsEl.style.fontSize = '52px';
  starsEl.style.letterSpacing = '6px';
  starsEl.innerHTML =
    '<span style="color:#ffd23f">' + '★'.repeat(stars) + '</span>' +
    '<span style="color:rgba(255,255,255,.3)">' + '★'.repeat(3 - stars) + '</span>';
  document.getElementById('clear-score').innerHTML =
    '<div style="text-align:center;line-height:1.7">' +
      '<div>남은 새 보너스 +' + fmt(bonus) + '</div>' +
      '<div style="font-size:26px;font-weight:bold">점수 ' + fmt(GAME.score) +
        (GAME.score > prevScore ? ' <span style="color:#ffd23f">NEW BEST</span>' : '') + '</div>' +
      '<div>최고 점수 ' + fmt(best[stage.id].score) + '</div>' +
      (last ? '<div>모든 스테이지를 클리어했습니다!</div>' : '') +
    '</div>';
  document.getElementById('btn-next').style.display = last ? 'none' : '';
  showOverlay('overlay-clear');
  playSfx('clear');
}

/* ================= 판정 ================= */

function checkOutcome() {
  if (GAME.state !== 'PLAYING') return;

  if (GAME.pigsLeft === 0) {
    GAME.clearDelay++;
    if (GAME.clearDelay >= 60) finishStage(true);   // 약 1초 뒤 클리어
    return;
  }

  // 실패: 마지막 새까지 회수된 뒤, 월드 전체가 SETTLE_FRAMES 연속으로 멎었는데 돼지가 남아 있을 때.
  // (새 속도만 보면 구조물이 무너지는 도중에 실패가 먼저 뜬다)
  if (GAME.birdsLeft > 0 || GAME.phase !== 'AIM') return;
  GAME.flightFrames++;                                  // 대기 프레임 — 끝없이 떨리는 적재를 대비한 상한
  if (worldSettled()) GAME.settleFrames++;
  else GAME.settleFrames = 0;
  if (GAME.settleFrames >= SETTLE_FRAMES || GAME.flightFrames >= FLIGHT_MAX_FRAMES) finishStage(false);
}

// 비행 종료 감지: 멈춤 / 화면 밖 / 7초 초과
function updateShotPhase() {
  if (GAME.phase !== 'FLYING' || !GAME.bird) return;
  const b = GAME.bird;
  GAME.flightFrames++;
  // 비행 중엔 공기저항 0(궤적 미리보기와 일치). 지면에 닿으면 구르기가 멎도록 감쇠를 켠다.
  if (b.frictionAir === 0 && b.position.y >= GROUND_Y - b.circleRadius - 2) b.frictionAir = 0.03;
  const out = b.position.x < -200 || b.position.x > W + 200 || b.position.y > H + 200;
  if (b.speed < SETTLE_SPEED) GAME.settleFrames++;
  else GAME.settleFrames = 0;
  if (out || GAME.settleFrames >= SETTLE_FRAMES || GAME.flightFrames >= FLIGHT_MAX_FRAMES) resolveShot();
}

function worldSettled() {
  if (GAME.bird && !GAME.bird.isStatic && GAME.bird.speed >= SETTLE_SPEED) return false;
  for (let i = 0; i < GAME.blocks.length; i++) {
    if (GAME.blocks[i].speed >= SETTLE_SPEED) return false;
  }
  for (let i = 0; i < GAME.pigs.length; i++) {
    if (GAME.pigs[i].speed >= SETTLE_SPEED) return false;
  }
  return true;
}

// 새 회수 + 다음 장전
function resolveShot() {
  const b = GAME.bird;
  if (b) {
    const onScreen = b.position.x > 0 && b.position.x < W && b.position.y < H;
    removeBody(GAME.engine, b);
    if (onScreen) spawnDebris(b.position.x, b.position.y, '#d7322b', 6);   // 깃털
  }
  GAME.bird = null;
  GAME.birdsLeft = Math.max(0, GAME.birdsLeft - 1);
  GAME.phase = 'AIM';
  GAME.settleFrames = 0;
  GAME.flightFrames = 0;
  GAME.dragPoint = { x: SLING.x, y: SLING.y };
  if (GAME.birdsLeft > 0) GAME.bird = spawnBirdAtSling(GAME.engine);
  syncHud();
}

// 파괴 표시된(또는 화면 밖 200px을 넘어간) 블록·돼지를 역순으로 일괄 제거.
// 순서: removeBody -> splice -> 점수 -> spawnDebris. 마지막에 pigsLeft는 배열 길이로 재계산한다.
function sweepDestroyed() {
  let changed = false;

  for (let i = GAME.blocks.length - 1; i >= 0; i--) {
    const b = GAME.blocks[i];
    const out = b.position.x < -200 || b.position.x > W + 200 || b.position.y > H + 200;
    if (out) b.destroyed = true;
    if (!b.destroyed) continue;
    removeBody(GAME.engine, b);
    GAME.blocks.splice(i, 1);
    GAME.score += SCORE.block;
    if (!out) spawnDebris(b.position.x, b.position.y, b.color, 10 + Math.floor(Math.random() * 7));
    changed = true;
  }

  for (let i = GAME.pigs.length - 1; i >= 0; i--) {
    const p = GAME.pigs[i];
    const out = p.position.x < -200 || p.position.x > W + 200 || p.position.y > H + 200;
    if (out) p.destroyed = true;
    if (!p.destroyed) continue;
    removeBody(GAME.engine, p);
    GAME.pigs.splice(i, 1);
    GAME.score += SCORE.pig;
    if (!out) spawnDebris(p.position.x, p.position.y, '#7ccc46', 10 + Math.floor(Math.random() * 7));
    playSfx('pig');
    changed = true;
  }

  GAME.pigsLeft = GAME.pigs.length;
  if (changed) syncHud();
}

/* ================= 조준 · 발사 ================= */

// §5.7과의 차이: setPosition을 맨 앞으로 옮겼다. §11-7 / S5 검증은 setVelocity의 "바로 앞줄"이
// setStatic(false)이기를 요구하는데 §5.7 원문은 그 사이에 setPosition이 끼어 있다.
// 지켜야 할 불변식(정적 해제가 속도 설정보다 먼저)은 그대로다. 정적 바디는 옮겨도 무방하다.
function launchBird() {
  const q = pullPoint(GAME.dragPoint);
  const v = pullVelocity(GAME.dragPoint);
  Body.setPosition(GAME.bird, q);     // (2) 당긴 지점에서 출발
  Body.setStatic(GAME.bird, false);   // (1) 정적 바디는 질량이 무한이라 속도 설정이 무시된다
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

// §5.6 원문과 다른 한 곳: 적분 시작점을 SLING 중심이 아니라 pullPoint(p)로 둔다.
// launchBird()가 새를 당긴 지점 q에서 출발시키므로, SLING에서 시작하면 점선 전체가
// 당긴 벡터(최대 120px)만큼 실제 비행 경로와 평행하게 어긋난다.
function trajectoryPoints(p) {
  const v = pullVelocity(p);
  const q = pullPoint(p);
  const pts = [];
  let x = q.x, y = q.y, vx = v.x, vy = v.y;
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
  if (!e.isPrimary) return;
  if (GAME.state !== 'PLAYING' || GAME.phase !== 'AIM' || !GAME.bird || GAME.pigsLeft === 0) return;
  const p = canvasPoint(e);
  const b = GAME.bird.position;
  if (Math.hypot(p.x - b.x, p.y - b.y) > 90) return;   // 새 근처(90px 안)를 짚어야 잡힌다
  e.preventDefault();
  GAME.dragging = true;
  onPointerMove(e);
}

function onPointerMove(e) {
  if (!GAME.dragging || !e.isPrimary) return;
  if (GAME.state !== 'PLAYING' || !GAME.bird) return;
  const q = pullPoint(canvasPoint(e));
  if (q.y > GROUND_Y - 20) q.y = GROUND_Y - 20;        // 새가 지면 속으로 파고든 채 발사되지 않게
  GAME.dragPoint = q;                                   // 이미 maxPull 안쪽이므로 pullPoint(dragPoint) === dragPoint
  Body.setPosition(GAME.bird, q);                       // 새가 포인터를 따라온다 (정적 상태 그대로)
}

function onPointerUp(e) {
  if (!GAME.dragging || !e.isPrimary) return;
  GAME.dragging = false;
  if (GAME.state !== 'PLAYING' || GAME.phase !== 'AIM' || !GAME.bird) return;
  const q = pullPoint(GAME.dragPoint);
  if (Math.hypot(q.x - SLING.x, q.y - SLING.y) < 12) { // 거의 안 당겼으면 발사 취소
    GAME.dragPoint = { x: SLING.x, y: SLING.y };
    Body.setPosition(GAME.bird, { x: SLING.x, y: SLING.y });
    return;
  }
  launchBird();
}

/* ================= HUD · 오버레이 · 스테이지 선택 ================= */

function syncHud() {
  const stage = STAGES[GAME.stageIndex];
  const set = function (id, text) {
    const el = document.getElementById(id);
    if (el.textContent !== text) el.textContent = text;
  };
  set('hud-stage', 'STAGE ' + stage.id + ' · ' + stage.name);
  set('hud-score', 'SCORE ' + GAME.score.toLocaleString('en-US'));
  set('hud-birds', 'BIRDS ' + GAME.birdsLeft + ' · PIGS ' + GAME.pigsLeft);
}

function showOverlay(id) {
  hideOverlays();
  document.getElementById(id).classList.remove('hidden');
}

function hideOverlays() {
  const list = document.querySelectorAll('.overlay');
  for (let i = 0; i < list.length; i++) list[i].classList.add('hidden');
}

function buildStageGrid() {
  const grid = document.getElementById('stage-grid');
  grid.innerHTML = '';
  for (let i = 0; i < STAGES.length; i++) {
    const stage = STAGES[i];
    const rec = GAME.progress.best[stage.id];
    const stars = Math.max(0, Math.min(3, (rec && Number(rec.stars)) || 0));
    const locked = i >= GAME.progress.unlocked;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.disabled = locked;
    btn.title = stage.name + (rec ? ' · 최고 ' + (Number(rec.score) || 0).toLocaleString('en-US') : '');
    btn.innerHTML =
      '<div style="font-size:20px;font-weight:bold">' + stage.id + '</div>' +
      (locked
        ? '<div style="font-size:12px">잠김</div>'
        : '<div style="font-size:14px;letter-spacing:1px">' +
            '<span style="color:#e0a400">' + '★'.repeat(stars) + '</span>' +
            '<span style="color:#9a9a9a">' + '☆'.repeat(3 - stars) + '</span>' +
          '</div>');
    btn.addEventListener('click', function () { startStage(i); });
    grid.appendChild(btn);
  }
}

function starsFor(stage, score) {
  if (score >= stage.star3) return 3;
  if (score >= stage.star2) return 2;
  return 1;
}

/* ================= 저장 ================= */

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

/* ================= 효과음 · 파편 ================= */

// kind: 'launch' | 'hit' | 'pig' | 'clear' | 'fail'
// AudioContext는 첫 호출 때 만든다(로드 시점에 만들면 자동재생 정책이 정지 상태로 붙잡는다).
function playSfx(kind) {
  try {
    if (!AUDIO.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      AUDIO.ctx = new AC();
    }
    const ac = AUDIO.ctx;
    if (ac.state === 'suspended') {
      const r = ac.resume();
      if (r && r.catch) r.catch(function () {});
    }
    const now = ac.currentTime;
    if (kind === 'hit') {
      if (now - AUDIO.lastHit < 0.06) return;   // 한 프레임에 충돌쌍이 몰려도 소리는 하나
      AUDIO.lastHit = now;
    }
    const tone = function (f0, f1, at, dur, type, vol) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const t0 = now + at;
      osc.type = type;
      osc.frequency.setValueAtTime(f0, t0);
      osc.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    };
    if (kind === 'launch') {
      tone(320, 760, 0, 0.22, 'triangle', 0.18);                       // 올라가는 휙
    } else if (kind === 'hit') {
      tone(180, 90, 0, 0.09, 'square', 0.07);                          // 낮은 쿵
    } else if (kind === 'pig') {
      tone(620, 980, 0, 0.12, 'sine', 0.2);                            // 높은 뿅
      tone(980, 1400, 0.08, 0.1, 'sine', 0.14);
    } else if (kind === 'clear') {
      [523, 659, 784, 1047].forEach(function (f, i) { tone(f, f, i * 0.12, 0.2, 'triangle', 0.18); });
    } else if (kind === 'fail') {
      [392, 330, 262].forEach(function (f, i) { tone(f, f * 0.94, i * 0.18, 0.26, 'sawtooth', 0.08); });
    }
  } catch (e) {}
}

function spawnDebris(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1.5 + Math.random() * 4.5;
    const life = 40 + Math.floor(Math.random() * 30);
    GAME.particles.push({
      x: x + (Math.random() - 0.5) * 16,
      y: y + (Math.random() - 0.5) * 16,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 2,
      size: 4 + Math.random() * 7,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.4,
      color: color,
      life: life,
      maxLife: life
    });
  }
}

// 파편 갱신·수거: 수명이 매 프레임 줄고 0이 되면 역순 splice로 뺀다
function updateParticles() {
  const list = GAME.particles;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.vy += G_STEP;
    p.vx *= 0.99;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    const floor = GROUND_Y - p.size * 0.3;
    if (p.y > floor) {
      p.y = floor;
      p.vy *= -0.35;
      p.vx *= 0.75;
      p.vr *= 0.7;
    }
    p.life--;
    if (p.life <= 0) list.splice(i, 1);
  }
}

// DONE-CHECK
// hop 1: game.js:init        — #btn-play click -> startStage(GAME.progress.unlocked - 1)
// hop 2: game.js:startStage  — physics.js:buildStage(GAME.engine, STAGES[i]) + physics.js:spawnBirdAtSling
// hop 3: game.js:loop        — Engine.update(GAME.engine, STEP_MS) while GAME.state === 'PLAYING'
// hop 4: game.js:launchBird  — from game.js:onPointerUp; setStatic(false) directly before setVelocity
// hop 5: game.js:checkOutcome — physics.js:bindCollisions/damageBody -> game.js:sweepDestroyed -> finishStage(true) -> showOverlay('overlay-clear')
// V 1: buildStage      — STAGES[i]의 블록·돼지 배치를 세운다
// V 2: buildStageGrid  — 해금된 칸 클릭 -> startStage(i)
// V 3: startStage      — buildStage의 Composite.clear로 이전 잔해를 비우고 다음 배치 로드
// V 4: saveProgress    — finishStage에서 unlocked 갱신 후 localStorage 저장, init의 loadProgress로 복원
// V 5: onPointerMove   — canvasPoint 좌표 변환 + pullPoint 120px 클램프, drawSling 고무줄 두 줄
// V 6: trajectoryPoints — G_STEP 적분, 4스텝마다 1점 (최대 28점)
// V 7: launchBird      — setStatic(false) 후 setVelocity
// V 8: resolveShot     — birdsLeft 1 감소 + spawnBirdAtSling
// V 9: loop            — 매 프레임 Engine.update
// V 10: damageBody     — 표시만, 제거는 sweepDestroyed
// V 11: sweepDestroyed — 화면 밖 200px 초과 바디 제거
// V 12: sweepDestroyed — 돼지 제거 +5000, 초록 파편, pigsLeft = pigs.length 재계산
// V 13: checkOutcome   — pigsLeft === 0 -> clearDelay 후 finishStage(true)
// V 14: worldSettled   — 마지막 새 회수 뒤 월드 전체 정지 SETTLE_FRAMES 연속일 때만 실패
// V 15: pauseGame      — #btn-pause(#wrap 자식, right:16px)
// V 16: loop           — state !== 'PLAYING'이면 Engine.update 생략, 렌더는 계속
// V 17: restartStage   — startStage가 score 0, birdsLeft = stage.birds
// V 18: goMenu         — Composite.clear + state = 'MENU'
// V 19: sweepDestroyed — 블록 파괴마다 +500 후 syncHud
// V 20: starsFor       — stage.star2 / stage.star3 사용
// V 21: finishStage    — best.score / best.stars를 Math.max로 비교 후 saveProgress
// V 22: drawFrame      — clearRect -> drawBackground -> 바디
// V 23: spawnDebris    — 10~16개, updateParticles가 수명 감소·수거
// V 24: playSfx        — 5종 서로 다른 높이, AudioContext 첫 호출 때 생성
// V 25: drawLoadError  — init 첫 줄 typeof Matter 가드 + loop의 분기
