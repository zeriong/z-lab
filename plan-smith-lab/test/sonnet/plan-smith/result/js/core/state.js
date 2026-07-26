/**
 * Game state machine (plan Step 5): MAIN -> STAGE_SELECT -> PLAYING
 * -> PAUSED -> (CLEARED | FAILED) -> back to STAGE_SELECT/MAIN/PLAYING.
 *
 * Also owns the per-stage match runtime (score, birds remaining, pig
 * count, round-settle detection) since that state lives and dies with
 * the PLAYING state.
 */
window.State = (function () {
  const STATES = { MAIN: 'main', HOW: 'how', STAGE_SELECT: 'stage_select', PLAYING: 'playing', PAUSED: 'paused', RESULT: 'result' };

  const SCORE_PIG = 500;
  const SCORE_BLOCK = { wood: 100, stone: 200, ice: 50 };
  const SETTLE_EPS = 0.35;
  const SETTLE_STEPS = 30;      // ~0.5s of near-rest at 60Hz fixed step
  const MAX_FLIGHT_STEPS = 900; // ~15s hard cap so a body sliding forever can't hang the round

  let current = STATES.MAIN;
  let progress = null;
  let match = null;

  // ---- DOM refs ----
  const el = {};
  function cacheDom() {
    el.stageGrid = document.getElementById('stage-grid');
    el.mainHint = document.getElementById('main-progress-hint');
    el.hudStageName = document.getElementById('hud-stage-name');
    el.hudScore = document.getElementById('hud-score');
    el.hudBirds = document.getElementById('hud-birds');
    el.overlayPause = document.getElementById('overlay-pause');
    el.overlayResult = document.getElementById('overlay-result');
    el.resultTitle = document.getElementById('result-title');
    el.resultStars = document.getElementById('result-stars');
    el.resultScore = document.getElementById('result-score');
    el.btnNext = document.getElementById('btn-next');
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  function hideOverlays() {
    el.overlayPause.classList.remove('active');
    el.overlayResult.classList.remove('active');
  }

  // ---------------- navigation ----------------
  function goMain() {
    current = STATES.MAIN;
    match = null;
    window.Slingshot.setEnabled(false);
    hideOverlays();
    showScreen('screen-main');
    el.mainHint.textContent = progress ? `잠금 해제된 스테이지: ${Object.values(progress.stars).filter((v) => v !== -1).length} / ${window.STAGES.length}` : '';
  }

  function goHow() {
    current = STATES.HOW;
    showScreen('screen-how');
  }

  function goStageSelect() {
    current = STATES.STAGE_SELECT;
    match = null;
    window.Slingshot.setEnabled(false);
    hideOverlays();
    renderStageGrid();
    showScreen('screen-stage-select');
  }

  function renderStageGrid() {
    el.stageGrid.innerHTML = '';
    window.STAGES.forEach((stage) => {
      const stars = progress.stars[stage.id];
      const locked = stars === -1 || stars === undefined;
      const btn = document.createElement('button');
      btn.className = 'stage-tile' + (locked ? ' locked' : '');
      btn.innerHTML = stage.id + (!locked && stars > 0 ? `<span class="tile-stars">${'★'.repeat(stars)}</span>` : '');
      btn.disabled = locked;
      if (!locked) btn.addEventListener('click', () => startStage(stage.id));
      el.stageGrid.appendChild(btn);
    });
  }

  // ---------------- gameplay ----------------
  function startStage(stageId) {
    const stageData = window.STAGES.find((s) => s.id === stageId);
    if (!stageData) return;
    window.RNG.seed(1000 + stageId); // deterministic debris spread per stage/attempt
    window.Physics.loadStage(stageData);
    match = {
      stageId,
      stageData,
      score: 0,
      pigsRemaining: stageData.pigs.length,
      birdsTotal: stageData.birdCount,
      birdsSpawned: 0,
      phase: 'idle',
      flightSteps: 0,
      settleCounter: 0
    };
    hideOverlays();
    showScreen('screen-game');
    current = STATES.PLAYING;
    spawnNextBird();
  }

  function spawnNextBird() {
    match.birdsSpawned++;
    window.Physics.spawnBird();
    match.phase = 'aiming';
    match.flightSteps = 0;
    match.settleCounter = 0;
    window.Slingshot.setEnabled(true);
    updateHud();
  }

  function launchCurrentBird(vx, vy) {
    if (current !== STATES.PLAYING || !match || match.phase !== 'aiming') return;
    window.Physics.launchBird(vx, vy);
    match.phase = 'flying';
    match.flightSteps = 0;
    match.settleCounter = 0;
    window.Slingshot.setEnabled(false);
  }

  function onPigDestroyed(body) {
    if (!match) return;
    match.pigsRemaining--;
    match.score += SCORE_PIG;
    window.Render.spawnDebris(body.position.x, body.position.y, '#6fbf4a', 14);
    updateHud();
  }

  function onBlockDestroyed(body) {
    if (!match) return;
    match.score += SCORE_BLOCK[body.plugin.material] || 0;
    const mat = window.Physics.MATERIALS[body.plugin.material];
    window.Render.spawnDebris(body.position.x, body.position.y, mat.color, 10);
    updateHud();
  }

  function updateHud() {
    if (!match) return;
    el.hudStageName.textContent = match.stageData.name;
    el.hudScore.textContent = 'SCORE ' + match.score;
    el.hudBirds.innerHTML = '';
    const usedCount = Math.max(0, match.birdsSpawned - 1);
    for (let i = 0; i < match.birdsTotal; i++) {
      const dot = document.createElement('div');
      dot.className = 'bird-icon' + (i < usedCount ? ' used' : '');
      el.hudBirds.appendChild(dot);
    }
  }

  /** Called once per fixed physics step, only while PLAYING (main.js gates this). */
  function tickMatch() {
    if (!match || match.phase !== 'flying') return;
    match.flightSteps++;
    const speed = window.Physics.maxBodySpeed();
    match.settleCounter = speed < SETTLE_EPS ? match.settleCounter + 1 : 0;
    if (match.settleCounter >= SETTLE_STEPS || match.flightSteps >= MAX_FLIGHT_STEPS) {
      resolveRound();
    }
  }

  function resolveRound() {
    match.phase = 'idle';
    if (match.pigsRemaining <= 0) { endStage(true); return; }
    if (match.birdsSpawned >= match.birdsTotal) { endStage(false); return; }
    spawnNextBird();
  }

  function computeStars() {
    const unused = match.birdsTotal - match.birdsSpawned;
    if (unused >= 2) return 3;
    if (unused === 1) return 2;
    return 1;
  }

  function endStage(cleared) {
    current = STATES.RESULT;
    window.Slingshot.setEnabled(false);
    let stars = 0;
    if (cleared) {
      stars = computeStars();
      progress = window.Storage.recordClear(progress, match.stageId, stars);
    }
    showResultOverlay(cleared, stars);
  }

  function showResultOverlay(cleared, stars) {
    el.resultTitle.textContent = cleared ? '스테이지 클리어!' : '실패...';
    el.resultStars.textContent = cleared ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '';
    el.resultScore.textContent = 'SCORE ' + match.score;
    const hasNext = cleared && window.STAGES.some((s) => s.id === match.stageId + 1);
    el.btnNext.style.display = hasNext ? 'inline-block' : 'none';
    el.overlayResult.classList.add('active');
  }

  // ---------------- pause ----------------
  function pauseGame() {
    if (current !== STATES.PLAYING) return;
    current = STATES.PAUSED;
    window.Slingshot.setEnabled(false);
    el.overlayPause.classList.add('active');
  }

  function resumeGame() {
    if (current !== STATES.PAUSED) return;
    current = STATES.PLAYING;
    el.overlayPause.classList.remove('active');
    window.Slingshot.setEnabled(match.phase === 'aiming');
  }

  function restartCurrentStage() {
    hideOverlays();
    if (match) startStage(match.stageId);
  }

  function goNextStage() {
    if (!match) return;
    const next = window.STAGES.find((s) => s.id === match.stageId + 1);
    if (next) startStage(next.id);
  }

  // ---------------- wiring ----------------
  function wireButtons() {
    document.getElementById('btn-start').addEventListener('click', goStageSelect);
    document.getElementById('btn-how').addEventListener('click', goHow);
    document.getElementById('btn-how-back').addEventListener('click', goMain);
    document.getElementById('btn-stage-back').addEventListener('click', goMain);

    document.getElementById('btn-pause').addEventListener('click', pauseGame);
    document.getElementById('btn-resume').addEventListener('click', resumeGame);
    document.getElementById('btn-restart-pause').addEventListener('click', restartCurrentStage);
    document.getElementById('btn-main-pause').addEventListener('click', goMain);

    document.getElementById('btn-next').addEventListener('click', goNextStage);
    document.getElementById('btn-restart-result').addEventListener('click', restartCurrentStage);
    document.getElementById('btn-main-result').addEventListener('click', goMain);
  }

  function init() {
    cacheDom();
    progress = window.Storage.load();
    window.Collision.init(window.Physics.engine, { onPigDestroyed, onBlockDestroyed });
    wireButtons();
    goMain();
  }

  return {
    init,
    tickMatch,
    launchCurrentBird,
    isRunning: () => current === STATES.PLAYING,
    isAiming: () => current === STATES.PLAYING && !!match && match.phase === 'aiming',
    debugGoStage: (id) => startStage(id)
  };
})();
