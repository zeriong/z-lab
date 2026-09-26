// audio.js — §16 WebAudio 합성 효과음. 실패해도 게임을 멈추지 않는다.
(function () {
  'use strict';

  var ctx = null;
  var disabled = false;

  function getCtx() {
    if (disabled) return null;
    if (ctx) {
      if (ctx.state === 'suspended' && ctx.resume) {
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

  // 단일 톤: type 파형, f0 → f1 주파수, dur 초, 지수 감쇠
  function tone(ac, type, f0, f1, dur, startAt, vol) {
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    var t0 = ac.currentTime + (startAt || 0);
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) {
      osc.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    }
    gain.gain.setValueAtTime(vol || 0.18, t0);
    gain.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function play(name) {
    try {
      var ac = getCtx();
      if (!ac) return;
      switch (name) {
        case 'launch':
          tone(ac, 'triangle', 220, 480, 0.12, 0, 0.2);
          break;
        case 'hit':
          tone(ac, 'square', 160, 160, 0.06, 0, 0.12);
          break;
        case 'break':
          tone(ac, 'sawtooth', 320, 90, 0.18, 0, 0.16);
          break;
        case 'win':
          tone(ac, 'sine', 523, 523, 0.15, 0.0, 0.2);
          tone(ac, 'sine', 659, 659, 0.15, 0.1, 0.2);
          tone(ac, 'sine', 784, 784, 0.35, 0.2, 0.2);
          break;
        case 'lose':
          tone(ac, 'sine', 330, 220, 0.4, 0, 0.2);
          break;
        default:
          break;
      }
    } catch (e) {
      // 무음 처리
    }
  }

  window.SFX = { play: play };
})();
