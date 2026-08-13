// Audio synthesis (WebAudio)
const SFX = (() => {
  let audioContext = null;
  let enabled = false;

  const initAudio = () => {
    if (audioContext) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioContext = new AC();
      enabled = true;
    } catch (e) {
      enabled = false;
    }
  };

  const play = (name) => {
    if (!enabled && !audioContext) initAudio();
    if (!audioContext) return;

    try {
      const ctx = audioContext;
      const now = ctx.currentTime;

      switch (name) {
        case 'launch': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.linearRampToValueAtTime(480, now + 0.12);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.12);
          break;
        }
        case 'hit': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(160, now);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.06);
          break;
        }
        case 'break': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.linearRampToValueAtTime(90, now + 0.18);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.18);
          break;
        }
        case 'win': {
          const freqs = [523, 659, 784];
          const duration = 0.1;
          for (let i = 0; i < freqs.length; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freqs[i], now + i * duration);
            gain.gain.setValueAtTime(0.1, now + i * duration);
            gain.gain.exponentialRampToValueAtTime(0.01, now + (i + 1) * duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * duration);
            osc.stop(now + (i + 1) * duration);
          }
          break;
        }
        case 'lose': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(330, now);
          osc.frequency.linearRampToValueAtTime(220, now + 0.4);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.4);
          break;
        }
      }
    } catch (e) {
      // Silent fail
    }
  };

  return {
    play,
    initAudio
  };
})();
