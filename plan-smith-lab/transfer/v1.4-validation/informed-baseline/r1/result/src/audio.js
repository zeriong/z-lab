// Audio synthesis (§16)
const SFX = (() => {
  let ac = null;
  let enabled = false;

  function init() {
    if (ac) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      ac = new AudioContext();
      enabled = true;
    } catch (e) {
      enabled = false;
    }
  }

  function play(name) {
    try {
      if (!enabled) return;
      if (!ac) init();
      if (!ac) return;

      const now = ac.currentTime;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);

      switch (name) {
        case 'launch':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.linearRampToValueAtTime(480, now + 0.12);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
          osc.start(now);
          osc.stop(now + 0.12);
          break;

        case 'hit':
          osc.type = 'square';
          osc.frequency.setValueAtTime(160, now);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
          osc.start(now);
          osc.stop(now + 0.06);
          break;

        case 'break':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.linearRampToValueAtTime(90, now + 0.18);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
          osc.start(now);
          osc.stop(now + 0.18);
          break;

        case 'win':
          osc.type = 'sine';
          const notes = [523, 659, 784];
          osc.frequency.setValueAtTime(notes[0], now);
          osc.frequency.setValueAtTime(notes[1], now + 0.1);
          osc.frequency.setValueAtTime(notes[2], now + 0.2);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.35);
          break;

        case 'lose':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(330, now);
          osc.frequency.linearRampToValueAtTime(220, now + 0.4);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
          osc.start(now);
          osc.stop(now + 0.4);
          break;
      }
    } catch (e) {
      // Silent fail
    }
  }

  return {
    play,
    init
  };
})();
