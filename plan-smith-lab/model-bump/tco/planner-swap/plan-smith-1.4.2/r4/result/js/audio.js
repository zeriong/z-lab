const AUDIO = { ctx: null, master: null, muted: false, last: {} };

function soundInit() {
  try {
    if (!AUDIO.ctx) {
      AUDIO.ctx = new (window.AudioContext || window.webkitAudioContext)();
      AUDIO.master = AUDIO.ctx.createGain();
      AUDIO.master.gain.value = 0.3;
      AUDIO.master.connect(AUDIO.ctx.destination);
    }
    if (AUDIO.ctx.state === 'suspended') {
      AUDIO.ctx.resume();
    }
  } catch (e) {}
}

function setMuted(muted) {
  AUDIO.muted = muted;
}

function _tone(type, f0, f1, dur, gain, delay) {
  if (!AUDIO.ctx) return;
  try {
    const t = AUDIO.ctx.currentTime + (delay || 0);
    const osc = AUDIO.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + dur);

    const g = AUDIO.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(g);
    g.connect(AUDIO.master);
    osc.start(t);
    osc.stop(t + dur);
  } catch (e) {}
}

function _noise(dur, gain, highpassHz, delay) {
  if (!AUDIO.ctx) return;
  try {
    const t = AUDIO.ctx.currentTime + (delay || 0);
    const bufLen = AUDIO.ctx.sampleRate * dur;
    const buf = AUDIO.ctx.createBuffer(1, bufLen, AUDIO.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = AUDIO.ctx.createBufferSource();
    source.buffer = buf;

    const filter = AUDIO.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = highpassHz;

    const g = AUDIO.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    source.connect(filter);
    filter.connect(g);
    g.connect(AUDIO.master);
    source.start(t);
    source.stop(t + dur);
  } catch (e) {}
}

function playSound(name) {
  if (AUDIO.muted || !AUDIO.ctx) return;

  const now = performance.now();
  if (AUDIO.last[name] && now - AUDIO.last[name] < 60) return;
  AUDIO.last[name] = now;

  try {
    switch (name) {
      case 'click':
        _tone('square', 660, 660, 0.05, 0.15);
        break;
      case 'stretch':
        _tone('sawtooth', 180, 320, 0.18, 0.08);
        break;
      case 'launch':
        _tone('triangle', 300, 900, 0.25, 0.25);
        break;
      case 'hit':
        _tone('sine', 140, 70, 0.1, 0.3);
        break;
      case 'glass':
        _noise(0.18, 0.3, 3000);
        _tone('triangle', 1800, 1200, 0.1, 0.1);
        break;
      case 'wood':
        _tone('square', 220, 90, 0.14, 0.18);
        break;
      case 'stone':
        _tone('sine', 110, 45, 0.25, 0.4);
        break;
      case 'pig':
        _tone('triangle', 600, 200, 0.22, 0.3);
        break;
      case 'explode':
        _noise(0.6, 0.5, 100);
        _tone('sine', 80, 30, 0.5, 0.5);
        break;
      case 'clear':
        _tone('triangle', 523, 523, 0.18, 0.25, 0);
        _tone('triangle', 659, 659, 0.18, 0.25, 0.12);
        _tone('triangle', 784, 784, 0.18, 0.25, 0.24);
        _tone('triangle', 1047, 1047, 0.18, 0.25, 0.36);
        break;
      case 'fail':
        _tone('sawtooth', 392, 392, 0.25, 0.15, 0);
        _tone('sawtooth', 330, 330, 0.25, 0.15, 0.2);
        _tone('sawtooth', 262, 262, 0.25, 0.15, 0.4);
        break;
    }
  } catch (e) {}
}
