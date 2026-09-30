window.AB = window.AB || {};

// DOM 화면/오버레이/HUD (계획서 §8.11, §12). 버튼 → Game 메서드.
AB.UI = (function () {
  'use strict';

  const el = {};
  const hudCache = { stage: null, score: null, birds: null };

  function $(id) {
    return document.getElementById(id);
  }

  function show(node, visible) {
    if (!node) return;
    if (visible) node.removeAttribute('hidden');
    else node.setAttribute('hidden', '');
  }

  // 천 단위 콤마(로케일 무관)
  function fmt(n) {
    const s = String(Math.round(Number(n) || 0));
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function on(id, fn) {
    const node = $(id);
    if (node) node.addEventListener('click', fn);
  }

  function starsText(stars) {
    const s = Math.max(0, Math.min(3, Math.floor(stars) || 0));
    return '★'.repeat(s) + '☆'.repeat(3 - s);
  }

  function init(game) {
    el.hud = $('hud');
    el.hudStage = $('hud-stage');
    el.hudScore = $('hud-score');
    el.hudBirds = $('hud-birds');
    el.screenMenu = $('screen-menu');
    el.screenSelect = $('screen-select');
    el.stageGrid = $('stage-grid');
    el.overlayPause = $('overlay-pause');
    el.overlayResult = $('overlay-result');
    el.resultTitle = $('result-title');
    el.resultStars = $('result-stars');
    el.resultScore = $('result-score');
    el.btnNext = $('btn-next');

    on('btn-start', () => game.goSelect());
    on('btn-select-back', () => game.goMenu());
    on('btn-pause', () => game.pause());
    on('btn-resume', () => game.resume());
    on('btn-pause-restart', () => game.restart());
    on('btn-pause-menu', () => game.goMenu());
    on('btn-next', () => game.nextLevel());
    on('btn-result-restart', () => game.restart());
    on('btn-result-menu', () => game.goMenu());

    if (el.stageGrid) {
      el.stageGrid.addEventListener('click', (e) => {
        const target = e.target;
        const tile = (target && target.closest) ? target.closest('.stage-tile') : null;
        if (!tile || tile.classList.contains('locked')) return;
        const id = Number(tile.getAttribute('data-id'));
        if (id >= 1) game.startLevel(id);
      });
    }
  }

  function buildStageGrid(progress) {
    if (!el.stageGrid) return;
    el.stageGrid.innerHTML = '';
    const total = AB.LEVELS.length;
    const unlocked = (progress && progress.unlocked) ? progress.unlocked : 1;
    const best = (progress && progress.best) ? progress.best : {};

    for (let i = 1; i <= total; i++) {
      const locked = i > unlocked;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'stage-tile' + (locked ? ' locked' : '');
      btn.setAttribute('data-id', String(i));
      btn.title = AB.LEVELS[i - 1].name;
      if (locked) btn.disabled = true;

      const num = document.createElement('span');
      num.className = 'tile-num';
      num.textContent = locked ? '🔒' : String(i);

      const stars = document.createElement('span');
      stars.className = 'tile-stars';
      if (locked) {
        stars.textContent = '';
      } else {
        const b = best[String(i)];
        stars.textContent = b ? starsText(b.stars) : '☆☆☆';
      }

      btn.appendChild(num);
      btn.appendChild(stars);
      el.stageGrid.appendChild(btn);
    }
  }

  function fillResult(game) {
    const won = game.state === 'CLEARED';
    if (el.resultTitle) el.resultTitle.textContent = won ? '스테이지 클리어!' : '실패…';
    if (el.resultStars) el.resultStars.textContent = won ? starsText(game.resultStars) : '';
    if (el.resultScore) {
      let text = '점수: ' + fmt(game.score);
      if (won && game.resultBonus > 0) text += ' (남은 새 보너스 +' + fmt(game.resultBonus) + ')';
      el.resultScore.textContent = text;
    }
    show(el.btnNext, won && game.levelId < AB.LEVELS.length);
  }

  // 상태별 표시 규칙(§7)
  function sync(game) {
    const s = game.state;
    show(el.screenMenu, s === 'MENU');
    show(el.screenSelect, s === 'SELECT');
    show(el.hud, s === 'PLAYING' || s === 'PAUSED' || s === 'CLEARED' || s === 'FAILED');
    show(el.overlayPause, s === 'PAUSED');
    show(el.overlayResult, s === 'CLEARED' || s === 'FAILED');
    if (s === 'SELECT') buildStageGrid(game.progress);
    if (s === 'CLEARED' || s === 'FAILED') fillResult(game);
    updateHud(game);
  }

  // 값이 바뀔 때만 textContent 갱신
  function updateHud(game) {
    if (!game || !game.level) return;
    const stage = 'STAGE ' + game.levelId + ' · ' + game.level.name;
    const score = '점수 ' + fmt(game.score);
    const birds = '남은 새 ' + game.birdsLeft();
    if (stage !== hudCache.stage && el.hudStage) { el.hudStage.textContent = stage; hudCache.stage = stage; }
    if (score !== hudCache.score && el.hudScore) { el.hudScore.textContent = score; hudCache.score = score; }
    if (birds !== hudCache.birds && el.hudBirds) { el.hudBirds.textContent = birds; hudCache.birds = birds; }
  }

  // init 전에도 호출될 수 있으므로 직접 조회
  function showError() {
    show($('error-overlay'), true);
  }

  return {
    init: init,
    sync: sync,
    updateHud: updateHud,
    buildStageGrid: buildStageGrid,
    showError: showError
  };
})();
