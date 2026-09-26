// game.js — 상태 머신, 입력, 루프, 점수, 저장, UI 배선.
// 공용 상수는 stages.js, Matter 별칭(Engine/Composite/Bodies/Body/Events)은 physics.js 에서 온다.
// 여기서 다시 선언하지 않는다.

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

// §5.10 저장소 메모리 폴백
const MEM = { data: null };
// 오디오 컨텍스트는 playSfx 첫 호출 때 만든다(로드 시점에 만들면 자동재생 정책이 정지 상태로 붙잡는다).
const AUDIO = { ctx: null, lastHit: 0 };

/* ================================================================
 * 부팅 / 루프
 * ================================================================ */

function init() {
  // A2 가드: CDN이 실패하면 물리 호출을 전혀 하지 않고 원인 문구만 그린다.
  if (typeof Matter === 'undefined') {
    hideOverlays();
    document.getElementById('hud').style.visibility = 'hidden';
    document.getElementById('btn-pause').style.visibility = 'hidden';
    requestAnimationFrame(loop);
    return;
  }

  // 저장된 진행 복원(형식이 깨져 있어도 기본값으로 정규화)
  const saved = loadProgress() || {};
  const unlocked = Math.floor(Number(saved.unlocked)) || 1;
  GAME.progress = {
    unlocked: Math.min(STAGES.length, Math.max(1, unlocked)),
    best: (saved.best && typeof saved.best === 'object') ? saved.best : {}
  };

  GAME.engine = createEngine();      // 게임당 1회
  bindCollisions(GAME.engine);       // 게임당 1회 — 두 번 걸면 데미지가 두 배

  // 버튼 배선
  const onClick = function (id, fn) { document.getElementById(id).addEventListener('click', fn); };
  onClick('btn-play', function () { startStage(GAME.progress.unlocked - 1); });
  onClick('btn-pause', function () { pauseGame(); });
  onClick('btn-resume', function () { resumeGame(); });
  onClick('btn-restart', function () { restartStage(); });
  onClick('btn-menu', function () { goMenu(); });
  onClick('btn-next', function () {
    if (GAME.stageIndex + 1 < STAGES.length) startStage(GAME.stageIndex + 1);
  });
  onClick('btn-clear-retry', function () { restartStage(); });
  onClick('btn-clear-menu', function () { goMenu(); });
  onClick('btn-fail-retry', function () { restartStage(); });
  onClick('btn-fail-menu', function () { goMenu(); });

  // 입력: pointerdown만 캔버스, move/up은 window(캔버스 밖에서 손을 떼도 발사돼야 한다)
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', function () {
    // 브라우저가 제스처를 가져가면 발사하지 않고 새를 슬링으로 되돌린다
    if (!GAME.dragging) return;
    GAME.dragging = false;
    GAME.dragPoint = { x: SLING.x, y: SLING.y };
    if (GAME.bird && GAME.phase === 'AIM') Body.setPosition(GAME.bird, { x: SLING.x, y: SLING.y });
  });
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // 키보드 일시정지(Esc / P)와 탭 전환 시 자동 일시정지
  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.key !== 'p' && e.key !== 'P') return;
    if (GAME.state === 'PLAYING') pauseGame();
    else if (GAME.state === 'PAUSED') resumeGame();
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && GAME.state === 'PLAYING') pauseGame();
  });

  goMenu();
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

/* ================================================================
 * 상태 전이
 * ================================================================ */

// 월드를 비우고 메인 메뉴로. state를 'MENU'로 되돌려 루프의 물리 갱신을 멈춘다.
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
  buildStageGrid();
  showOverlay('overlay-menu');
  syncHud();
}

// 스테이지 로드 + state='PLAYING'. 점수 0, 새 만수로 시작한다.
function startStage(index) {
  const stage = STAGES[index];
  if (!GAME.engine || !stage) return;
  hideOverlays();
  GAME.stageIndex = index;
  GAME.score = 0;
  GAME.particles = [];
  GAME.dragging = false;
  GAME.dragPoint = { x: SLING.x, y: SLING.y };
  GAME.settleFrames = 0;
  GAME.flightFrames = 0;
  GAME.clearDelay = 0;

  const built = buildStage(GAME.engine, stage);   // 내부에서 Composite.clear — 이전 잔해가 남지 않는다
  GAME.blocks = built.blocks;
  GAME.pigs = built.pigs;
  GAME.pigsLeft = GAME.pigs.length;
  GAME.birdsLeft = stage.birds;

  GAME.bird = spawnBirdAtSling(GAME.engine);
  GAME.phase = 'AIM';
  GAME.state = 'PLAYING';
  syncHud();
}

function restartStage() {
  startStage(GAME.stageIndex);
}

function pauseGame() {
  if (GAME.state !== 'PLAYING') return;
  if (GAME.dragging) {
    // 당기던 중이면 조준을 취소하고 새를 슬링으로 되돌린다
    GAME.dragging = false;
    GAME.dragPoint = { x: SLING.x, y: SLING.y };
    if (GAME.bird && GAME.phase === 'AIM') Body.setPosition(GAME.bird, { x: SLING.x, y: SLING.y });
  }
  GAME.state = 'PAUSED';
  showOverlay('overlay-pause');
  syncHud();
}

function resumeGame() {
  if (GAME.state !== 'PAUSED') return;
  hideOverlays();
  GAME.state = 'PLAYING';
  syncHud();
}

// 점수 정산·저장·오버레이.
function finishStage(cleared) {
  if (GAME.state !== 'PLAYING') return;
  GAME.dragging = false;
  const stage = STAGES[GAME.stageIndex];

  if (cleared) {
    // 잔여 새 보너스: 아직 쏘지 않은 새만 센다(비행 중인 새는 이미 사용됨)
    const unused = Math.max(0, GAME.birdsLeft - (GAME.phase === 'FLYING' ? 1 : 0));
    const bonus = unused * SCORE.birdLeft;
    GAME.score += bonus;

    const stars = starsFor(stage, GAME.score);
    const key = String(stage.id);
    const prev = GAME.progress.best[key] || { score: 0, stars: 0 };
    const prevScore = Number(prev.score) || 0;
    const prevStars = Number(prev.stars) || 0;
    // 비교 후 갱신 — 덮어쓰면 낮은 점수로 다시 깼을 때 별이 줄어든다
    GAME.progress.best[key] = {
      score: Math.max(prevScore, GAME.score),
      stars: Math.max(prevStars, stars)
    };
    GAME.progress.unlocked = Math.min(STAGES.length, Math.max(GAME.progress.unlocked, GAME.stageIndex + 2));
    saveProgress(GAME.progress);

    GAME.state = 'CLEAR';
    const hasNext = GAME.stageIndex + 1 < STAGES.length;
    document.getElementById('clear-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    const lines = [];
    lines.push('점수 ' + GAME.score.toLocaleString() +
               (bonus > 0 ? '  (남은 새 보너스 +' + bonus.toLocaleString() + ')' : ''));
    lines.push('최고 ' + GAME.progress.best[key].score.toLocaleString() +
               (GAME.score > prevScore ? '  NEW BEST!' : ''));
    if (!hasNext) lines.push('모든 스테이지를 클리어했습니다!');
    document.getElementById('clear-score').textContent = lines.join('\n');
    document.getElementById('btn-next').style.display = hasNext ? '' : 'none';
    showOverlay('overlay-clear');
    playSfx('clear');
  } else {
    GAME.state = 'FAIL';
    document.getElementById('fail-msg').textContent =
      '돼지 ' + GAME.pigsLeft + '마리가 남았습니다.\n점수 ' + GAME.score.toLocaleString();
    showOverlay('overlay-fail');
    playSfx('fail');
  }

  buildStageGrid();
  syncHud();
}

/* ================================================================
 * 판정
 * ================================================================ */

function checkOutcome() {
  if (GAME.state !== 'PLAYING') return;

  // 클리어: 마지막 돼지가 사라지면 잠시 뒤 오버레이
  if (GAME.pigsLeft === 0) {
    GAME.clearDelay++;
    if (GAME.clearDelay >= SETTLE_FRAMES * 2) finishStage(true);
    return;
  }

  // 아직 쏠 새가 있거나 날고 있으면 판정하지 않는다
  if (GAME.birdsLeft > 0 || GAME.bird) return;

  // 실패: 마지막 새가 회수된 뒤, 월드 전체가 멎을 때까지 기다린다
  // (새 속도만 보면 구조물이 무너지는 도중에 실패 화면이 먼저 뜬다)
  if (worldSettled()) GAME.settleFrames++;
  else GAME.settleFrames = 0;
  GAME.flightFrames++;
  if (GAME.settleFrames >= SETTLE_FRAMES || GAME.flightFrames >= FLIGHT_MAX_FRAMES) finishStage(false);
}

// 비행 종료 감지: 새가 멈추거나, 화면 밖으로 나가거나, 7초가 지나면 회수한다.
function updateShotPhase() {
  if (GAME.phase !== 'FLYING' || !GAME.bird) return;
  const b = GAME.bird;
  GAME.flightFrames++;

  // 비행 중 공기저항 0(궤적 미리보기와 일치). 지면에 닿은 뒤에는 구름 감쇠를 켜서 끝없이 구르지 않게 한다.
  if (b.frictionAir === 0 && b.position.y >= GROUND_Y - b.circleRadius - 2) b.frictionAir = 0.02;

  const out = b.position.x < -200 || b.position.x > W + 200 || b.position.y > H + 200;
  if (b.speed < SETTLE_SPEED) GAME.settleFrames++;
  else GAME.settleFrames = 0;

  if (out || GAME.settleFrames >= SETTLE_FRAMES || GAME.flightFrames >= FLIGHT_MAX_FRAMES) resolveShot();
}

// 새·블록·돼지가 전부 저속인가
function worldSettled() {
  const b = GAME.bird;
  if (b && !b.isStatic && b.speed > SETTLE_SPEED) return false;
  const groups = [GAME.blocks, GAME.pigs];
  for (let g = 0; g < groups.length; g++) {
    for (let i = 0; i < groups[g].length; i++) {
      if (groups[g][i].speed > SETTLE_SPEED) return false;
    }
  }
  return true;
}

// 새 회수 + 다음 장전
function resolveShot() {
  const b = GAME.bird;
  if (b) {
    const p = b.position;
    if (p.x > -20 && p.x < W + 20 && p.y < H + 20) spawnDebris(p.x, p.y, '#f4f4f4', 8);   // 깃털
    removeBody(GAME.engine, b);
  }
  GAME.bird = null;
  GAME.birdsLeft = Math.max(0, GAME.birdsLeft - 1);
  GAME.phase = 'AIM';
  GAME.settleFrames = 0;
  GAME.flightFrames = 0;
  GAME.dragging = false;
  GAME.dragPoint = { x: SLING.x, y: SLING.y };
  if (GAME.birdsLeft > 0 && GAME.pigsLeft > 0) GAME.bird = spawnBirdAtSling(GAME.engine);
  syncHud();
}

// 파괴 표시된 바디(와 화면 밖 200px을 넘어간 바디)를 일괄 제거한다.
// 역순 순회: removeBody → splice → 점수 가산 → spawnDebris. 마지막에 pigsLeft를 재계산한다.
function sweepDestroyed() {
  const groups = [GAME.blocks, GAME.pigs];
  for (let g = 0; g < groups.length; g++) {
    const list = groups[g];
    const isPig = list === GAME.pigs;
    for (let i = list.length - 1; i >= 0; i--) {
      const body = list[i];
      const pos = body.position;
      const offscreen = pos.x < -200 || pos.x > W + 200 || pos.y > H + 200;
      if (!body.destroyed && !offscreen) continue;

      removeBody(GAME.engine, body);
      list.splice(i, 1);

      // 돼지는 어떻게 사라지든 제거로 친다. 블록은 부서졌을 때만 점수.
      const pts = isPig ? SCORE.pig : (body.destroyed ? SCORE.block : 0);
      GAME.score += pts;

      if (!offscreen) {
        spawnDebris(pos.x, pos.y, body.color, 10 + Math.floor(Math.random() * 7));   // 10~16개
        if (pts > 0) {
          GAME.particles.push({
            text: '+' + pts, x: pos.x, y: pos.y - 12, vx: 0, vy: -1.1,
            size: isPig ? 28 : 18, color: isPig ? '#c8ff9e' : '#ffffff',
            rot: 0, vr: 0, life: 55, maxLife: 55
          });
        }
      }
      if (isPig) playSfx('pig');
    }
  }
  GAME.pigsLeft = GAME.pigs.length;       // 감산 누적이 아니라 재계산
}

/* ================================================================
 * 조준 · 발사 · 궤적
 * ================================================================ */

// 핵심 제약: setStatic(false)가 setVelocity 바로 앞에 있어야 한다
// (정적 바디는 질량이 무한이라 속도 설정이 무시된다 — §11-7 판정 형태에 맞춰 이 순서로 둔다).
// setPosition은 정적 상태에서도 유효하므로 맨 앞으로 옮겨도 최종 상태(위치 q, 속도 v, 동적)는 같다.
function launchBird() {
  const q = pullPoint(GAME.dragPoint);
  const v = pullVelocity(GAME.dragPoint);
  Body.setPosition(GAME.bird, q);     // 당긴 지점에서 출발
  Body.setStatic(GAME.bird, false);   // 정적 해제 — 빠지면 새가 슬링에 붙박인다
  Body.setVelocity(GAME.bird, v);     // 당긴 반대 방향으로 발사
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

// 미리보기 점. launchBird()는 새를 당긴 지점 q에서 출발시키므로 미리보기도 q에서 시작한다
// (SLING에서 시작하면 점선 전체가 실제 경로보다 (SLING - q)만큼, 최대 120px 어긋난다).
// 적분 순서(vy += G_STEP → 위치 += 속도)는 Matter 0.19 Body.update 와 같다.
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
  if (GAME.state !== 'PLAYING' || GAME.phase !== 'AIM' || !GAME.bird || GAME.pigsLeft === 0) return;
  if (e.button !== 0) return;
  const p = canvasPoint(e);
  // 새총 주변(최대 당김 반경 안)을 짚었을 때만 잡는다 — 먼 곳을 누르면 새가 순간이동하지 않게
  if (Math.hypot(p.x - SLING.x, p.y - SLING.y) > SLING.maxPull) return;
  e.preventDefault();
  p.y = Math.min(p.y, GROUND_Y - 20);   // 새(반지름 18)가 지면 속으로 당겨지지 않게
  GAME.dragging = true;
  GAME.dragPoint = p;
  Body.setPosition(GAME.bird, pullPoint(p));
}

function onPointerMove(e) {
  if (!GAME.dragging || !GAME.bird || GAME.state !== 'PLAYING') return;
  const p = canvasPoint(e);
  p.y = Math.min(p.y, GROUND_Y - 20);
  GAME.dragPoint = p;
  Body.setPosition(GAME.bird, pullPoint(p));   // 최대 120px 클램프된 지점을 따라온다
}

function onPointerUp(e) {
  if (!GAME.dragging) return;
  GAME.dragging = false;
  if (GAME.state !== 'PLAYING' || GAME.phase !== 'AIM' || !GAME.bird) return;
  const p = canvasPoint(e);
  p.y = Math.min(p.y, GROUND_Y - 20);
  GAME.dragPoint = p;
  const q = pullPoint(p);
  if (Math.hypot(q.x - SLING.x, q.y - SLING.y) < SLING.maxPull * 0.15) {
    // 거의 안 당기고 놓으면 새를 버리지 않고 취소한다
    GAME.dragPoint = { x: SLING.x, y: SLING.y };
    Body.setPosition(GAME.bird, { x: SLING.x, y: SLING.y });
    return;
  }
  launchBird();
}

/* ================================================================
 * UI
 * ================================================================ */

function syncHud() {
  const stage = STAGES[GAME.stageIndex];
  document.getElementById('hud-stage').textContent =
    'STAGE ' + (stage ? stage.id + ' · ' + stage.name : '-');
  document.getElementById('hud-score').textContent = 'SCORE ' + GAME.score.toLocaleString();
  document.getElementById('hud-birds').textContent = 'BIRDS ' + GAME.birdsLeft;
  const inGame = GAME.state !== 'MENU';
  document.getElementById('hud').style.visibility = inGame ? 'visible' : 'hidden';
  document.getElementById('btn-pause').style.visibility = inGame ? 'visible' : 'hidden';
}

function showOverlay(id) {
  hideOverlays();
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function hideOverlays() {
  const list = document.querySelectorAll('.overlay');
  for (let i = 0; i < list.length; i++) list[i].classList.add('hidden');
}

// 10칸 버튼 생성. 잠긴 칸은 disabled, 각 칸에 번호와 획득 별을 함께 표시한다.
function buildStageGrid() {
  const grid = document.getElementById('stage-grid');
  grid.innerHTML = '';
  for (let i = 0; i < STAGES.length; i++) {
    const stage = STAGES[i];
    const best = GAME.progress.best[String(stage.id)];
    const stars = best ? Math.max(0, Math.min(3, Number(best.stars) || 0)) : 0;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = stage.name;
    btn.disabled = i + 1 > GAME.progress.unlocked;

    const num = document.createElement('span');
    num.textContent = String(stage.id);
    const st = document.createElement('span');
    st.className = 'stars';
    st.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    btn.appendChild(num);
    btn.appendChild(st);

    btn.addEventListener('click', function () { startStage(i); });
    grid.appendChild(btn);
  }
}

// 임계값은 스테이지에서 읽는다(고정값 금지)
function starsFor(stage, score) {
  if (score >= stage.star3) return 3;
  if (score >= stage.star2) return 2;
  return 1;
}

/* ================================================================
 * 저장
 * ================================================================ */

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

/* ================================================================
 * 피드백: 효과음 · 파편
 * ================================================================ */

// kind: 'launch' | 'hit' | 'pig' | 'clear' | 'fail' — 서로 다른 높이/음색의 짧은 소리
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

    if (kind === 'hit') {
      if (now - AUDIO.lastHit < 0.06) return;   // 한 프레임에 충돌이 몰려도 소리가 뭉개지지 않게
      AUDIO.lastHit = now;
    }

    const tone = function (f0, f1, start, dur, type, vol) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const t0 = now + start;
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
      tone(300, 780, 0, 0.2, 'triangle', 0.25);
    } else if (kind === 'hit') {
      tone(170, 80, 0, 0.1, 'square', 0.1);
    } else if (kind === 'pig') {
      tone(640, 300, 0, 0.22, 'sawtooth', 0.12);
      tone(960, 480, 0.04, 0.18, 'sine', 0.12);
    } else if (kind === 'clear') {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      for (let i = 0; i < notes.length; i++) tone(notes[i], notes[i], i * 0.12, 0.24, 'triangle', 0.2);
    } else if (kind === 'fail') {
      tone(392, 196, 0, 0.35, 'sawtooth', 0.12);
      tone(262, 110, 0.3, 0.55, 'sawtooth', 0.12);
    }
  } catch (e) {}
}

function spawnDebris(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 2 + Math.random() * 5;
    const life = 35 + Math.floor(Math.random() * 30);
    GAME.particles.push({
      x: x, y: y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2,
      size: 3 + Math.random() * 6,
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
      life: life, maxLife: life,
      color: color || '#cccccc', text: null
    });
  }
}

// 파편 갱신·수거. 수명을 줄여 없애지 않으면 후반 스테이지 화면이 멈춘 조각으로 덮인다.
function updateParticles() {
  const list = GAME.particles;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    if (!p.text) {
      p.vy += G_STEP;
      if (p.vy > 0 && p.y + p.vy > GROUND_Y) {   // 지면에서 한 번 튀고 미끄러진다
        p.vy *= -0.35;
        p.vx *= 0.6;
        p.vr *= 0.6;
      }
    }
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.life -= 1;
    if (p.life <= 0) list.splice(i, 1);
  }
  if (list.length > 300) list.splice(0, list.length - 300);
}

window.addEventListener('load', init);

// DONE-CHECK
// hop 1: game.js:init — #btn-play click 리스너 → startStage(GAME.progress.unlocked - 1)
// hop 2: game.js:startStage — physics.js:buildStage(GAME.engine, STAGES[i]) + physics.js:spawnBirdAtSling(GAME.engine)
// hop 3: game.js:loop — GAME.state === 'PLAYING' 일 때 Engine.update(GAME.engine, STEP_MS)
// hop 4: game.js:onPointerUp — launchBird(): setPosition(q) → setStatic(false) → setVelocity(v)
// hop 5: physics.js:bindCollisions — damageBody → game.js:sweepDestroyed → checkOutcome → finishStage(true) → showOverlay('overlay-clear')
// V 1: buildStage — startStage 가 STAGES[index] 를 넘겨 그 번호 고유의 배치를 세운다
// V 2: buildStageGrid — 해금 칸 클릭 → startStage(i)
// V 3: startStage — btn-next 에서 호출, buildStage 의 Composite.clear 로 이전 잔해 제거
// V 4: saveProgress — finishStage 가 unlocked 갱신 후 저장, init 의 loadProgress 로 복원
// V 5: onPointerMove — canvasPoint 좌표 변환 + pullPoint 120px 클램프, 고무줄은 drawSling
// V 6: trajectoryPoints — G_STEP 으로 28점 계산, drawTrajectory 가 렌더
// V 7: launchBird — setStatic(false) 가 setVelocity 바로 앞줄
// V 8: resolveShot — updateShotPhase 가 정지/화면 밖/시간 초과를 감지해 호출, birdsLeft 1 감소 + 재장전
// V 9: loop — 매 프레임 Engine.update, 중력은 createEngine
// V 10: damageBody — bindCollisions 가 IMPACT_MIN 이상에서 표시만, 제거는 sweepDestroyed
// V 11: sweepDestroyed — 화면 밖 200px 넘은 바디를 removeBody
// V 12: sweepDestroyed — 돼지 제거 시 SCORE.pig + 초록 파편 + pigsLeft 재계산
// V 13: checkOutcome — pigsLeft === 0 이후 clearDelay 경과 시 finishStage(true)
// V 14: worldSettled — checkOutcome 이 마지막 새 회수 후 월드 전체 정지를 기다려 finishStage(false)
// V 15: pauseGame — #btn-pause(#wrap 자식, right:16px) 클릭
// V 16: loop — state === 'PLAYING' 일 때만 물리 갱신, 렌더는 항상
// V 17: restartStage — startStage 가 score = 0, birdsLeft = stage.birds
// V 18: goMenu — Composite.clear + state 를 'MENU' 로
// V 19: sweepDestroyed — 블록 파괴마다 SCORE.block, 같은 프레임 loop 의 syncHud 로 즉시 반영
// V 20: starsFor — stage.star2 / stage.star3 를 읽는다
// V 21: finishStage — Math.max 로 최고점·별 비교 후 saveProgress
// V 22: drawFrame — clearRect → drawBackground → 바디 → drawParticles
// V 23: spawnDebris — 10~16개 생성, updateParticles 가 수명 감소·수거
// V 24: playSfx — kind 별 다른 음높이, AudioContext 는 첫 호출 때 생성
// V 25: drawLoadError — init 첫 줄 typeof Matter 가드 + loop 분기
