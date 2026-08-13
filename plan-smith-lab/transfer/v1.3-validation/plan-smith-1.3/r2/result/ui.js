const UI = (() => {
  function show(id) {
    const el = document.getElementById(`ov-${id}`);
    if (el) el.classList.add('on');
  }

  function hide(id) {
    const el = document.getElementById(`ov-${id}`);
    if (el) el.classList.remove('on');
  }

  function renderSelect() {
    const grid = document.getElementById('stage-grid');
    grid.innerHTML = '';

    const progress = Store.load();

    for (let i = 1; i <= 10; i++) {
      const slot = document.createElement('div');
      slot.className = 'stage-slot';
      slot.dataset.stage = i;

      const isLocked = i > progress.unlocked;

      if (isLocked) {
        slot.classList.add('locked');
        slot.innerHTML = `<div class="number">🔒</div>`;
      } else {
        slot.innerHTML = `<div class="number">${i}</div>`;
        const stars = progress.stars[i] || 0;
        slot.innerHTML += `<div class="stars">${'★'.repeat(stars)}</div>`;
        slot.addEventListener('click', () => Game.start(i));
      }

      grid.appendChild(slot);
    }
  }

  function setHud(score, birdsLeft) {
    const scoreEl = document.querySelector('#hud-score span');
    if (scoreEl) scoreEl.textContent = score;

    const birdsEl = document.getElementById('hud-birds');
    if (birdsEl) {
      birdsEl.innerHTML = '';
      for (let i = 0; i < birdsLeft; i++) {
        const icon = document.createElement('span');
        icon.textContent = '🐦';
        birdsEl.appendChild(icon);
      }
    }
  }

  function init() {
    const btnStart = document.getElementById('btn-start');
    const btnOpenSelect = document.getElementById('btn-open-select');
    const btnSelectBack = document.getElementById('btn-select-back');
    const btnPause = document.getElementById('btn-pause');
    const btnMute = document.getElementById('btn-mute');
    const btnResume = document.getElementById('btn-resume');
    const btnRetry = document.getElementById('btn-retry');
    const btnHome = document.getElementById('btn-home');
    const btnNext = document.getElementById('btn-next');
    const btnClearHome = document.getElementById('btn-clear-home');
    const btnFailRetry = document.getElementById('btn-fail-retry');
    const btnFailHome = document.getElementById('btn-fail-home');

    btnStart?.addEventListener('click', () => {
      Game.start(1);
    });

    btnOpenSelect?.addEventListener('click', () => {
      UI.hide('menu');
      UI.show('select');
      UI.renderSelect();
    });

    btnSelectBack?.addEventListener('click', () => {
      UI.hide('select');
      UI.show('menu');
    });

    btnPause?.addEventListener('click', () => {
      Game.state = 'PAUSED';
      UI.show('pause');
    });

    btnMute?.addEventListener('click', () => {
      Sound.toggle();
      btnMute.textContent = Sound.muted ? '🔇' : '🔊';
    });

    btnResume?.addEventListener('click', () => {
      Game.state = 'PLAYING';
      UI.hide('pause');
    });

    btnRetry?.addEventListener('click', () => {
      UI.hide('pause');
      Game.start(Game.stageNo);
    });

    btnHome?.addEventListener('click', () => {
      UI.hide('pause');
      Physics.clear();
      Game.state = 'MENU';
      UI.show('menu');
    });

    btnNext?.addEventListener('click', () => {
      UI.hide('clear');
      if (Game.stageNo < 10) {
        Game.start(Game.stageNo + 1);
      } else {
        Game.state = 'MENU';
        UI.show('menu');
      }
    });

    btnClearHome?.addEventListener('click', () => {
      UI.hide('clear');
      Physics.clear();
      Game.state = 'MENU';
      UI.show('menu');
    });

    btnFailRetry?.addEventListener('click', () => {
      UI.hide('fail');
      Game.start(Game.stageNo);
    });

    btnFailHome?.addEventListener('click', () => {
      UI.hide('fail');
      Physics.clear();
      Game.state = 'MENU';
      UI.show('menu');
    });
  }

  return {
    init,
    show,
    hide,
    renderSelect,
    setHud
  };
})();

const Store = (() => {
  const KEY = 'ab_progress';
  let memoryFallback = { unlocked: 1, stars: {} };

  function load() {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    return memoryFallback;
  }

  function save(progress) {
    try {
      localStorage.setItem(KEY, JSON.stringify(progress));
    } catch (e) {
      memoryFallback = progress;
    }
  }

  return { load, save };
})();

const Sound = (() => {
  let ctx = null;
  let muted = false;

  function initAudio() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume();
    } catch (e) {}
  }

  function play(name) {
    if (muted || !ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (name === 'launch') {
        osc.frequency.value = 800;
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (name === 'hit') {
        osc.frequency.value = 600;
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (name === 'pop') {
        osc.frequency.value = 1000;
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch (e) {}
  }

  function toggle() {
    muted = !muted;
  }

  return {
    play,
    toggle,
    get ctx() { return ctx; },
    get muted() { return muted; },
    initAudio
  };
})();

document.addEventListener('pointerdown', () => {
  Sound.initAudio();
});
