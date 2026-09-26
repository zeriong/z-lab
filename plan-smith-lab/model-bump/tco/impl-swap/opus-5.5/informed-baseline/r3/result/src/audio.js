/*
 * src/audio.js — WebAudio 합성 효과음 (§16)
 * 노출: SFX = { play(name) }   name: 'launch' | 'hit' | 'break' | 'win' | 'lose'
 * 참조 전역: 없음
 * AudioContext 는 최초 사용자 입력 시 lazily 생성. 생성 실패 시 play 는 아무것도 하지 않는다.
 */
(function () {
  'use strict';

  var VOLUME = 0.18;

  // mode: 'ramp'(지수 글라이드) | 'flat'(고정) | 'steps'(stepTime 간격 계단)
  var DEFS = {
    launch:  { type: 'triangle', freqs: [220, 480],      dur: 0.12, mode: 'ramp' },
    hit:     { type: 'square',   freqs: [160],           dur: 0.06, mode: 'flat' },
    'break': { type: 'sawtooth', freqs: [320, 90],       dur: 0.18, mode: 'ramp' },
    win:     { type: 'sine',     freqs: [523, 659, 784], dur: 0.35, mode: 'steps', stepTime: 0.1 },
    lose:    { type: 'sine',     freqs: [330, 220],      dur: 0.4,  mode: 'ramp' }
  };

  var ctx = null;
  var disabled = false;

  function getContext() {
    if (disabled) return null;
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        disabled = true;
        return null;
      }
      try {
        ctx = new AC();
      } catch (e) {
        ctx = null;
        disabled = true;
        return null;
      }
    }
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      try {
        var p = ctx.resume();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      } catch (e2) { /* 무시 */ }
    }
    return ctx;
  }

  // 최초 사용자 입력에서 컨텍스트를 만든다 (자동재생 정책 회피)
  function unlock() {
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
    try { getContext(); } catch (e) { disabled = true; }
  }
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);

  function play(name) {
    try {
      var def = DEFS[name];
      if (!def) return;
      var ac = getContext();
      if (!ac) return;

      var t0 = ac.currentTime;
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.type = def.type;
      osc.frequency.setValueAtTime(def.freqs[0], t0);
      if (def.mode === 'ramp') {
        osc.frequency.exponentialRampToValueAtTime(def.freqs[1], t0 + def.dur);
      } else if (def.mode === 'steps') {
        for (var i = 1; i < def.freqs.length; i++) {
          osc.frequency.setValueAtTime(def.freqs[i], t0 + i * def.stepTime);
        }
      }
      gain.gain.setValueAtTime(VOLUME, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + def.dur);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + def.dur + 0.02);
    } catch (e) {
      /* 소리 실패는 게임을 멈추지 않는다 */
    }
  }

  window.SFX = { play: play };
})();
