/**
 * 사운드 (플랜 P5). 자산 파일 없이 WebAudio 합성 블립만 쓴다 (R5: 자산 없음).
 * 오디오 컨텍스트는 첫 사용자 제스처에서 만든다(모바일 정책).
 */
type SfxName = 'launch' | 'hit' | 'break' | 'pig' | 'clear' | 'fail' | 'ui';

const RECIPE: Record<SfxName, { freq: number; to: number; dur: number; type: OscillatorType; gain: number }> = {
  launch: { freq: 220, to: 660, dur: 0.14, type: 'triangle', gain: 0.22 },
  hit: { freq: 180, to: 120, dur: 0.06, type: 'square', gain: 0.12 },
  break: { freq: 520, to: 90, dur: 0.18, type: 'sawtooth', gain: 0.18 },
  pig: { freq: 700, to: 180, dur: 0.22, type: 'square', gain: 0.2 },
  clear: { freq: 440, to: 880, dur: 0.35, type: 'triangle', gain: 0.24 },
  fail: { freq: 300, to: 90, dur: 0.4, type: 'sine', gain: 0.22 },
  ui: { freq: 660, to: 660, dur: 0.05, type: 'sine', gain: 0.12 },
};

export class Sfx {
  muted = false;
  private ctx: AudioContext | null = null;
  private lastAt: Partial<Record<SfxName, number>> = {};

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
    } catch {
      this.ctx = null;
    }
  }

  play(name: SfxName, throttleMs = 30): void {
    if (this.muted) return;
    const ctx = this.ctx;
    if (!ctx) return;
    const now = performance.now();
    if (this.lastAt[name] !== undefined && now - (this.lastAt[name] as number) < throttleMs) return;
    this.lastAt[name] = now;

    const r = RECIPE[name];
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = r.type;
    osc.frequency.setValueAtTime(r.freq, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, r.to), t0 + r.dur);
    gain.gain.setValueAtTime(r.gain, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + r.dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + r.dur + 0.02);
  }
}
