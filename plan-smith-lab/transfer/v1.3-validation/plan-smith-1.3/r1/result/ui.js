const UI = {
  init() {
    // 메인 메뉴 버튼
    document.getElementById('btn-start').addEventListener('click', () => {
      Game.start(1);
    });

    document.getElementById('btn-open-select').addEventListener('click', () => {
      Game.showSelect();
    });

    // 스테이지 선택 버튼
    document.getElementById('btn-select-back').addEventListener('click', () => {
      Game.state = 'MENU';
      UI.show('menu');
      UI.hide('select');
    });

    // 일시정지 버튼
    document.getElementById('btn-pause').addEventListener('click', () => {
      if (Game.state === 'PLAYING') {
        Game.state = 'PAUSED';
        UI.show('pause');
      }
    });

    // 음소거 버튼
    document.getElementById('btn-mute').addEventListener('click', () => {
      Sound.toggle();
      const btn = document.getElementById('btn-mute');
      btn.textContent = Sound.muted ? '🔇' : '🔊';
    });

    // 일시정지 오버레이 버튼
    document.getElementById('btn-resume').addEventListener('click', () => {
      Game.state = 'PLAYING';
      UI.hide('pause');
    });

    document.getElementById('btn-retry').addEventListener('click', () => {
      Game.start(Game.stageNo);
      UI.hide('pause');
    });

    document.getElementById('btn-home').addEventListener('click', () => {
      Game.state = 'MENU';
      Physics.clear();
      UI.hide('pause');
      UI.show('menu');
    });

    // 클리어 오버레이 버튼
    document.getElementById('btn-next').addEventListener('click', () => {
      const nextStage = Game.stageNo + 1;
      if (nextStage <= 10) {
        Game.start(nextStage);
        UI.hide('clear');
      }
    });

    document.getElementById('btn-clear-home').addEventListener('click', () => {
      Game.state = 'MENU';
      Physics.clear();
      UI.hide('clear');
      UI.show('menu');
    });

    // 실패 오버레이 버튼
    document.getElementById('btn-fail-retry').addEventListener('click', () => {
      Game.start(Game.stageNo);
      UI.hide('fail');
    });

    document.getElementById('btn-fail-home').addEventListener('click', () => {
      Game.state = 'MENU';
      Physics.clear();
      UI.hide('fail');
      UI.show('menu');
    });
  },

  show(id) {
    const overlay = document.getElementById(`ov-${id}`);
    if (overlay) overlay.classList.add('on');
  },

  hide(id) {
    const overlay = document.getElementById(`ov-${id}`);
    if (overlay) overlay.classList.remove('on');
  },

  renderSelect() {
    const grid = document.getElementById('stage-grid');
    grid.innerHTML = '';

    const progress = Store.load();
    const unlocked = progress.unlocked || 1;

    for (let i = 1; i <= 10; i++) {
      const slot = document.createElement('div');
      slot.className = 'stage-slot';

      if (i > unlocked) {
        slot.classList.add('locked');
        slot.innerHTML = `
          <div class="slot-number">${i}</div>
          <div class="slot-lock">🔒</div>
        `;
      } else {
        const stars = progress.stars && progress.stars[i] ? progress.stars[i] : 0;
        const starDisplay = stars > 0 ? '★'.repeat(stars) : '';
        slot.innerHTML = `
          <div class="slot-number">${i}</div>
          <div class="slot-stars">${starDisplay}</div>
        `;

        slot.addEventListener('click', () => {
          Game.start(i);
          UI.hide('select');
        });
      }

      grid.appendChild(slot);
    }
  },

  setHud(score, birdsLeft) {
    document.getElementById('hud-score').textContent = `점수: ${score}`;

    const birdsContainer = document.getElementById('hud-birds');
    birdsContainer.innerHTML = '';
    for (let i = 0; i < birdsLeft; i++) {
      const icon = document.createElement('div');
      icon.className = 'bird-icon';
      icon.textContent = '🐦';
      birdsContainer.appendChild(icon);
    }
  }
};

const Store = {
  key: 'ab_progress',
  memoryFallback: { unlocked: 1, stars: {} },

  load() {
    try {
      const stored = localStorage.getItem(this.key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      // localStorage 실패 시 메모리 사용
    }
    return this.memoryFallback;
  },

  save(progress) {
    try {
      localStorage.setItem(this.key, JSON.stringify(progress));
    } catch (e) {
      // localStorage 실패 시 메모리에만 저장
      this.memoryFallback = progress;
    }
  }
};

const Sound = {
  ctx: null,
  muted: false,
  notes: {
    launch: 440,
    hit: 600,
    pop: 800
  },

  init() {
    // 첫 포인터 입력에서 AudioContext 생성
    const createAudioContext = () => {
      if (!this.ctx) {
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          this.ctx = new AudioContext();
          if (this.ctx.state === 'suspended') {
            this.ctx.resume();
          }
        } catch (e) {
          // WebAudio 미지원
        }
      }
      document.removeEventListener('pointerdown', createAudioContext);
    };

    document.addEventListener('pointerdown', createAudioContext);
  },

  play(name) {
    if (this.muted || !this.ctx) return;

    try {
      const freq = this.notes[name] || 440;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.frequency.value = freq;
      osc.type = 'sine';

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {
      // 음향 오류 무시
    }
  },

  toggle() {
    this.muted = !this.muted;
  }
};

// Sound 초기화
Sound.init();
