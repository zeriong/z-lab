/* game.js — presentation layer: FSM, Canvas 2D rendering, pointer slingshot,
 * DOM overlays. All physics/simulation lives in core.js (window.SlingCore),
 * so what you play is exactly what the head-less verifier tests.
 */
(function () {
  'use strict';
  const C = window.SlingCore;
  const { Body } = Matter;
  const {
    W, H, GROUND_TOP, ANCHOR, BIRD_R, MAX_PULL, MIN_PULL, POWER, STEP, MATERIAL,
  } = C;

  // ---- mode machine (A5): MENU -> PLAYING -> PAUSED -> CLEARED/FAILED ----
  let mode = 'MENU';
  let session = null;
  let stageIndex = 0;
  let unlocked = 1;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const el = (id) => document.getElementById(id);

  function startStage(n) {
    stageIndex = Math.max(1, Math.min(STAGES.length, n)) - 1;
    session = C.buildSession(STAGES[stageIndex]);   // fresh engine => leak-proof reset
    C.placeBird(session);
    mode = 'PLAYING';
    hideAllOverlays();
    updateHud();
  }
  function restartStage() { startStage(stageIndex + 1); }
  function goMenu() { mode = 'MENU'; session = null; showMenu(); }

  // ---- overlays ----
  const overlays = ['menu', 'pause', 'clear', 'fail'];
  function hideAllOverlays() { overlays.forEach((o) => el('ov-' + o).classList.add('hidden')); }
  function showOverlay(o) { hideAllOverlays(); el('ov-' + o).classList.remove('hidden'); }

  function showMenu() { buildStageGrid(); showOverlay('menu'); }
  function buildStageGrid() {
    const grid = el('stage-grid');
    grid.innerHTML = '';
    STAGES.forEach((st, i) => {
      const b = document.createElement('button');
      const locked = (i + 1) > unlocked;
      b.className = 'stage-btn' + (locked ? ' locked' : '');
      b.innerHTML = `<span class="num">${st.id}</span><span class="nm">${st.name}</span>`;
      if (!locked) b.addEventListener('click', () => startStage(i + 1));
      grid.appendChild(b);
    });
  }

  function pauseGame() { if (mode === 'PLAYING') { mode = 'PAUSED'; showOverlay('pause'); } }
  function resumeGame() { if (mode === 'PAUSED') { mode = 'PLAYING'; hideAllOverlays(); } }

  function updateHud() {
    if (!session) return;
    el('hud-stage').textContent = `Stage ${session.stage.id} · ${session.stage.name}`;
    el('hud-birds').textContent = '🐦 ' + session.birdsLoaded;
    el('hud-pigs').textContent = '🐷 ' + session.pigsAlive;
  }

  function onResult(kind) {
    if (kind === 'clear') {
      unlocked = Math.max(unlocked, Math.min(STAGES.length, stageIndex + 2));
      el('clear-title').textContent = STAGES[stageIndex].name + ' 클리어!';
      el('btn-next').style.display = (stageIndex + 1 < STAGES.length) ? '' : 'none';
      showOverlay('clear');
    } else {
      showOverlay('fail');
    }
  }

  // ============================================================
  //  INPUT — custom pointer slingshot (A2)
  // ============================================================
  let aiming = false;

  function toWorld(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return { x: (clientX - r.left) * (W / r.width), y: (clientY - r.top) * (H / r.height) };
  }

  function pullFrom(pointer) {
    let dx = ANCHOR.x - pointer.x, dy = ANCHOR.y - pointer.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, MAX_PULL);
    const nx = dist ? dx / dist : 0, ny = dist ? dy / dist : 0;
    return {
      dist: clamped,
      aimPos: { x: ANCHOR.x - nx * clamped, y: ANCHOR.y - ny * clamped },
      launch: { vx: nx * clamped * POWER, vy: ny * clamped * POWER },
    };
  }

  function onDown(e) {
    if (mode !== 'PLAYING' || !session || session.birdState !== 'ready') return;
    const p = toWorld(e.clientX, e.clientY);
    if (p.x < ANCHOR.x + 280) {
      aiming = true;
      if (canvas.setPointerCapture) try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      onMove(e);
      e.preventDefault();
    }
  }
  function onMove(e) {
    if (!aiming || !session || session.birdState !== 'ready') return;
    const pull = pullFrom(toWorld(e.clientX, e.clientY));
    session.aimPos = pull.aimPos;
    session.aimLaunch = pull.launch;
    session.aimDist = pull.dist;
    Body.setPosition(session.currentBird, pull.aimPos);
    e.preventDefault();
  }
  function onUp(e) {
    if (!aiming) return;
    aiming = false;
    if (!session || session.birdState !== 'ready') return;
    if (session.aimDist && session.aimDist >= MIN_PULL) {
      C.fireBird(session, session.aimLaunch.vx, session.aimLaunch.vy);
    } else {
      Body.setPosition(session.currentBird, { x: ANCHOR.x, y: ANCHOR.y });
      session.aimPos = null;
    }
    session.aimLaunch = null; session.aimDist = 0;
    e.preventDefault();
  }

  // ============================================================
  //  RENDER
  // ============================================================
  function render() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawSlingshotBack();
    if (session) {
      for (const b of session.blocks) if (!b.gameMeta.dead) drawBlock(b);
      for (const p of session.pigs) if (!p.gameMeta.dead) drawPig(p);
      if (session.currentBird) drawBird(session.currentBird);
      if (aiming && session.birdState === 'ready') drawAim();
    }
    drawSlingshotFront();
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#7ec0ee'); g.addColorStop(0.7, '#bfe3f5'); g.addColorStop(1, '#dff1e1');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(120,190,120,0.5)';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(180 + i * 340, GROUND_TOP + 10, 260, 120, 0, Math.PI, 0);
      ctx.fill();
    }
    ctx.fillStyle = '#77bd57'; ctx.fillRect(0, GROUND_TOP, W, H - GROUND_TOP);
    ctx.fillStyle = '#5e9a43'; ctx.fillRect(0, GROUND_TOP, W, 14);
    ctx.fillStyle = '#6b4a2a'; ctx.fillRect(0, GROUND_TOP + 30, W, H - GROUND_TOP - 30);
  }

  function drawSlingshotBack() {
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ANCHOR.x, GROUND_TOP); ctx.lineTo(ANCHOR.x, ANCHOR.y - 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ANCHOR.x, ANCHOR.y + 6); ctx.lineTo(ANCHOR.x - 22, ANCHOR.y - 34); ctx.stroke();
    if (session && session.currentBird && session.birdState === 'ready') {
      const b = session.currentBird.position;
      ctx.strokeStyle = '#4a2f16'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(ANCHOR.x - 22, ANCHOR.y - 34); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  function drawSlingshotFront() {
    ctx.strokeStyle = '#9c6a34'; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ANCHOR.x, ANCHOR.y + 6); ctx.lineTo(ANCHOR.x + 22, ANCHOR.y - 34); ctx.stroke();
    if (session && session.currentBird && session.birdState === 'ready') {
      const b = session.currentBird.position;
      ctx.strokeStyle = '#3a2510'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(ANCHOR.x + 22, ANCHOR.y - 34); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }

  function drawBlock(body) {
    const m = body.gameMeta, mat = MATERIAL[m.type];
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    const w = m.w, h = m.h;
    roundRect(-w / 2, -h / 2, w, h, 5);
    ctx.fillStyle = mat.fill; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = mat.edge; ctx.stroke();
    const dmg = 1 - m.health / m.maxHealth;
    if (dmg > 0.05) {
      ctx.strokeStyle = 'rgba(0,0,0,' + (0.15 + dmg * 0.5) + ')'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 4, -h / 2 + h * 0.35); ctx.lineTo(w * 0.1, h * 0.1);
      ctx.lineTo(-w * 0.1, h * 0.2); ctx.lineTo(w / 2 - 4, h / 2 - 4); ctx.stroke();
    }
    ctx.restore();
  }

  function drawPig(body) {
    const m = body.gameMeta, r = m.r;
    const hurt = 1 - m.health / m.maxHealth;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = hurt > 0.5 ? '#7cbf4f' : '#8ed05b'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#5b8f36'; ctx.stroke();
    ctx.fillStyle = '#8ed05b';
    ctx.beginPath(); ctx.arc(-r * 0.6, -r * 0.7, r * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.6, -r * 0.7, r * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, r * 0.15, r * 0.5, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#7cbf4f'; ctx.fill();
    ctx.fillStyle = '#4f7d30';
    ctx.beginPath(); ctx.arc(-r * 0.18, r * 0.15, r * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.18, r * 0.15, r * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-r * 0.32, -r * 0.15, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.32, -r * 0.15, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(-r * 0.28, -r * 0.13, r * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.36, -r * 0.13, r * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawBird(body) {
    const r = BIRD_R;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = '#e23b2e'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#9c1f16'; ctx.stroke();
    ctx.beginPath(); ctx.arc(r * 0.15, r * 0.35, r * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#f4c26b'; ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-r * 0.15, -r * 0.3, r * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.3, r * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(-r * 0.08, -r * 0.3, r * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.42, -r * 0.3, r * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f6a623';
    ctx.beginPath(); ctx.moveTo(r * 0.7, 0); ctx.lineTo(r * 1.15, -r * 0.18); ctx.lineTo(r * 1.15, r * 0.18); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawAim() {
    if (!session.aimLaunch || session.aimDist < MIN_PULL) return;
    const b = session.currentBird.position;
    const pts = C.replay(b.x, b.y, session.aimLaunch.vx, session.aimLaunch.vy, 90);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 2; i < pts.length; i += 3) {
      const t = i / pts.length;
      ctx.globalAlpha = 1 - t * 0.7;
      ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, 5 - t * 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ============================================================
  //  MAIN LOOP — fixed-timestep accumulator (refresh-rate safe)
  // ============================================================
  let acc = 0, last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = now - last; last = now;
    if (dt > 250) dt = 250;
    if (mode === 'PLAYING' && session) {
      acc += dt;
      let guard = 0;
      while (acc >= STEP && guard < 8) {
        C.stepSession(session);
        acc -= STEP; guard++;
        if (session.result) break;
      }
      updateHud();
      if (session.result) {
        const r = session.result;
        mode = r === 'clear' ? 'CLEARED' : 'FAILED';
        onResult(r);
      }
    } else {
      acc = 0;
    }
    render();
  }

  // ============================================================
  //  BOOT + wiring
  // ============================================================
  function boot() {
    canvas.width = W; canvas.height = H;
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    el('btn-pause').addEventListener('click', pauseGame);
    el('btn-resume').addEventListener('click', resumeGame);
    el('btn-pause-restart').addEventListener('click', restartStage);
    el('btn-pause-menu').addEventListener('click', goMenu);
    el('btn-next').addEventListener('click', () => startStage(stageIndex + 2));
    el('btn-clear-restart').addEventListener('click', restartStage);
    el('btn-clear-menu').addEventListener('click', goMenu);
    el('btn-fail-restart').addEventListener('click', restartStage);
    el('btn-fail-menu').addEventListener('click', goMenu);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'p') {
        if (mode === 'PLAYING') pauseGame(); else if (mode === 'PAUSED') resumeGame();
      }
    });

    showMenu();
    requestAnimationFrame(frame);
  }

  // ---- debug hook: scriptable verification ----
  window.__game = {
    mode: () => mode,
    stages: () => STAGES.length,
    loadStage: (n) => startStage(n),
    pigCount: () => (session ? session.pigsAlive : -1),
    bodyCount: () => (session ? Matter.Composite.allBodies(session.world).length : -1),
    birdsLeft: () => (session ? session.birdsLoaded : -1),
    launch: (vx, vy) => (session ? C.fireBird(session, vx, vy) : false),
    solveLaunch: C.solveLaunch,
    verifyStage: (n) => C.verifyStage(STAGES[n - 1]),
    verifyAll: () => STAGES.map((st) => C.verifyStage(st)),
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
