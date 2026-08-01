// 효과음 4종: 발사·충돌·돼지 제거·클리어 (플랜 S5 / I-2)
// 에셋 없이 WebAudio 합성 (가정 A4 축소 경로). 첫 사용자 제스처에서 AudioContext resume.

let ctx: AudioContext | null = null;

/** 첫 포인터 제스처에서 호출 — 브라우저 자동재생 정책 대응 (플랜 S5). */
export function unlock(): void {
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return;
    }
  }
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
}

function tone(freqStart: number, freqEnd: number, durSec: number, type: OscillatorType, volume: number): void {
  if (!ctx || ctx.state !== 'running') return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + durSec);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + durSec);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + durSec + 0.02);
}

let lastHitAt = 0;

export function playLaunch(): void {
  tone(320, 110, 0.25, 'triangle', 0.25);
}

/** 충돌음 — 다중 충돌 시 60ms 스로틀 */
export function playHit(): void {
  const now = performance.now();
  if (now - lastHitAt < 60) return;
  lastHitAt = now;
  tone(150, 55, 0.09, 'square', 0.15);
}

export function playPigPop(): void {
  tone(480, 950, 0.15, 'sine', 0.3);
}

export function playClear(): void {
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((f, i) => {
    setTimeout(() => tone(f, f, 0.2, 'sine', 0.22), i * 140);
  });
}
