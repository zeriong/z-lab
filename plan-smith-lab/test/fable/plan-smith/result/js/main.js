// 앱 부트스트랩 — 상태 머신 + 루프 골격 (플랜 1단계).
// 핵심 계약(A3): rAF 루프가 물리 틱 호출을 소유한다. 상태가 'playing'일 때만
// 고정 타임스텝 누산기로 session.step()을 호출하고, 그 외 상태에서는
// 엔진 업데이트가 정확히 0회다(개발 패널의 stepsWhilePaused로 실측 가능).

import { CONFIG } from './core/config.js';
import { createSession } from './core/session.js';
import { createAutopilot, runSolution } from './core/driver.js';
import { createRenderer } from './render.js';
import { createUI, loadProgress, saveProgress } from './ui.js';

const Matter = window.Matter;
const C = CONFIG;

const canvas = document.getElementById('game-canvas');
const renderer = createRenderer(canvas);

// ── 앱 상태 ──────────────────────────────────────────
// 상태 머신: main → playing ⇄ paused, playing → clear | fail
const app = {
  state: 'main', // 'main' | 'playing' | 'paused' | 'clear' | 'fail'
  stages: [],
  stageIndex: 0,
  session: null,
  pilot: null,        // 개발 모드 솔루션 리플레이 오토파일럿
  cleared: loadProgress(),
  finishCountdown: -1, // 판정 후 오버레이 표시까지의 프레임 지연(연출)
  stepsWhilePaused: 0, // 항상 0이어야 한다 — A3 실측 카운터
  speed: 1,            // 개발 모드 배속(고정 dt 유지 — 틱을 여러 번 돌릴 뿐)
};

// ── 상태 전이 (UI 버튼은 전부 여기로만 들어온다) ─────────────
function setState(next) {
  app.state = next;
  ui.sync(app);
}

function disposeSession() {
  if (app.session) { app.session.dispose(); app.session = null; }
  app.pilot = null;
}

function startStage(index) {
  disposeSession();
  app.stageIndex = index;
  app.session = createSession(Matter, app.stages[index]);
  app.finishCountdown = -1;
  renderer.reset();
  setState('playing');
}

const actions = {
  startStage,
  pause() {
    if (app.state !== 'playing') return;
    app.session.cancelAim();
    setState('paused');
  },
  resume() {
    if (app.state !== 'paused') return;
    setState('playing');
  },
  restart() {
    if (!['paused', 'clear', 'fail'].includes(app.state)) return;
    startStage(app.stageIndex);
  },
  toMain() {
    disposeSession();
    ui.buildStageGrid(app.stages, app.cleared);
    setState('main');
  },
  next() {
    if (app.state !== 'clear') return;
    if (app.stageIndex + 1 < app.stages.length) startStage(app.stageIndex + 1);
    else actions.toMain();
  },
};

const ui = createUI(actions);

function finishStage() {
  const outcome = app.session.outcome;
  if (outcome === 'clear') {
    app.cleared.add(app.stages[app.stageIndex].id);
    saveProgress(app.cleared);
  }
  setState(outcome === 'clear' ? 'clear' : 'fail');
}

// ── 고정 타임스텝 루프 — 물리 틱의 유일한 소유자 ─────────────
let acc = 0;
let last = performance.now();

function stepOnce() {
  if (app.state === 'paused') { app.stepsWhilePaused++; return; } // 도달 불가 방어선
  if (app.pilot && !app.pilot.done) app.pilot.tick();
  app.session.step();
}

function frame(now) {
  requestAnimationFrame(frame);
  const elapsed = Math.min(now - last, 100); // 탭 복귀 폭주 방지
  last = now;

  if (app.state === 'playing' && app.session) {
    if (!app.session.finished) {
      acc += elapsed;
      let guard = 0;
      while (acc >= C.DT_MS) {
        for (let k = 0; k < app.speed && !app.session.finished; k++) stepOnce();
        acc -= C.DT_MS;
        if (++guard >= 5) { acc = 0; break; } // 스파이럴 가드
      }
    } else {
      // 판정 완료 → 짧은 연출 지연 후 오버레이
      if (app.finishCountdown < 0) app.finishCountdown = 40;
      else if (--app.finishCountdown === 0) finishStage();
    }
    ui.updateHUD(app);
  } else {
    acc = 0; // 일시정지/메뉴 중 시간 적립 금지 — 재개 시 점프 방지
  }

  renderer.draw(app.session, { advanceFx: app.state === 'playing' });
  if (dev.enabled) dev.updateCounters();
}

// ── 입력 (포인터 → 월드 좌표 → 세션 조준 API) ────────────────
let aiming = false;

function toWorld(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * canvas.width / r.width,
    y: (e.clientY - r.top) * canvas.height / r.height,
  };
}

canvas.addEventListener('pointerdown', (e) => {
  if (app.state !== 'playing' || !app.session?.canLaunch) return;
  const p = toWorld(e);
  if (Math.hypot(p.x - C.SLING.x, p.y - C.SLING.y) > 150) return; // 새총 근처만 잡기
  aiming = true;
  try { canvas.setPointerCapture(e.pointerId); } catch { /* 합성 이벤트 등 캡처 불가 시 무시 */ }
  app.session.setAim(p.x, p.y);
});

canvas.addEventListener('pointermove', (e) => {
  if (!aiming || app.state !== 'playing') return;
  const p = toWorld(e);
  app.session.setAim(p.x, p.y);
});

canvas.addEventListener('pointerup', () => {
  if (!aiming) return;
  aiming = false;
  if (app.state === 'playing') app.session.release();
});

canvas.addEventListener('pointercancel', () => {
  if (!aiming) return;
  aiming = false;
  app.session?.cancelAim();
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === 'p') {
    if (app.state === 'playing') actions.pause();
    else if (app.state === 'paused') actions.resume();
  }
});

// ── 개발 모드 (?dev=1) — 검증 하네스의 브라우저 노출 ──────────
const dev = {
  enabled: new URLSearchParams(location.search).get('dev') === '1',
  log(msg) {
    const pre = document.getElementById('dev-log');
    pre.textContent += msg + '\n';
    pre.scrollTop = pre.scrollHeight;
    console.log('[dev]', msg);
  },
  updateCounters() {
    const s = app.session;
    document.getElementById('dev-counters').textContent =
      `state=${app.state} tick=${s ? s.tick : '-'} bodies=${s ? s.bodyCount() : '-'} ` +
      `listeners=${s ? s.listenerCount() : '-'} pigs=${s ? s.pigsLeft : '-'} birds=${s ? s.birdsLeft : '-'} ` +
      `verdict=${s ? (s.outcome ?? '') + '/' + (s.verdictPath ?? '') : '-'} pausedSteps=${app.stepsWhilePaused}`;
  },
};

// 10/10 헤드리스 검증 — Node 하네스와 동일한 드라이버를 브라우저에서 실행
function verifyAll() {
  const results = app.stages.map((stage) => {
    const r = runSolution(Matter, stage, stage.solution);
    return { id: stage.id, name: stage.name, cleared: r.cleared, path: r.verdictPath, shots: r.shotsFired, ticks: r.ticks };
  });
  const pass = results.filter(r => r.cleared).length;
  if (dev.enabled) {
    for (const r of results) dev.log(`${r.cleared ? '✓' : '✗'} stage${r.id} "${r.name}" path=${r.path} shots=${r.shots} ticks=${r.ticks}`);
    dev.log(`=== ${pass}/${results.length} 클리어 ===`);
  }
  return results;
}

function determinism(times = 20) {
  const stage = app.stages[app.stageIndex];
  const hashes = new Set();
  for (let i = 0; i < times; i++) hashes.add(runSolution(Matter, stage, stage.solution).hash);
  const ok = hashes.size === 1;
  if (dev.enabled) dev.log(`결정성 ${times}회: ${ok ? '동일(1종)' : `비재현(${hashes.size}종)`}`);
  return ok;
}

function replayCurrent() {
  startStage(app.stageIndex); // 항상 깨끗한 월드에서 시작
  app.pilot = createAutopilot(app.session, app.stages[app.stageIndex].solution);
  if (dev.enabled) dev.log(`stage${app.stages[app.stageIndex].id} 솔루션 리플레이 시작`);
}

window.__dev = {
  verifyAll, determinism, replayCurrent, app, actions,
  setSpeed(n) { app.speed = Math.max(1, Math.min(16, n | 0)); return app.speed; },
};

// ── 부트 ────────────────────────────────────────────
async function boot() {
  const files = Array.from({ length: 10 }, (_, i) => `stages/stage${String(i + 1).padStart(2, '0')}.json`);
  app.stages = await Promise.all(files.map(f => fetch(f).then(r => {
    if (!r.ok) throw new Error(`스테이지 로드 실패: ${f}`);
    return r.json();
  })));

  ui.buildStageGrid(app.stages, app.cleared);
  ui.sync(app);

  if (dev.enabled) {
    document.getElementById('dev-panel').classList.remove('hidden');
    document.getElementById('dev-replay').addEventListener('click', replayCurrent);
    document.getElementById('dev-verify').addEventListener('click', verifyAll);
    document.getElementById('dev-determinism').addEventListener('click', () => determinism(20));
  }

  requestAnimationFrame((t) => { last = t; requestAnimationFrame(frame); });
}

boot();
