/*
 * audio.js — WebAudio 합성 효과음 (§16)
 * 노출: window.SFX = { play(name) }   name: 'launch' | 'hit' | 'break' | 'win' | 'lose'
 * 참조 전역: 없음
 *
 * - AudioContext 는 최초 사용자 입력(pointerdown / keydown) 때 lazily 생성한다(자동재생 정책 회피).
 * - 생성에 실패하거나 지원하지 않으면 play 는 아무것도 하지 않는다.
 * - 소리 1개 = OscillatorNode + GainNode(지수 감쇠) 1쌍.
 * - 오디오 오류가 게임을 멈추지 않도록 play 내부 전체를 try/catch 로 감싼다.
 */
(function () {
  'use strict';

  var ac = null;          // AudioContext
  var disabled = false;   // 생성 실패/미지원이면 true -> 무음

  var DEFS = {
    launch:  { type: 'triangle', freqs: [220, 480],      mode: 'ramp',  dur: 0.12, vol: 0.18 },
    hit:     { type: 'square',   freqs: [160],           mode: 'flat',  dur: 0.06, vol: 0.06 },
    'break': { type: 'sawtooth', freqs: [320, 90],       mode: 'ramp',  dur: 0.18, vol: 0.08 },
    win:     { type: 'sine',     freqs: [523, 659, 784], mode: 'steps', dur: 0.35, vol: 0.22, gap: 0.1 },
    lose:    { type: 'sine',     freqs: [330, 220],      mode: 'ramp',  dur: 0.4,  vol: 0.22 }
  };

  function createContext() {
    if (ac || disabled) return ac;
    try {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) {
        disabled = true;
        return null;
      }
      ac = new Ctor();
    } catch (e) {
      disabled = true;
      ac = null;
    }
    return ac;
  }

  function onUserInput() {
    try {
      var c = createContext();
      if (c && c.state === 'suspended' && typeof c.resume === 'function') {
        var pr = c.resume();
        if (pr && typeof pr.catch === 'function') pr.catch(function () {});
      }
      if (disabled || (c && c.state === 'running')) {
        window.removeEventListener('pointerdown', onUserInput, true);
        window.removeEventListener('keydown', onUserInput, true);
      }
    } catch (e) {
      disabled = true;
    }
  }

  window.addEventListener('pointerdown', onUserInput, true);
  window.addEventListener('keydown', onUserInput, true);

  function play(name) {
    try {
      if (disabled || !ac || ac.state !== 'running') return;
      var d = DEFS[name];
      if (!d) return;

      var t0 = ac.currentTime;
      var osc = ac.createOscillator();
      var gain = ac.createGain();

      osc.type = d.type;
      osc.frequency.setValueAtTime(d.freqs[0], t0);
      if (d.mode === 'ramp') {
        osc.frequency.exponentialRampToValueAtTime(d.freqs[1], t0 + d.dur);
      } else if (d.mode === 'steps') {
        for (var i = 1; i < d.freqs.length; i++) {
          osc.frequency.setValueAtTime(d.freqs[i], t0 + d.gap * i);
        }
      }

      gain.gain.setValueAtTime(d.vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + d.dur);

      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + d.dur + 0.02);
    } catch (e) {
      /* 오디오 실패는 무시(무음) */
    }
  }

  window.SFX = { play: play };
})();
