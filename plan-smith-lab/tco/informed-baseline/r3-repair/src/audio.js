// src/audio.js
// WebAudio 합성 사운드 (§16)
// 의존성: 없음

let audioContext = null;

const SFX = {
  _ensureContext() {
    if (audioContext) return audioContext;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      return (audioContext = ctx);
    } catch (e) {
      return null;
    }
  },

  play(name) {
    try {
      const ctx = SFX._ensureContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      if (name === 'launch') {
        // triangle 220→480 상승 0.12초
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(480, now + 0.12);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.start(now);
        osc.stop(now + 0.12);
      } else if (name === 'hit') {
        // square 160 0.06초
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(160, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.start(now);
        osc.stop(now + 0.06);
      } else if (name === 'break') {
        // sawtooth 320→90 하강 0.18초
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.linearRampToValueAtTime(90, now + 0.18);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.start(now);
        osc.stop(now + 0.18);
      } else if (name === 'win') {
        // sine 523→659→784 (0.1초 간격) 0.35초
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(659, now + 0.1);
        osc.frequency.setValueAtTime(784, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.start(now);
        osc.stop(now + 0.35);
      } else if (name === 'lose') {
        // sine 330→220 하강 0.4초
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.linearRampToValueAtTime(220, now + 0.4);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch (e) {
      // 무음 처리
    }
  }
};

// 첫 사용자 입력 시 AudioContext 생성(자동재생 정책 회피)
document.addEventListener('pointerdown', () => {
  SFX._ensureContext();
}, { once: true });
