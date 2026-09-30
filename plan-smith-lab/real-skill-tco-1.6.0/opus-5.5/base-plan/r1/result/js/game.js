// game.js — 최상위 상태 머신, 화면 스케일링, 메인 루프, 부트스트랩 (plan §3.3, §9)
(function () {
  'use strict';
  const AB = (window.AB = window.AB || {});

  const STATE = {
    MAIN: 'MAIN',
    SELECT: 'SELECT',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    CLEARED: 'CLEARED',
    FAILED: 'FAILED',
  };

  const Game = {
    STATE: STATE,
    state: STATE.MAIN,
    level: null,
    stageIndex: 0,
    progress: null,
    debugUnlock: false,
    acc: 0,
    last: -1,
    time: 0,
    canvas: null,
    root: null,
    _loopFn: null,

    init() {
      this.canvas = document.getElementById('game-canvas');
      this.root = document.getElementById('stage-root');
      if (!this.canvas || !this.root) {
        console.error('[AB] #game-canvas 또는 #stage-root가 없습니다.');
        return;
      }
      this.progress = AB.Storage.load();
      this.debugUnlock = AB.Storage.isDebugUnlock();

      AB.Renderer.init(this.canvas);
      AB.UI.init(this);
      AB.Input.init(this.canvas);

      window.addEventListener('resize', () => this.resize());
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.state === STATE.PLAYING) this.pause();
      });

      this.resize();
      this.toMain();

      this._loopFn = (now) => this.loop(now);
      requestAnimationFrame(this._loopFn);
    },

    // §3.3 창 크기 맞춤 (레터박스)
    resize() {
      const C = AB.CONFIG;
      const iw = window.innerWidth || C.VIEW_W;
      const ih = window.innerHeight || C.VIEW_H;
      const s = Math.max(0.01, Math.min(iw / C.VIEW_W, ih / C.VIEW_H));
      this.root.style.transform = 'scale(' + s + ')';
      this.root.style.left = (iw - C.VIEW_W * s) / 2 + 'px';
      this.root.style.top = (ih - C.VIEW_H * s) / 2 + 'px';
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = Math.max(1, Math.round(C.VIEW_W * s * dpr));
      this.canvas.height = Math.max(1, Math.round(C.VIEW_H * s * dpr));
    },

    stageCount() {
      return AB.STAGES.length;
    },

    unlockedCount() {
      const n = this.stageCount();
      if (this.debugUnlock) return n;
      return AB.clamp(this.progress.unlocked, 1, n);
    },

    clearedCount() {
      let c = 0;
      for (let i = 0; i < this.stageCount(); i++) if (this.progress.stars[i] > 0) c++;
      return c;
    },

    setState(s) {
      this.state = s;
      AB.UI.showState(s);
    },

    // ---------------- 상태 전이 (§9.1) ----------------
    // MAIN → PLAYING: 클리어하지 않은 첫 해금 스테이지, 모두 클리어했으면 1단계
    startGame() {
      if (this.state !== STATE.MAIN) return;
      const unlocked = this.unlockedCount();
      let target = 0;
      for (let i = 0; i < unlocked; i++) {
        if (!(this.progress.stars[i] > 0)) {
          target = i;
          break;
        }
      }
      this.startStage(target);
    },

    openSelect() {
      if (this.state !== STATE.MAIN) return;
      AB.UI.renderSelect(this.progress, this.unlockedCount());
      this.setState(STATE.SELECT);
    },

    // 스테이지 시작(다시하기 포함)은 항상 new Level
    startStage(i) {
      if (!(i >= 0 && i < this.stageCount())) return;
      if (i >= this.unlockedCount()) return;
      AB.Input.reset();
      this.level = null;
      this.level = new AB.Level(i);
      this.stageIndex = i;
      this.acc = 0;
      this.setState(STATE.PLAYING);
      AB.UI.updateHUD(this.level, this.progress.best[i] || 0, this.state);
    },

    pause() {
      if (this.state !== STATE.PLAYING) return;
      if (this.level) this.level.cancelAim();
      AB.Input.reset();
      this.setState(STATE.PAUSED);
    },

    resume() {
      if (this.state !== STATE.PAUSED) return;
      this.acc = 0;
      this.setState(STATE.PLAYING);
    },

    togglePause() {
      if (this.state === STATE.PLAYING) this.pause();
      else if (this.state === STATE.PAUSED) this.resume();
    },

    retry() {
      if (this.state !== STATE.PAUSED && this.state !== STATE.CLEARED && this.state !== STATE.FAILED) return;
      this.startStage(this.stageIndex);
    },

    nextStage() {
      if (this.state !== STATE.CLEARED) return;
      const next = this.stageIndex + 1;
      if (next >= this.stageCount()) return;
      this.startStage(next);
    },

    // Level 폐기 → MAIN
    toMain() {
      AB.Input.reset();
      this.level = null;
      this.acc = 0;
      AB.UI.updateMain(this.clearedCount(), this.stageCount());
      this.setState(STATE.MAIN);
    },

    // outcome 감지 → CLEARED / FAILED (+ 저장)
    _onOutcome() {
      const lv = this.level;
      const out = lv.outcome;
      const i = this.stageIndex;
      const n = this.stageCount();
      const isLast = i === n - 1;
      if (out.cleared) {
        const p = this.progress;
        const prevBest = p.best[i] || 0;
        out.newBest = out.score > prevBest;
        p.unlocked = Math.min(n, Math.max(p.unlocked, i + 2));
        p.best[i] = Math.max(prevBest, out.score);
        p.stars[i] = Math.max(p.stars[i] || 0, out.stars);
        AB.Storage.save(p);
        AB.UI.showResult(out, p.best[i], isLast);
        this.setState(STATE.CLEARED);
      } else {
        AB.UI.showResult(out, this.progress.best[i] || 0, isLast);
        this.setState(STATE.FAILED);
      }
    },

    // ---------------- 메인 루프 (§9.2) ----------------
    loop(now) {
      requestAnimationFrame(this._loopFn);
      const C = AB.CONFIG;
      let frameDt = 0;
      if (this.last >= 0) frameDt = Math.min((now - this.last) / 1000, C.MAX_FRAME_DT);
      if (!(frameDt > 0)) frameDt = 0;
      this.last = now;
      this.time += frameDt;

      if (this.state === STATE.PLAYING && this.level) {
        this.acc += frameDt;
        let steps = 0;
        while (this.acc >= C.FIXED_DT && steps < C.MAX_STEPS_PER_FRAME) {
          this.level.update(C.FIXED_DT);
          this.acc -= C.FIXED_DT;
          steps++;
          if (this.level.outcome) {
            this.acc = 0;
            this._onOutcome();
            break;
          }
        }
        if (steps >= C.MAX_STEPS_PER_FRAME) this.acc = 0;
      }

      AB.Renderer.render(this);
      if (this.level) AB.UI.updateHUD(this.level, this.progress.best[this.stageIndex] || 0, this.state);
    },
  };

  AB.Game = Game;

  function boot() {
    AB.Game.init();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
