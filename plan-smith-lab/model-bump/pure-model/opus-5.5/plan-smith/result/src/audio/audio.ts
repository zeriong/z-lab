// 효과음 7종 합성 (§4.13). AudioContext는 첫 pointerdown/keydown 때 만든다.
// AudioContext가 없는 환경(node 등)에서는 아무것도 하지 않는다.
import type { SoundId } from '../types';

type Ctx = AudioContext;

function getAudioContextCtor(): (new () => Ctx) | null {
  const g = globalThis as unknown as {
    AudioContext?: new () => Ctx;
    webkitAudioContext?: new () => Ctx;
  };
  return g.AudioContext ?? g.webkitAudioContext ?? null;
}

export interface AudioLike {
  play(id: SoundId, intensity?: number): void;
  setMuted(muted: boolean): void;
  readonly muted: boolean;
}

export class AudioEngine implements AudioLike {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private _muted: boolean;
  private failed = false;

  constructor(muted = false) {
    this._muted = muted;
  }

  get muted(): boolean {
    return this._muted;
  }

  /** 첫 사용자 제스처에서 호출 (자동재생 정책) */
  unlock(): void {
    if (this.failed) return;
    try {
      if (!this.ctx) {
        const Ctor = getAudioContextCtor();
        if (!Ctor) {
          this.failed = true;
          return;
        }
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this._muted ? 0 : 0.6;
        this.master.connect(this.ctx.destination);
        this.noiseBuf = this.makeNoise(this.ctx);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
    } catch {
      this.failed = true;
      this.ctx = null;
    }
  }

  /** 음소거는 즉시 적용 */
  setMuted(muted: boolean): void {
    this._muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setValueAtTime(muted ? 0 : 0.6, this.ctx.currentTime);
    }
  }

  private makeNoise(ctx: Ctx): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * 0.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let seed = 12345;
    for (let i = 0; i < len; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      data[i] = (seed / 0x7fffffff) * 2 - 1;
    }
    return buf;
  }

  private noise(t0: number, dur: number, type: BiquadFilterType, freq: number, q: number, gain: number, sweepTo?: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filt = ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.setValueAtTime(freq, t0);
    if (sweepTo !== undefined) filt.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
    filt.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt).connect(g).connect(this.master!);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  private tone(t0: number, dur: number, type: OscillatorType, f0: number, f1: number, gain: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master!);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  play(id: SoundId, intensity = 1): void {
    if (this._muted || !this.ctx || !this.master || !this.noiseBuf) return;
    try {
      const t = this.ctx.currentTime + 0.005;
      const k = Math.max(0.1, Math.min(1, intensity));
      switch (id) {
        case 'launch': // 노이즈 휙
          this.noise(t, 0.28, 'bandpass', 600, 1.2, 0.5, 2400);
          break;
        case 'impact': // 둔탁한 소리, 음량 ∝ impact
          this.tone(t, 0.12, 'sine', 140, 60, 0.5 * k);
          this.noise(t, 0.08, 'lowpass', 500, 0.7, 0.3 * k);
          break;
        case 'break-glass':
          this.noise(t, 0.35, 'highpass', 3500, 2, 0.45);
          this.tone(t, 0.2, 'triangle', 2400, 1800, 0.12);
          break;
        case 'break-wood':
          this.noise(t, 0.25, 'bandpass', 900, 3, 0.55);
          break;
        case 'break-stone':
          this.noise(t, 0.4, 'lowpass', 350, 1, 0.7);
          break;
        case 'pig': // 뿅
          this.tone(t, 0.18, 'square', 300, 900, 0.18);
          break;
        case 'clear': // 상승 아르페지오
          [523, 659, 784, 1047].forEach((f, i) => this.tone(t + i * 0.12, 0.25, 'triangle', f, f, 0.3));
          break;
        case 'fail': // 하강음
          this.tone(t, 0.7, 'sawtooth', 440, 110, 0.18);
          break;
      }
    } catch {
      /* 오디오 오류로 게임이 멈추면 안 된다 */
    }
  }
}

/** 테스트·헤드리스용 무음 구현 */
export class SilentAudio implements AudioLike {
  muted = false;
  readonly played: SoundId[] = [];
  play(id: SoundId): void {
    if (!this.muted) this.played.push(id);
  }
  setMuted(muted: boolean): void {
    this.muted = muted;
  }
}
