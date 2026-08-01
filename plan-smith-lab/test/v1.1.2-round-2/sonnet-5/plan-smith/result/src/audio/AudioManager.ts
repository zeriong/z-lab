/**
 * Plan §딜리버리 스택 names "HTMLAudioElement 풀(4~5개 SFX)" loading small mp3
 * asset files. This pure-inference, no-build environment has no way to
 * author or fetch real binary audio assets (Write only emits text content),
 * so the same 4 required events (발사/충돌/파괴/클리어 — plan §매트릭스 #13)
 * are instead produced with the Web Audio API (oscillator-based synthesized
 * tones). This is a substitution for an already-decided stack line, not an
 * undecided choice the plan left open — flagged here and in the task return.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;
    this.ctx = new AudioCtor();
    return this.ctx;
  }

  /** Must be invoked from a user-gesture handler (first pointerdown) to
   *  satisfy browser autoplay policies before any SFX can play. */
  unlock() {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
  }

  private tone(freq: number, durationSec: number, type: OscillatorType, gainPeak = 0.2) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(gainPeak, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationSec);
  }

  /** SFX #1: 발사 (launch) */
  playLaunch() {
    this.tone(220, 0.15, 'sawtooth', 0.15);
    this.tone(440, 0.1, 'sawtooth', 0.05);
  }

  /** SFX #2: 충돌 (generic impact, non-destructive) */
  playCollision() {
    this.tone(90, 0.12, 'square', 0.18);
  }

  /** SFX #3: 파괴 (block destroyed / pig removed) */
  playDestroy() {
    this.tone(60, 0.25, 'square', 0.22);
  }

  /** SFX #4: 클리어 (stage cleared) */
  playClear() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    [523, 659, 784].forEach((freq, i) => {
      setTimeout(() => this.tone(freq, 0.2, 'triangle', 0.15), i * 120);
    });
  }
}
