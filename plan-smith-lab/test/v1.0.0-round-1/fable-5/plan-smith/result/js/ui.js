// UI: 메인 화면(스테이지 선택), HUD(우측 일시정지 버튼), 오버레이 3종.
// 일시정지 오버레이에 다시하기/메인으로가 존재한다(A3).

import { STAGE_COUNT } from './constants.js';
import { States } from './state.js';

export class UI {
  constructor(cb) {
    this.cb = cb;
    this.el = {
      hud: document.getElementById('hud'),
      stageLabel: document.getElementById('stage-label'),
      birdsLabel: document.getElementById('birds-label'),
      devInfo: document.getElementById('dev-info'),
      screenMain: document.getElementById('screen-main'),
      stageGrid: document.getElementById('stage-grid'),
      ovPause: document.getElementById('overlay-pause'),
      ovClear: document.getElementById('overlay-clear'),
      ovFail: document.getElementById('overlay-fail'),
      btnNext: document.getElementById('btn-next'),
      btnReplay: document.getElementById('btn-replay'),
    };

    // 메인 화면 스테이지 그리드
    for (let i = 1; i <= STAGE_COUNT; i++) {
      const btn = document.createElement('button');
      btn.className = 'stage-btn';
      btn.textContent = String(i);
      btn.addEventListener('click', () => cb.startStage(i));
      this.el.stageGrid.appendChild(btn);
    }

    const on = (id, fn) => document.getElementById(id).addEventListener('click', fn);
    on('btn-pause', () => cb.pause());
    on('btn-resume', () => cb.resume());
    on('btn-retry-pause', () => cb.retry());
    on('btn-main-pause', () => cb.toMain());
    on('btn-next', () => cb.nextStage());
    on('btn-retry-clear', () => cb.retry());
    on('btn-main-clear', () => cb.toMain());
    on('btn-retry-fail', () => cb.retry());
    on('btn-main-fail', () => cb.toMain());
    on('btn-replay', () => cb.replay());
  }

  setDevMode(enabled) {
    this.el.devInfo.classList.toggle('hidden', !enabled);
    this.el.btnReplay.classList.toggle('hidden', !enabled);
  }

  sync(state, game) {
    const show = (el, yes) => el.classList.toggle('hidden', !yes);
    show(this.el.screenMain, state === States.MAIN);
    show(this.el.hud, state !== States.MAIN);
    show(this.el.ovPause, state === States.PAUSED);
    show(this.el.ovClear, state === States.CLEAR);
    show(this.el.ovFail, state === States.FAIL);

    if (state === States.CLEAR) {
      // 마지막 스테이지에는 "다음 스테이지" 없음
      show(this.el.btnNext, game.stageNum < STAGE_COUNT);
    }
  }

  updateHud(game) {
    this.el.stageLabel.textContent = `STAGE ${game.stageNum}`;
    const birds =
      game.birdsQueue + (game.loadedBird ? 1 : 0) + (game.activeBird ? 1 : 0);
    this.el.birdsLabel.textContent = `남은 새: ${birds}`;
  }

  updateDevInfo(text) {
    this.el.devInfo.textContent = text;
  }
}
