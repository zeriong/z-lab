/* audio.js — §16 WebAudio 합성 효과음. 다른 전역을 참조하지 않는다.
 * SFX.play('launch' | 'hit' | 'break' | 'win' | 'lose')
 * AudioContext 는 최초 호출 시 lazily 생성. 생성 실패 시 이후 호출은 무동작.
 */
var SFX = (function () {
  'use strict';

  var ctx = null;
  var failed = false;

  function getCtx() {
    if (failed) return null;
    if (ctx) return ctx;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { failed = true; return null; }
      ctx = new AC();
    } catch (e) {
      failed = true;
      return null;
    }
    return ctx;
  }

  /* OscillatorNode + GainNode(지수 감쇠) 1쌍 */
  function tone(ac, type, f0, f1, dur, t0, vol) {
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function play(name) {
    try {
      var ac = getCtx();
      if (!ac) return;
      if (ac.state === 'suspended' && typeof ac.resume === 'function') ac.resume();
      var t = ac.currentTime;
      switch (name) {
        case 'launch':
          tone(ac, 'triangle', 220, 480, 0.12, t, 0.25);
          break;
        case 'hit':
          tone(ac, 'square', 160, 160, 0.06, t, 0.12);
          break;
        case 'break':
          tone(ac, 'sawtooth', 320, 90, 0.18, t, 0.2);
          break;
        case 'win':
          tone(ac, 'sine', 523, 523, 0.15, t, 0.25);
          tone(ac, 'sine', 659, 659, 0.15, t + 0.1, 0.25);
          tone(ac, 'sine', 784, 784, 0.15, t + 0.2, 0.25);
          break;
        case 'lose':
          tone(ac, 'sine', 330, 220, 0.4, t, 0.25);
          break;
        default:
          break;
      }
    } catch (e) {
      /* 무음 처리 — 게임을 멈추지 않는다 */
    }
  }

  return { play: play };
})();
