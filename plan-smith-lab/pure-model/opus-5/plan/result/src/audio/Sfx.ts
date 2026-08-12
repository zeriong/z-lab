export type SfxName =
  | 'launch'
  | 'thud'
  | 'break'
  | 'pig'
  | 'explode'
  | 'boost'
  | 'clear'
  | 'fail'
  | 'click';

interface Tone {
  freq: number;
  toFreq?: number;
  duration: number;
  type: OscillatorType;
  gain: number;
  delay?: number;
}

const PATCHES: Record<SfxName, Tone[]> = {
  launch: [{ freq: 220, toFreq: 660, duration: 0.14, type: 'triangle', gain: 0.18 }],
  thud: [{ freq: 150, toFreq: 70, duration: 0.09, type: 'sine', gain: 0.16 }],
  break: [
    { freq: 900, toFreq: 240, duration: 0.13, type: 'square', gain: 0.1 },
    { freq: 1400, toFreq: 500, duration: 0.09, type: 'triangle', gain: 0.07, delay: 0.02 },
  ],
  pig: [
    { freq: 520, toFreq: 180, duration: 0.16, type: 'sawtooth', gain: 0.14 },
    { freq: 260, toFreq: 90, duration: 0.2, type: 'sine', gain: 0.12, delay: 0.05 },
  ],
  explode: [
    { freq: 120, toFreq: 40, duration: 0.34, type: 'sawtooth', gain: 0.22 },
    { freq: 400, toFreq: 60, duration: 0.24, type: 'square', gain: 0.12 },
  ],
  boost: [{ freq: 300, toFreq: 1200, duration: 0.12, type: 'sawtooth', gain: 0.12 }],
  clear: [
    { freq: 523, duration: 0.12, type: 'triangle', gain: 0.16 },
    { freq: 659, duration: 0.12, type: 'triangle', gain: 0.16, delay: 0.11 },
    { freq: 784, duration: 0.22, type: 'triangle', gain: 0.18, delay: 0.22 },
  ],
  fail: [
    { freq: 330, duration: 0.16, type: 'triangle', gain: 0.14 },
    { freq: 247, duration: 0.28, type: 'triangle', gain: 0.14, delay: 0.15 },
  ],
  click: [{ freq: 660, toFreq: 880, duration: 0.05, type: 'square', gain: 0.08 }],
};

/**
 * Tiny WebAudio blip synth (plan §1.4 / M8 optional item). No asset files, no
 * loading state, and the context is created lazily on the first gesture
 * because browsers refuse to start it before one.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private failed = false;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.master) this.master.gain.value = enabled ? 0.9 : 0;
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /** Call from a user gesture handler. */
  unlock(): void {
    if (this.failed || this.ctx) return;
    try {
      const Ctor: typeof AudioContext =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.9 : 0;
      this.master.connect(this.ctx.destination);
    } catch {
      this.failed = true;
    }
    void this.ctx?.resume();
  }

  play(name: SfxName): void {
    if (!this.enabled || this.failed) return;
    if (!this.ctx) this.unlock();
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    if (ctx.state === 'suspended') void ctx.resume();

    const now = ctx.currentTime;
    for (const tone of PATCHES[name]) {
      const start = now + (tone.delay ?? 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tone.type;
      osc.frequency.setValueAtTime(tone.freq, start);
      if (tone.toFreq !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, tone.toFreq), start + tone.duration);
      }
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(tone.gain, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + tone.duration + 0.03);
    }
  }
}
