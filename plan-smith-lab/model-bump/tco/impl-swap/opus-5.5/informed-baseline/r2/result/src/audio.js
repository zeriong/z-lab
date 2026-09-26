/*
 * audio.js — WebAudio 합성 효과음 (§16)
 * 노출: window.SFX = { play(name) }   name: 'launch' | 'hit' | 'break' | 'win' | 'lose'
 * 참조: 없음
 *
 * AudioContext 는 최초 사용자 입력 시점에 lazily 생성한다(자동재생 정책 회피).
 * 생성 실패/미지원이면 play 는 아무것도 하지 않는다. 어떤 경우에도 예외를 밖으로 던지지 않는다.
 */
(function () {
  'use strict';

  var ctx = null;
  var disabled = false;
  var VOLUME = 0.22;

  var DEFS = {
    'launch': { type: 'triangle', freqs: [220, 480],      mode: 'ramp',  dur: 0.12 },
    'hit':    { type: 'square',   freqs: [160],           mode: 'flat',  dur: 0.06 },
    'break':  { type: 'sawtooth', freqs: [320, 90],       mode: 'ramp',  dur: 0.18 },
    'win':    { type: 'sine',     freqs: [523, 659, 784], mode: 'steps', dur: 0.35, gap: 0.1 },
    'lose':   { type: 'sine',     freqs: [330, 220],      mode: 'ramp',  dur: 0.4 }
  };

  var UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'];

  function ensureContext() {
    if (ctx || disabled) return ctx;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        disabled = true;
        return null;
      }
      ctx = new AC();
    } catch (e) {
      ctx = null;
      disabled = true;
    }
    return ctx;
  }

  function removeUnlockListeners() {
    for (var i = 0; i < UNLOCK_EVENTS.length; i++) {
      window.removeEventListener(UNLOCK_EVENTS[i], onUserInput, true);
    }
  }

  function onUserInput() {
    try {
      var c = ensureContext();
      if (!c) {
        removeUnlockListeners();
        return;
      }
      if (c.state === 'suspended' && typeof c.resume === 'function') {
        var pr = c.resume();
        if (pr && typeof pr.then === 'function') {
          pr.then(function () {
            if (c.state === 'running') removeUnlockListeners();
          }, function () { /* 다음 입력에서 재시도 */ });
        }
      } else if (c.state === 'running') {
        removeUnlockListeners();
      }
    } catch (e) {
      /* 무음 */
    }
  }

  for (var i = 0; i < UNLOCK_EVENTS.length; i++) {
    window.addEventListener(UNLOCK_EVENTS[i], onUserInput, true);
  }

  function play(name) {
    try {
      if (disabled || !ctx) return;
      var d = DEFS[name];
      if (!d) return;
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        var pr = ctx.resume();
        if (pr && typeof pr.then === 'function') pr.then(null, function () {});
      }

      var t0 = ctx.currentTime + 0.005;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = d.type;

      var f = osc.frequency;
      f.setValueAtTime(d.freqs[0], t0);
      if (d.mode === 'ramp') {
        f.exponentialRampToValueAtTime(d.freqs[1], t0 + d.dur);
      } else if (d.mode === 'steps') {
        for (var k = 1; k < d.freqs.length; k++) {
          f.setValueAtTime(d.freqs[k], t0 + k * d.gap);
        }
      }

      // 지수 감쇠 엔벨로프
      gain.gain.setValueAtTime(VOLUME, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + d.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.onended = function () {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch (e) { /* 무시 */ }
      };
      osc.start(t0);
      osc.stop(t0 + d.dur + 0.02);
    } catch (e) {
      /* 소리 실패는 게임을 멈추지 않는다 */
    }
  }

  window.SFX = { play: play };
})();
