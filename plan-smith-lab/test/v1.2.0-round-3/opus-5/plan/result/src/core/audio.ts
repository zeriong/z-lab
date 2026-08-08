/**
 * §13 사운드. 외부 오디오 에셋 없이 WebAudio 오실레이터/노이즈로 합성한다
 * (§0 non-goal: 상용 에셋 사용 금지, 1단계는 도형/합성음).
 * - AudioContext는 첫 사용자 제스처에서 생성 (자동재생 정책)
 * - 동일 사운드 40ms 내 중복 재생 억제 (충돌 연쇄에서 소리 뭉개짐 방지)
 * - PAUSED → suspend(), RESUME → resume()
 */

export type SfxName =
  | 'pull'
  | 'launch'
  | 'hitWood'
  | 'hitIce'
  | 'hitStone'
  | 'break'
  | 'pig'
  | 'explode'
  | 'clear'
  | 'fail'
  | 'ui';

const DEDUPE_MS = 40;
const MUTE_KEY = 'ab.muted.v1';

interface Voice {
  gain: GainNode;
}

class AudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private lastPlayed = new Map<SfxName, number>();
  private voices: Voice[] = [];
  private muted = false;
  private noiseBuf: AudioBuffer | null = null;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      this.muted = false;
    }
  }

  /** 첫 사용자 제스처에서 호출한다. */
  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.35;
      this.master.connect(this.ctx.destination);
      this.noiseBuf = this.makeNoise(this.ctx);
    } catch {
      this.ctx = null;
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(v: boolean): void {
    this.muted = v;
    if (this.master) this.master.gain.value = v ? 0 : 0.35;
    try {
      localStorage.setItem(MUTE_KEY, v ? '1' : '0');
    } catch {
      /* 저장 실패해도 게임은 계속된다 */
    }
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  stopAll(): void {
    const now = this.ctx?.currentTime ?? 0;
    for (const v of this.voices) {
      try {
        v.gain.gain.cancelScheduledValues(now);
        v.gain.gain.setValueAtTime(0, now);
      } catch {
        /* noop */
      }
    }
    this.voices = [];
    this.lastPlayed.clear();
  }

  play(name: SfxName, intensity = 1): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || this.muted || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const last = this.lastPlayed.get(name) ?? -1;
    if (now - last < DEDUPE_MS / 1000) return;
    this.lastPlayed.set(name, now);

    const amp = Math.max(0.05, Math.min(1, intensity));

    switch (name) {
      case 'pull':
        this.tone(ctx, master, 'sine', 220, 320, 0.12, 0.15 * amp);
        break;
      case 'launch':
        this.tone(ctx, master, 'triangle', 520, 160, 0.18, 0.35 * amp);
        break;
      case 'hitWood':
        this.noise(ctx, master, 0.08, 0.25 * amp, 1200);
        break;
      case 'hitIce':
        this.tone(ctx, master, 'square', 1500, 900, 0.07, 0.16 * amp);
        break;
      case 'hitStone':
        this.noise(ctx, master, 0.1, 0.3 * amp, 500);
        break;
      case 'break':
        this.noise(ctx, master, 0.22, 0.35 * amp, 2200);
        break;
      case 'pig':
        this.tone(ctx, master, 'sawtooth', 380, 140, 0.24, 0.3 * amp);
        break;
      case 'explode':
        this.noise(ctx, master, 0.45, 0.6 * amp, 300);
        break;
      case 'clear':
        this.arpeggio(ctx, master, [523, 659, 784, 1047]);
        break;
      case 'fail':
        this.arpeggio(ctx, master, [392, 330, 262]);
        break;
      case 'ui':
        this.tone(ctx, master, 'sine', 660, 660, 0.06, 0.18);
        break;
    }
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * 0.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let seed = 1337;
    for (let i = 0; i < len; i++) {
      // 결정적 의사난수(디버깅 재현성)
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      data[i] = (seed / 2147483648 - 1) * 0.9;
    }
    return buf;
  }

  private track(gain: GainNode): void {
    this.voices.push({ gain });
    if (this.voices.length > 32) this.voices.shift();
  }

  private tone(
    ctx: AudioContext,
    dest: AudioNode,
    type: OscillatorType,
    f0: number,
    f1: number,
    dur: number,
    peak: number,
  ): void {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const t = ctx.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    this.track(g);
  }

  private noise(
    ctx: AudioContext,
    dest: AudioNode,
    dur: number,
    peak: number,
    cutoff: number,
  ): void {
    if (!this.noiseBuf) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = cutoff;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + dur + 0.02);
    this.track(g);
  }

  private arpeggio(ctx: AudioContext, dest: AudioNode, notes: number[]): void {
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const t = ctx.currentTime + i * 0.11;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.34);
      this.track(g);
    });
  }
}

export const audio = new AudioBus();
