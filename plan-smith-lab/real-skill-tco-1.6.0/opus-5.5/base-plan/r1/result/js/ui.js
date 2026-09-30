// ui.js — DOM 화면 전환, HUD 갱신, 스테이지 선택 그리드, 결과 패널 (plan §9)
(function () {
  'use strict';
  const AB = (window.AB = window.AB || {});

  const IDS = [
    'hud', 'hud-stage', 'hud-score', 'hud-best', 'hud-hint', 'btn-pause',
    'screen-main', 'btn-start', 'btn-select', 'main-progress',
    'screen-select', 'stage-grid', 'btn-back',
    'overlay-pause', 'btn-resume', 'btn-retry-pause', 'btn-main-pause',
    'overlay-result', 'result-title', 'result-stars', 'result-score', 'result-bonus', 'result-best',
    'btn-next', 'btn-retry-result', 'btn-main-result',
  ];

  function fmt(n) {
    return AB.Util.formatNumber(n);
  }

  function show(el, visible) {
    if (el) el.classList.toggle('hidden', !visible);
  }

  // 값이 바뀌었을 때만 textContent 갱신
  function setText(el, text) {
    if (!el) return;
    if (el._abText !== text) {
      el._abText = text;
      el.textContent = text;
    }
  }

  const UI = {
    el: {},
    game: null,
    stageButtons: [],

    init(game) {
      this.game = game;
      for (let i = 0; i < IDS.length; i++) {
        const id = IDS[i];
        const node = document.getElementById(id);
        if (!node) console.warn('[AB] DOM 요소가 없습니다: #' + id);
        this.el[id] = node;
      }

      this._bind('btn-start', () => game.startGame());
      this._bind('btn-select', () => game.openSelect());
      this._bind('btn-back', () => game.toMain());
      this._bind('btn-pause', () => game.togglePause());
      this._bind('btn-resume', () => game.resume());
      this._bind('btn-retry-pause', () => game.retry());
      this._bind('btn-main-pause', () => game.toMain());
      this._bind('btn-next', () => game.nextStage());
      this._bind('btn-retry-result', () => game.retry());
      this._bind('btn-main-result', () => game.toMain());

      this._buildGrid();
    },

    _bind(id, fn) {
      const btn = this.el[id];
      if (!btn) return;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // 포커스가 남아 있으면 Space 키가 버튼을 다시 누르게 되므로 해제한다
        btn.blur();
        fn();
      });
    },

    _buildGrid() {
      const grid = this.el['stage-grid'];
      if (!grid) return;
      grid.textContent = '';
      this.stageButtons = [];
      for (let i = 0; i < AB.STAGES.length; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'stage-btn';
        const num = document.createElement('span');
        num.className = 'stage-num';
        const name = document.createElement('span');
        name.className = 'stage-name';
        const stars = document.createElement('span');
        stars.className = 'stage-stars';
        btn.appendChild(num);
        btn.appendChild(name);
        btn.appendChild(stars);
        const index = i;
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          btn.blur();
          if (!btn.disabled) this.game.startStage(index);
        });
        grid.appendChild(btn);
        this.stageButtons.push({ btn: btn, num: num, name: name, stars: stars });
      }
    },

    // 상태별 가시성 (§9.1)
    showState(state) {
      const el = this.el;
      const inGame = state === 'PLAYING' || state === 'PAUSED' || state === 'CLEARED' || state === 'FAILED';
      show(el['screen-main'], state === 'MAIN');
      show(el['screen-select'], state === 'SELECT');
      show(el['hud'], inGame);
      show(el['btn-pause'], state === 'PLAYING' || state === 'PAUSED');
      if (el['btn-pause']) el['btn-pause'].classList.toggle('active', state === 'PAUSED');
      show(el['overlay-pause'], state === 'PAUSED');
      show(el['overlay-result'], state === 'CLEARED' || state === 'FAILED');
      if (state !== 'PLAYING') {
        setText(el['hud-hint'], '');
        show(el['hud-hint'], false);
      }
    },

    updateMain(clearedCount, total) {
      setText(this.el['main-progress'], '클리어 ' + clearedCount + ' / ' + total);
    },

    renderSelect(progress, unlockedCount) {
      for (let i = 0; i < this.stageButtons.length; i++) {
        const sb = this.stageButtons[i];
        const locked = i >= unlockedCount;
        const s = AB.clamp(progress.stars[i] || 0, 0, 3);
        sb.btn.disabled = locked;
        sb.btn.classList.toggle('locked', locked);
        sb.btn.setAttribute('aria-label', '스테이지 ' + (i + 1) + (locked ? ' (잠김)' : ''));
        sb.num.textContent = String(i + 1);
        sb.name.textContent = AB.STAGES[i].name;
        sb.stars.textContent = locked ? '🔒' : '★'.repeat(s) + '☆'.repeat(3 - s);
      }
    },

    updateHUD(level, best, state) {
      const el = this.el;
      setText(el['hud-stage'], '스테이지 ' + (level.stageIndex + 1) + ' · ' + level.stage.name);
      setText(el['hud-score'], '점수 ' + fmt(level.score));
      setText(el['hud-best'], '최고 ' + fmt(best));
      const hint = state === 'PLAYING' ? level.getHint() : '';
      setText(el['hud-hint'], hint);
      show(el['hud-hint'], hint !== '');
    },

    // outcome: { cleared, score, bonus, stars, newBest }
    showResult(outcome, best, isLast) {
      const el = this.el;
      let title = '실패…';
      if (outcome.cleared) title = isLast ? '모든 스테이지 클리어!' : '스테이지 클리어!';
      setText(el['result-title'], title);
      if (el['overlay-result']) el['overlay-result'].classList.toggle('failed', !outcome.cleared);

      const starBox = el['result-stars'];
      if (starBox) {
        const spans = starBox.querySelectorAll('.star');
        for (let i = 0; i < spans.length; i++) {
          spans[i].classList.toggle('on', outcome.cleared && i < outcome.stars);
        }
      }

      setText(el['result-score'], '점수 ' + fmt(outcome.score));
      setText(el['result-bonus'], '새 보너스 +' + fmt(outcome.bonus));
      show(el['result-bonus'], outcome.cleared);

      const bestEl = el['result-best'];
      if (bestEl) {
        bestEl._abText = null;
        bestEl.textContent = '최고 기록 ' + fmt(best);
        if (outcome.newBest) {
          const tag = document.createElement('span');
          tag.className = 'new-record';
          tag.textContent = '신기록!';
          bestEl.appendChild(tag);
        }
      }

      show(el['btn-next'], outcome.cleared && !isLast);
    },
  };

  AB.UI = UI;
})();
