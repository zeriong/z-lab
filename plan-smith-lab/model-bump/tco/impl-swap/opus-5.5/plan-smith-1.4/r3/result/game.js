// game.js — 상태 머신, 입력, 루프, 점수, 저장, UI 배선.
// 공용 상수는 stages.js, Matter 별칭(Engine / Composite / Bodies / Body / Events)은 physics.js에만 선언돼 있다.
// 여기서 그 이름들을 다시 선언하지 않는다.

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

const MEM = { data: null };                 // localStorage가 막힌 환경의 메모리 폴백
const AUDIO = { ctx: null, lastHit: 0 };    // AudioContext는 playSfx 첫 호출 때 만든다(자동재생 정책)

// ───────────────────────── 부트 ─────────────────────────

function init() {
  if (typeof Matter === 'undefined') {
    // CDN 로드 실패: 어떤 Matter 호출도 하지 않고, 루프가 매 프레임 안내 문구를 그리게 한다.
    hideOverlays();
    document.getElementById('hud').style.visibility = 'hidden';
    document.getElementById('btn-pause').style.visibility = 'hidden';
    requestAnimationFrame(loop);
    return;
  }

  GAME.engine = createEngine();          // 게임당 1회
  bindCollisions(GAME.engine);           // 게임당 1회 (두 번 걸면 데미지 2배)

  const saved = loadProgress() || {};
  const unlocked = Math.floor(Number(saved.unlocked)) || 1;
  GAME.progress = {
    unlocked: Math.min(STAGES.length, Math.max(1, unlocked)),
    best: (saved.best && typeof saved.best === 'object') ? saved.best : {}
  };

  // 입력: pointerdown만 캔버스, move/up은 window (캔버스 밖에서 손을 떼도 발사돼야 한다)
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  // 버튼 배선
  const on = function (id, fn) {
    document.getElementById(id).addEventListener('click', function (e) {
      if (e.currentTarget && e.currentTarget.blur) e.currentTarget.blur();
      fn();
    });
  };
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

  // 보조 입력: Esc / P 로 일시정지 토글, 탭이 가려지면 자동 일시정지
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      if (GAME.state === 'PLAYING') pauseGame();
      else if (GAME.state === 'PAUSED') resumeGame();
    }
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && GAME.state === 'PLAYING') pauseGame();
  });

  goMenu();
  requestAnimationFrame(loop);           // 루프는 여기서 1회만 시작
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

// ───────────────────────── 상태 전이 ─────────────────────────

function goMenu() {
  GAME.state = 'MENU';
  GAME.dragging = false;
  if (GAME.engine) {
    Composite.clear(GAME.engine.world, false);
    if (typeof Engine.clear === 'function') Engine.clear(GAME.engine);
  }
  GAME.blocks = [];
  GAME.pigs = [];
  GAME.bird = null;
  GAME.particles = [];
  GAME.phase = 'AIM';
  GAME.score = 0;
  GAME.birdsLeft = 0;
  GAME.pigsLeft = 0;
  GAME.dragPoint = { x: SLING.x, y: SLING.y };
  document.getElementById('hud').style.visibility = 'hidden';
  document.getElementById('btn-pause').style.visibility = 'hidden';
  buildStageGrid();
  showOverlay('overlay-menu');
}

function startStage(index) {
  if (typeof Matter === 'undefined' || !GAME.engine) return;
  if (!(index >= 0 && index < STAGES.length)) index = 0;
  const stage = STAGES[index];

  GAME.stageIndex = index;
  const built = buildStage(GAME.engine, stage);   // 월드 비우기 → 지면 → 블록 → 돼지
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
  GAME.state = 'PAUSED';
  if (GAME.dragging) {
    GAME.dragging = false;
    if (GAME.bird && GAME.bird.isStatic) Body.setPosition(GAME.bird, { x: SLING.x, y: SLING.y });
  }
  GAME.dragPoint = { x: SLING.x, y: SLING.y };
  showOverlay('overlay-pause');
}

function resumeGame() {
  if (GAME.state !== 'PAUSED') return;
  hideOverlays();
  GAME.state = 'PLAYING';
}

// 점수 정산·저장·오버레이.
function finishStage(cleared) {
  if (GAME.state !== 'PLAYING') return;
  GAME.dragging = false;
  const stage = STAGES[GAME.stageIndex];

  if (!cleared) {
    GAME.state = 'FAIL';
    document.getElementById('fail-msg').textContent =
      '남은 돼지 ' + GAME.pigsLeft + '마리 — 새를 모두 썼습니다.';
    syncHud();
    showOverlay('overlay-fail');
    playSfx('fail');
    return;
  }

  // 남은 새 보너스. 날고 있는 새는 이미 쓴 새로 친다.
  const unused = Math.max(0, GAME.birdsLeft - (GAME.phase === 'FLYING' ? 1 : 0));
  GAME.score += unused * SCORE.birdLeft;

  const stars = starsFor(stage, GAME.score);
  const key = String(stage.id);
  const prev = GAME.progress.best[key] || {};
  const prevScore = Number(prev.score) || 0;
  const prevStars = Number(prev.stars) || 0;
  const isRecord = GAME.score > prevScore;
  GAME.progress.best[key] = {
    score: Math.max(prevScore, GAME.score),   // 비교 후 갱신 — 낮은 점수로 덮어쓰지 않는다
    stars: Math.max(prevStars, stars)
  };
  GAME.progress.unlocked = Math.max(GAME.progress.unlocked, Math.min(STAGES.length, GAME.stageIndex + 2));
  saveProgress(GAME.progress);

  GAME.state = 'CLEAR';

  const starsEl = document.getElementById('clear-stars');
  starsEl.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  starsEl.style.fontSize = '52px';
  starsEl.style.color = '#ffd23f';
  starsEl.style.letterSpacing = '8px';

  const isLast = GAME.stageIndex + 1 >= STAGES.length;
  const scoreEl = document.getElementById('clear-score');
  scoreEl.style.whiteSpace = 'pre-line';
  scoreEl.style.textAlign = 'center';
  scoreEl.style.fontSize = '20px';
  scoreEl.textContent =
    '이번 점수 ' + GAME.score.toLocaleString('en-US') + (isRecord ? '  (신기록!)' : '') + '\n' +
    '최고 점수 ' + GAME.progress.best[key].score.toLocaleString('en-US') +
    (unused > 0 ? '\n남은 새 보너스 +' + (unused * SCORE.birdLeft).toLocaleString('en-US') : '') +
    (isLast ? '\n모든 스테이지를 클리어했습니다!' : '');
  document.getElementById('btn-next').style.display = isLast ? 'none' : '';

  buildStageGrid();
  syncHud();
  showOverlay('overlay-clear');
  playSfx('clear');
}

// ───────────────────────── 판정 ─────────────────────────

// 클리어/실패 판정. 클리어: 돼지 0 → 잠시 뒤. 실패: 새 소진 + 월드 전체 정지.
function checkOutcome() {
  if (GAME.state !== 'PLAYING') return;

  if (GAME.pigsLeft === 0) {
    GAME.clearDelay++;
    if (GAME.clearDelay >= 60) finishStage(true);   // 약 1초 뒤 (파편이 흩어지는 걸 보여준다)
    return;
  }

  if (GAME.birdsLeft > 0 || GAME.bird) return;

  // 마지막 새까지 회수됐다. 구조물이 다 멎을 때까지 기다린다(무너지는 중에 실패를 띄우지 않는다).
  GAME.flightFrames++;
  if (worldSettled()) GAME.settleFrames++;
  else GAME.settleFrames = 0;
  if (GAME.settleFrames >= SETTLE_FRAMES || GAME.flightFrames >= FLIGHT_MAX_FRAMES) finishStage(false);
}

// 비행 종료 감지: 새가 멈췄거나, 화면 밖으로 나갔거나, 7초가 지났으면 회수한다.
function updateShotPhase() {
  if (GAME.phase !== 'FLYING' || !GAME.bird) return;
  const b = GAME.bird;
  GAME.flightFrames++;
  // 위쪽으로 나간 새는 중력으로 돌아오므로 좌·우·아래만 화면 밖으로 본다.
  const out = b.position.x < -200 || b.position.x > W + 200 || b.position.y > H + 200;
  if (b.speed < SETTLE_SPEED) GAME.settleFrames++;
  else GAME.settleFrames = 0;
  if (out || GAME.settleFrames >= SETTLE_FRAMES || GAME.flightFrames >= FLIGHT_MAX_FRAMES) resolveShot();
}

// 새·블록·돼지 전부 저속인가
function worldSettled() {
  if (GAME.bird && !GAME.bird.isStatic && GAME.bird.speed > SETTLE_SPEED) return false;
  for (let i = 0; i < GAME.blocks.length; i++) {
    if (GAME.blocks[i].speed > SETTLE_SPEED) return false;
  }
  for (let i = 0; i < GAME.pigs.length; i++) {
    if (GAME.pigs[i].speed > SETTLE_SPEED) return false;
  }
  return true;
}

// 새 회수 + 다음 장전. birdsLeft는 슬링 위/비행 중인 새를 포함한 수다.
function resolveShot() {
  if (GAME.bird) {
    const b = GAME.bird;
    const onScreen = b.position.x > -20 && b.position.x < W + 20 && b.position.y < H + 20;
    if (onScreen) spawnDebris(b.position.x, b.position.y, '#d8322a', 8);
    removeBody(GAME.engine, b);
    GAME.bird = null;
  }
  GAME.birdsLeft = Math.max(0, GAME.birdsLeft - 1);
  GAME.flightFrames = 0;
  GAME.settleFrames = 0;
  GAME.phase = 'AIM';
  if (GAME.birdsLeft > 0 && GAME.pigsLeft > 0) {
    GAME.bird = spawnBirdAtSling(GAME.engine);
  }
  syncHud();
}

// 파괴 표시된 바디(와 화면 밖 200px을 넘어간 바디)를 역순으로 일괄 제거한다.
// 순서: removeBody → splice → 점수 가산 → spawnDebris. 끝에서 pigsLeft를 배열 길이로 재계산한다.
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
    if (!out) spawnDebris(p.position.x, p.position.y, '#7ccf4a', 10 + Math.floor(Math.random() * 7));
    playSfx('pig');
    changed = true;
  }

  GAME.pigsLeft = GAME.pigs.length;   // 감산 누적이 아니라 재계산
  if (changed) syncHud();              // 파괴 직후 HUD 즉시 갱신
}

// ───────────────────────── 조준·발사 ─────────────────────────

// 발사 순서: 정적 해제가 반드시 setVelocity 바로 앞이다.
// (정적 바디는 질량이 무한이라 속도 설정이 무시된다.) 위치는 정적인 동안 먼저 옮겨 두어 속도 흔적을 남기지 않는다.
function launchBird() {
  const q = pullPoint(GAME.dragPoint);
  const v = pullVelocity(GAME.dragPoint);
  Body.setPosition(GAME.bird, q);     // (1) 당긴 지점에서 출발
  Body.setStatic(GAME.bird, false);   // (2) 정적 해제 — setVelocity 직전
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

// 발사와 같은 적분(vy += G_STEP; 위치 += 속도)으로 미리보기 점을 만든다.
// 출발점은 launchBird가 새를 놓는 당긴 지점(pullPoint)이다 — 슬링 중심에서 시작하면 점선이 실제 경로와 최대 120px 어긋난다.
function trajectoryPoints(p) {
  const v = pullVelocity(p);
  const start = pullPoint(p);
  const pts = [];
  let x = start.x, y = start.y, vx = v.x, vy = v.y;
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
  if (GAME.state !== 'PLAYING' || GAME.phase !== 'AIM' || !GAME.bird || !GAME.bird.isStatic) return;
  if (GAME.pigsLeft === 0) return;                         // 클리어 대기 중에는 쏘지 않는다
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const p = canvasPoint(e);
  if (Math.hypot(p.x - SLING.x, p.y - SLING.y) > SLING.maxPull) return;   // 새총 근처에서만 잡힌다
  e.preventDefault();
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 캡처 미지원 — window 리스너로 충분 */ }
  GAME.dragging = true;
  GAME.dragPoint = p;
  Body.setPosition(GAME.bird, pullPoint(p));
}

function onPointerMove(e) {
  if (!GAME.dragging || GAME.state !== 'PLAYING' || !GAME.bird || !GAME.bird.isStatic) return;
  GAME.dragPoint = canvasPoint(e);
  Body.setPosition(GAME.bird, pullPoint(GAME.dragPoint));   // 새가 포인터를 따라오되 최대 120px
}

function onPointerUp(e) {
  if (!GAME.dragging) return;
  GAME.dragging = false;
  if (GAME.state !== 'PLAYING' || GAME.phase !== 'AIM' || !GAME.bird || !GAME.bird.isStatic) return;
  const q = pullPoint(GAME.dragPoint);
  if (Math.hypot(q.x - SLING.x, q.y - SLING.y) < 12) {     // 거의 안 당겼으면 발사 취소
    Body.setPosition(GAME.bird, { x: SLING.x, y: SLING.y });
    GAME.dragPoint = { x: SLING.x, y: SLING.y };
    return;
  }
  launchBird();
}

// ───────────────────────── UI ─────────────────────────

function syncHud() {
  const stage = STAGES[GAME.stageIndex];
  const items = [
    ['hud-stage', 'STAGE ' + (GAME.stageIndex + 1) + (stage ? ' · ' + stage.name : '')],
    ['hud-score', 'SCORE ' + GAME.score.toLocaleString('en-US')],
    ['hud-birds', 'BIRDS ' + GAME.birdsLeft + ' · PIGS ' + GAME.pigsLeft]
  ];
  for (let i = 0; i < items.length; i++) {
    const el = document.getElementById(items[i][0]);
    if (el && el.textContent !== items[i][1]) el.textContent = items[i][1];
  }
}

function showOverlay(id) {
  hideOverlays();
  document.getElementById(id).classList.remove('hidden');
}

function hideOverlays() {
  const ids = ['overlay-menu', 'overlay-pause', 'overlay-clear', 'overlay-fail'];
  for (let i = 0; i < ids.length; i++) document.getElementById(ids[i]).classList.add('hidden');
}

// 10칸 버튼: 번호 + 획득한 별(0~3). 해금 안 된 칸은 disabled.
function buildStageGrid() {
  const grid = document.getElementById('stage-grid');
  grid.innerHTML = '';
  for (let i = 0; i < STAGES.length; i++) {
    const stage = STAGES[i];
    const rec = GAME.progress.best[String(stage.id)];
    const stars = rec ? Math.max(0, Math.min(3, Number(rec.stars) || 0)) : 0;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = stage.name;
    btn.disabled = i + 1 > GAME.progress.unlocked;

    const num = document.createElement('div');
    num.textContent = String(stage.id);
    num.style.fontSize = '20px';
    num.style.fontWeight = 'bold';

    const starLine = document.createElement('div');
    starLine.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    starLine.style.fontSize = '14px';
    starLine.style.color = stars > 0 ? '#e0a100' : '#888888';

    btn.appendChild(num);
    btn.appendChild(starLine);
    btn.addEventListener('click', function () {
      if (!btn.disabled) startStage(i);
    });
    grid.appendChild(btn);
  }
}

function starsFor(stage, score) {
  if (score >= stage.star3) return 3;
  if (score >= stage.star2) return 2;
  return 1;
}

// ───────────────────────── 저장소 ─────────────────────────

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

// ───────────────────────── 피드백 ─────────────────────────

// kind: 'launch' | 'hit' | 'pig' | 'clear' | 'fail' — 각각 다른 높이의 짧은 소리.
function playSfx(kind) {
  try {
    if (!AUDIO.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      AUDIO.ctx = new AC();
    }
    const ac = AUDIO.ctx;
    if (ac.state === 'suspended') ac.resume();
    const now = ac.currentTime;

    if (kind === 'hit') {                       // 한 프레임에 충돌이 몰려도 소리는 한 번
      if (now - AUDIO.lastHit < 0.05) return;
      AUDIO.lastHit = now;
    }

    // [시작 Hz, 끝 Hz, 시작 오프셋(s), 길이(s), 파형, 음량]
    const specs = {
      launch: [[330, 700, 0, 0.18, 'triangle', 0.22]],
      hit:    [[170, 90, 0, 0.09, 'square', 0.08]],
      pig:    [[880, 440, 0, 0.22, 'sawtooth', 0.12]],
      clear:  [[523, 523, 0, 0.13, 'triangle', 0.2], [659, 659, 0.13, 0.13, 'triangle', 0.2],
               [784, 784, 0.26, 0.13, 'triangle', 0.2], [1047, 1047, 0.39, 0.32, 'triangle', 0.22]],
      fail:   [[392, 330, 0, 0.24, 'sine', 0.25], [330, 262, 0.24, 0.24, 'sine', 0.25],
               [262, 196, 0.48, 0.45, 'sine', 0.25]]
    };
    const tones = specs[kind];
    if (!tones) return;

    for (let i = 0; i < tones.length; i++) {
      const t = tones[i];
      const start = now + t[2], end = start + t[3];
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = t[4];
      osc.frequency.setValueAtTime(t[0], start);
      osc.frequency.exponentialRampToValueAtTime(t[1], end);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(t[5], start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  } catch (e) {}
}

function spawnDebris(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.5 + Math.random() * 4.5;
    const life = 40 + Math.floor(Math.random() * 30);
    GAME.particles.push({
      x: x, y: y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 2,
      size: 4 + Math.random() * 6,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.4,
      life: life,
      maxLife: life,
      color: color
    });
  }
  if (GAME.particles.length > 600) GAME.particles.splice(0, GAME.particles.length - 600);
}

// 파편 갱신·수거. 수명이 다하면 역순으로 제거한다(멈춘 파편이 화면을 덮지 않게).
function updateParticles() {
  for (let i = GAME.particles.length - 1; i >= 0; i--) {
    const p = GAME.particles[i];
    p.vy += G_STEP;
    p.vx *= 0.99;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    if (p.y > GROUND_Y - p.size * 0.3) {
      p.y = GROUND_Y - p.size * 0.3;
      p.vy *= -0.3;
      p.vx *= 0.7;
      p.vr *= 0.7;
    }
    p.life--;
    if (p.life <= 0) GAME.particles.splice(i, 1);
  }
}

window.addEventListener('load', init);

// DONE-CHECK
// hop 1: game.js:init
// hop 2: game.js:startStage
// hop 3: game.js:loop
// hop 4: game.js:launchBird
// hop 5: game.js:checkOutcome
// V 1: buildStage
// V 2: buildStageGrid
// V 3: startStage
// V 4: saveProgress
// V 5: onPointerMove
// V 6: trajectoryPoints
// V 7: launchBird
// V 8: resolveShot
// V 9: loop
// V 10: damageBody
// V 11: sweepDestroyed
// V 12: sweepDestroyed
// V 13: checkOutcome
// V 14: worldSettled
// V 15: pauseGame
// V 16: loop
// V 17: restartStage
// V 18: goMenu
// V 19: sweepDestroyed
// V 20: starsFor
// V 21: finishStage
// V 22: drawFrame
// V 23: spawnDebris
// V 24: playSfx
// V 25: drawLoadError
