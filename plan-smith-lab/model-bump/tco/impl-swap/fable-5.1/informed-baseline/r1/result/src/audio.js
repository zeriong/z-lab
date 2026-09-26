// audio.js — §16 WebAudio 합성 효과음. 다른 전역을 참조하지 않는다.
// 실패해도 게임이 멈추지 않도록 모든 경로를 try/catch 로 감싼다.
(function () {
  'use strict';

  var ctx = null;
  var disabled = false;

  function getCtx() {
    if (disabled) return null;
    if (ctx) {
      if (ctx.state === 'suspended') {
        try { ctx.resume(); } catch (e) { /* 무시 */ }
      }
      return ctx;
    }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { disabled = true; return null; }
      ctx = new AC();
      return ctx;
    } catch (e) {
      disabled = true;
      return null;
    }
  }

  // 오실레이터 + 게인(지수 감쇠) 1쌍
  // freqs: [[time, freq], ...] 로 주파수 램프를 기술
  function tone(ac, type, freqs, dur, gain) {
    var osc = ac.createOscillator();
    var g = ac.createGain();
    var t0 = ac.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(freqs[0][1], t0 + freqs[0][0]);
    for (var i = 1; i < freqs.length; i++) {
      osc.frequency.linearRampToValueAtTime(freqs[i][1], t0 + freqs[i][0]);
    }
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function play(name) {
    try {
      var ac = getCtx();
      if (!ac) return;
      switch (name) {
        case 'launch':
          tone(ac, 'triangle', [[0, 220], [0.12, 480]], 0.12, 0.25);
          break;
        case 'hit':
          tone(ac, 'square', [[0, 160]], 0.06, 0.12);
          break;
        case 'break':
          tone(ac, 'sawtooth', [[0, 320], [0.18, 90]], 0.18, 0.2);
          break;
        case 'win':
          tone(ac, 'sine', [[0, 523], [0.1, 523], [0.1, 659], [0.2, 659], [0.2, 784], [0.35, 784]], 0.35, 0.25);
          break;
        case 'lose':
          tone(ac, 'sine', [[0, 330], [0.4, 220]], 0.4, 0.25);
          break;
        default:
          break;
      }
    } catch (e) {
      // 오디오 실패는 무시
    }
  }

  window.SFX = { play: play };
})();
