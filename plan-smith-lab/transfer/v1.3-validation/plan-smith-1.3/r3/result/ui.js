const UI = (() => {
  function show(id) {
    let elem = document.getElementById('ov-' + id);
    if (elem) elem.classList.add('on');
  }

  function hide(id) {
    let elem = document.getElementById('ov-' + id);
    if (elem) elem.classList.remove('on');
  }

  function renderSelect() {
    let grid = document.getElementById('stage-grid');
    grid.innerHTML = '';

    for (let i = 0; i < 10; i++) {
      let slot = document.createElement('div');
      slot.className = 'stage-slot';

      let progress = Store.load();
      let unlocked = progress.unlocked || 1;
      let isLocked = (i + 1) > unlocked;
      let stars = progress.stars ? progress.stars[i + 1] || 0 : 0;

      if (isLocked) {
        slot.classList.add('locked');
        slot.textContent = '🔒';
      } else {
        slot.textContent = (i + 1) + '\n' + '★'.repeat(stars);
        slot.style.whiteSpace = 'pre-line';
      }

      if (!isLocked) {
        slot.addEventListener('click', () => {
          Game.start(i + 1);
          hide('select');
        });
      }

      grid.appendChild(slot);
    }
  }

  function setHud(score, birdsLeft) {
    let scoreElem = document.getElementById('hud-score');
    if (scoreElem) scoreElem.textContent = '점수: ' + score;

    let birdsElem = document.getElementById('hud-birds');
    if (birdsElem) {
      birdsElem.innerHTML = '';
      for (let i = 0; i < birdsLeft; i++) {
        let icon = document.createElement('div');
        icon.className = 'bird-icon';
        birdsElem.appendChild(icon);
      }
    }
  }

  function init() {
    // Menu buttons
    document.getElementById('btn-start').addEventListener('click', () => {
      Game.start(1);
      hide('menu');
    });

    document.getElementById('btn-open-select').addEventListener('click', () => {
      renderSelect();
      show('select');
      hide('menu');
    });

    // Stage select
    document.getElementById('btn-select-back').addEventListener('click', () => {
      hide('select');
      show('menu');
    });

    // Pause
    document.getElementById('btn-pause').addEventListener('click', () => {
      if (Game.state === 'PLAYING') {
        Game.state = 'PAUSED';
        show('pause');
      }
    });

    document.getElementById('btn-mute').addEventListener('click', () => {
      Sound.toggle();
      updateMuteButton();
    });

    // Pause overlay
    document.getElementById('btn-resume').addEventListener('click', () => {
      hide('pause');
      Game.state = 'PLAYING';
    });

    document.getElementById('btn-retry').addEventListener('click', () => {
      hide('pause');
      Game.start(Game.stageNo);
    });

    document.getElementById('btn-home').addEventListener('click', () => {
      hide('pause');
      Physics.clear();
      Game.state = 'MENU';
      show('menu');
    });

    // Clear overlay
    document.getElementById('btn-next').addEventListener('click', () => {
      hide('clear');
      if (Game.stageNo < 10) {
        Game.start(Game.stageNo + 1);
      } else {
        Game.state = 'MENU';
        show('menu');
      }
    });

    document.getElementById('btn-clear-home').addEventListener('click', () => {
      hide('clear');
      Physics.clear();
      Game.state = 'MENU';
      show('menu');
    });

    // Fail overlay
    document.getElementById('btn-fail-retry').addEventListener('click', () => {
      hide('fail');
      Game.start(Game.stageNo);
    });

    document.getElementById('btn-fail-home').addEventListener('click', () => {
      hide('fail');
      Physics.clear();
      Game.state = 'MENU';
      show('menu');
    });
  }

  function updateMuteButton() {
    let btn = document.getElementById('btn-mute');
    if (btn) {
      btn.textContent = Sound.muted ? '🔇' : '🔊';
    }
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
      let data = localStorage.getItem(KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      // Fall through to fallback
    }
    return memoryFallback;
  }

  function save(progress) {
    try {
      localStorage.setItem(KEY, JSON.stringify(progress));
    } catch (e) {
      // Use memory fallback
      memoryFallback = progress;
    }
  }

  return { load, save };
})();

const Sound = (() => {
  let ctx = null;
  let muted = false;

  function initAudioContext() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    }
  }

  function play(name) {
    if (muted) return;

    try {
      if (!ctx) initAudioContext();

      let freq = 440;
      let duration = 0.1;
      let type = 'sine';

      if (name === 'launch') {
        freq = 600;
        duration = 0.15;
      } else if (name === 'hit') {
        freq = 800;
        duration = 0.1;
      } else if (name === 'pop') {
        freq = 1000;
        duration = 0.08;
      }

      let osc = ctx.createOscillator();
      let gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = freq;
      osc.type = type;

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Silently fail if audio not available
    }
  }

  function toggle() {
    muted = !muted;
  }

  // Initialize on first pointer event
  document.addEventListener('pointerdown', () => {
    if (!ctx) initAudioContext();
  }, { once: true });

  return {
    play,
    toggle,
    get muted() { return muted; },
    get ctx() { return ctx; }
  };
})();
